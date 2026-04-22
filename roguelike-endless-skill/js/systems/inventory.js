function createEmptyInventorySlots(capacity = STASH_CAPACITY) {
  return Array.from({ length: capacity }, () => null);
}

function restoreInventoryItems(savedIds, capacity = STASH_CAPACITY) {
  const slots = createEmptyInventorySlots(capacity);
  if (!Array.isArray(savedIds)) {
    return slots;
  }

  savedIds.slice(0, capacity).forEach((itemId, index) => {
    if (getInventoryItemById(itemId)) {
      slots[index] = itemId;
    }
  });

  return slots;
}

function restoreSlotIds(savedIds, capacity = UTILITY_SLOT_CAPACITY, isValid = () => true) {
  const slots = Array.from({ length: capacity }, () => null);
  if (!Array.isArray(savedIds)) {
    return slots;
  }

  savedIds.slice(0, capacity).forEach((slotValue, index) => {
    if (isValid(slotValue)) {
      slots[index] = slotValue;
    }
  });

  return slots;
}

function normalizePlayInventoryState(game = state.game) {
  if (!game?.inventory) {
    return;
  }

  game.inventory.items = restoreInventoryItems(game.inventory.items, STASH_CAPACITY);
  game.inventory.weaponSlots = restoreSlotIds(
    game.inventory.weaponSlots,
    WEAPON_SLOT_CAPACITY,
    (weaponId) => Boolean(getWeaponById(weaponId)),
  );
  game.inventory.utilitySlots = restoreSlotIds(
    game.inventory.utilitySlots,
    UTILITY_SLOT_CAPACITY,
    (itemId) => Boolean(getInventoryItemById(itemId)),
  );

  if (!Array.isArray(game.containers)) {
    game.containers = [];
  }

  game.containers = game.containers.map((container, index) => ({
    ...container,
    id: container?.id || `container-${index + 1}`,
    label: container?.label || `กล่อง ${index + 1}`,
    variant: container?.variant || (index === 1 ? "jade" : "bronze"),
    items: restoreInventoryItems(container?.items, CONTAINER_CAPACITY),
    looted: Boolean(container?.looted),
  }));

  refreshAllContainers(game);
}

function defaultLootWeaponIds() {
  return weaponCatalog.map((weapon) => weapon.id);
}

function defaultArtifactIds() {
  return artifactCatalog.map((artifact) => artifact.id);
}

function refreshContainerState(container) {
  if (!container) {
    return;
  }
  container.looted = !(container.items || []).some(Boolean);
}

function refreshAllContainers(game = state.game) {
  if (!game?.containers) {
    return;
  }
  game.containers.forEach((container) => refreshContainerState(container));
}

function getActiveContainer(game = state.game) {
  if (!game?.containers?.length) {
    return null;
  }

  const activeId = state.hud.activeContainerId;
  if (!activeId) {
    return null;
  }

  return game.containers.find((container) => container.id === activeId) || null;
}

function visibleContainerSlotCount(container, columns = 6, minRows = 6, maxRows = 20) {
  if (!container?.items?.length) {
    return columns * minRows;
  }

  let lastFilledIndex = -1;
  container.items.forEach((itemId, index) => {
    if (itemId) {
      lastFilledIndex = index;
    }
  });

  const usedSlots = Math.max(lastFilledIndex + 2, columns * minRows);
  const visibleRows = clamp(Math.ceil(usedSlots / columns), minRows, maxRows);
  return visibleRows * columns;
}

function refreshEquippedWeapon(game = state.game) {
  if (!game?.player || !game?.inventory) {
    return;
  }

  game.player.equippedWeaponId =
    game.inventory.weaponSlots[game.inventory.activeWeaponSlotIndex]
    || game.inventory.weaponSlots.find(Boolean)
    || null;

  if (typeof rebuildPlayerDerivedStats === "function") {
    rebuildPlayerDerivedStats(game.player, {
      chapter: game.chapter ?? state.game?.chapter ?? 1,
      health: game.player.health,
      mana: game.player.mana,
      game,
    });
  }
}

function getSlotCollection(kind, game = state.game) {
  if (!game?.inventory) {
    return null;
  }

  if (kind === "stash") return game.inventory.items;
  if (kind === "weapon") return game.inventory.weaponSlots;
  if (kind === "utility") return game.inventory.utilitySlots;
  if (kind === "container") return getActiveContainer(game)?.items || null;
  return null;
}

function getSlotValue(kind, index, game = state.game) {
  const collection = getSlotCollection(kind, game);
  return collection?.[index] ?? null;
}

function setSlotValue(kind, index, value, game = state.game) {
  const collection = getSlotCollection(kind, game);
  if (!collection || index < 0 || index >= collection.length) {
    return;
  }
  collection[index] = value ?? null;
}

function canPlaceItemInSlot(itemId, destinationKind) {
  if (!itemId) {
    return true;
  }

  if (destinationKind === "stash") {
    return Boolean(getInventoryItemById(itemId));
  }

  if (destinationKind === "weapon") {
    return isWeaponItemId(itemId);
  }

  if (destinationKind === "utility") {
    return Boolean(getInventoryItemById(itemId));
  }

  if (destinationKind === "container") {
    return Boolean(getInventoryItemById(itemId));
  }

  return false;
}

function moveItemBetweenSlots(sourceKind, sourceIndex, destinationKind, destinationIndex) {
  if (!state.game) {
    return;
  }

  const sourceItems = getSlotCollection(sourceKind);
  const destinationItems = getSlotCollection(destinationKind);
  if (!sourceItems || !destinationItems) {
    return;
  }

  const sourceValue = sourceItems[sourceIndex] ?? null;
  const destinationValue = destinationItems[destinationIndex] ?? null;
  if (!sourceValue && !destinationValue) {
    return;
  }

  if (!canPlaceItemInSlot(sourceValue, destinationKind) || !canPlaceItemInSlot(destinationValue, sourceKind)) {
    return;
  }

  sourceItems[sourceIndex] = destinationValue;
  destinationItems[destinationIndex] = sourceValue;

  if (destinationKind === "weapon") {
    state.game.inventory.activeWeaponSlotIndex = clamp(destinationIndex, 0, 1);
    state.game.inventory.activeLoadoutTarget = "weapon";
  } else if (destinationKind === "utility") {
    state.game.inventory.activeUtilitySlotIndex = clamp(destinationIndex, 0, UTILITY_SLOT_CAPACITY - 1);
    state.game.inventory.activeLoadoutTarget = "utility";
  }

  if (sourceKind === "stash" && state.game.inventory.selectedIndex === sourceIndex) {
    state.game.inventory.selectedIndex = destinationKind === "stash"
      ? destinationIndex
      : clamp(sourceIndex, 0, state.game.inventory.items.length - 1);
  } else if (destinationKind === "stash") {
    state.game.inventory.selectedIndex = destinationIndex;
  }

  refreshEquippedWeapon();
  refreshAllContainers();
}

function findFirstEmptyCompatibleSlot(kind, itemId, game = state.game) {
  const collection = getSlotCollection(kind, game);
  if (!collection || !canPlaceItemInSlot(itemId, kind)) {
    return -1;
  }

  return collection.findIndex((entry) => !entry);
}

function findPreferredEquipSlot(itemId, game = state.game) {
  if (!game?.inventory || !itemId) {
    return null;
  }

  const weaponSlotIndex = findFirstEmptyCompatibleSlot("weapon", itemId, game);
  if (weaponSlotIndex !== -1) {
    return {
      kind: "weapon",
      index: weaponSlotIndex,
    };
  }

  const utilitySlotIndex = findFirstEmptyCompatibleSlot("utility", itemId, game);
  if (utilitySlotIndex !== -1) {
    return {
      kind: "utility",
      index: utilitySlotIndex,
    };
  }

  return null;
}

function findPreferredRewardSlot(itemId, game = state.game) {
  if (!game?.inventory || !itemId) {
    return null;
  }

  if (isArtifactItemId(itemId)) {
    const utilitySlotIndex = findFirstEmptyCompatibleSlot("utility", itemId, game);
    if (utilitySlotIndex !== -1) {
      return {
        kind: "utility",
        index: utilitySlotIndex,
      };
    }
  } else {
    const preferredEquipSlot = findPreferredEquipSlot(itemId, game);
    if (preferredEquipSlot) {
      return preferredEquipSlot;
    }
  }

  const stashIndex = findFirstEmptyCompatibleSlot("stash", itemId, game);
  if (stashIndex !== -1) {
    return {
      kind: "stash",
      index: stashIndex,
    };
  }

  return null;
}

function grantInventoryRewardItem(itemId, game = state.game) {
  if (!game?.inventory || !getInventoryItemById(itemId)) {
    return null;
  }

  const destination = findPreferredRewardSlot(itemId, game);
  if (!destination) {
    return null;
  }

  setSlotValue(destination.kind, destination.index, itemId, game);
  if (destination.kind === "weapon") {
    game.inventory.activeWeaponSlotIndex = clamp(destination.index, 0, WEAPON_SLOT_CAPACITY - 1);
    game.inventory.activeLoadoutTarget = "weapon";
  } else if (destination.kind === "utility") {
    game.inventory.activeUtilitySlotIndex = clamp(destination.index, 0, UTILITY_SLOT_CAPACITY - 1);
    game.inventory.activeLoadoutTarget = "utility";
  } else if (destination.kind === "stash") {
    game.inventory.selectedIndex = clamp(destination.index, 0, game.inventory.items.length - 1);
  }

  refreshEquippedWeapon(game);
  refreshAllContainers(game);
  return destination;
}

function quickTransferItem(sourceKind, sourceIndex, game = state.game) {
  if (!game) {
    return false;
  }

  const itemId = getSlotValue(sourceKind, sourceIndex, game);
  if (!itemId) {
    return false;
  }

  let destinationKind = null;
  let destinationIndex = -1;

  if (sourceKind === "container") {
    destinationKind = "stash";
    destinationIndex = findFirstEmptyCompatibleSlot("stash", itemId, game);
  } else {
    const activeContainer = getActiveContainer(game);
    if (activeContainer) {
      destinationKind = "container";
      destinationIndex = findFirstEmptyCompatibleSlot("container", itemId, game);
    } else if (sourceKind === "stash") {
      const preferredEquipSlot = findPreferredEquipSlot(itemId, game);
      if (preferredEquipSlot) {
        destinationKind = preferredEquipSlot.kind;
        destinationIndex = preferredEquipSlot.index;
      }
    }

    if (destinationIndex === -1 && sourceKind !== "stash") {
      destinationKind = "stash";
      destinationIndex = findFirstEmptyCompatibleSlot("stash", itemId, game);
    }
  }

  if (!destinationKind || destinationIndex === -1) {
    return false;
  }

  if (destinationKind === sourceKind && destinationIndex === sourceIndex) {
    return false;
  }

  moveItemBetweenSlots(sourceKind, sourceIndex, destinationKind, destinationIndex);
  return true;
}

function equippedWeapon(game = state.game) {
  if (!game?.inventory) {
    return getWeaponById(game?.player?.equippedWeaponId);
  }

  const activeWeaponId =
    game.inventory.weaponSlots?.[game.inventory.activeWeaponSlotIndex]
    || game.inventory.weaponSlots?.find(Boolean)
    || game.player?.equippedWeaponId;
  return getWeaponById(activeWeaponId);
}

function distanceToLootBox(game = state.game) {
  const firstContainer = game?.containers?.[0];
  if (!firstContainer || !game?.player) {
    return Infinity;
  }
  return Math.hypot(firstContainer.worldX - game.player.worldX, firstContainer.worldY - game.player.worldY);
}

function distanceToArtifactBox(game = state.game) {
  const secondContainer = game?.containers?.[1];
  if (!secondContainer || !game?.player) {
    return Infinity;
  }
  return Math.hypot(secondContainer.worldX - game.player.worldX, secondContainer.worldY - game.player.worldY);
}

function nearestInteractableBox(game = state.game) {
  if (!game?.player || !Array.isArray(game.containers)) {
    return null;
  }

  const nearby = game.containers
    .map((container) => ({
      container,
      distance: Math.hypot(container.worldX - game.player.worldX, container.worldY - game.player.worldY),
    }))
    .filter(({ container, distance }) => distance <= container.interactionRadius)
    .sort((left, right) => left.distance - right.distance);

  if (!nearby.length) {
    return null;
  }

  return {
    kind: "container",
    box: nearby[0].container,
    distance: nearby[0].distance,
  };
}
