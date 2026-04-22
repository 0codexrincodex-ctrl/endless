/* Play runtime only: boss summon/control/render now lives in js/systems/boss.js. */

function slotSnapshotKey(items = []) {
  return items.map((itemId) => itemId || "-").join("|");
}

function roundedFillPercent(ratio) {
  return Math.round(clamp(ratio, 0, 1) * 1000) / 10;
}

const RUN_START_ZONE_RADIUS_SCALE = 3.2;
const LEFT_TOGGLE_TRIGGER_RADIUS_SCALE = 1.08;
const LEFT_TOGGLE_TRIGGER_OFFSET_FROM_START_ZONE_SCALE = 3.8;
const TOP_MARKER_RADIUS_SCALE = 1.08;
const TOP_MARKER_OFFSET_FROM_START_ZONE_SCALE = 3.8;
const MONSTER_SPAWN_BASE_RATE_PER_SECOND = 2;
const MONSTER_SPAWN_RATE_PER_LEVEL = 1;
const MONSTER_SPAWN_RATE_DOUBLING_SECONDS = 600;
const MONSTER_MAX_ACTIVE_COUNT = 1000;
const MONSTER_STREAM_SPAWN_EDGE_INSET_SCALE = 1.2;
const MONSTER_DESPAWN_DISTANCE_SCALE = 18;
const MONSTER_DEATH_DESPAWN_SECONDS = 0;
const MONSTER_ATTACK_INTERVAL_BASE_SECONDS = 1.18;
const MONSTER_ATTACK_INTERVAL_AGILITY_BONUS = 0.03;
const MONSTER_ATTACK_INTERVAL_MIN_SECONDS = 0.38;
const MONSTER_ATTACK_DAMAGE_ATTACK_SCALE = 0.032;
const MONSTER_ATTACK_DAMAGE_DEFENSE_SCALE = 0.18;
const MONSTER_ATTACK_RANGE_PADDING_SCALE = 0.18;
const MONSTER_MOVE_SPEED_SCALE = 0.25;
const MONSTER_APPROACH_FLANK_DISTANCE_SCALE = 2.8;
const MONSTER_APPROACH_FLANK_MAX_RADIANS = 0.5;
const MONSTER_ATTACK_CONTACT_GRACE_SECONDS = 0.16;
const MONSTER_ATTACK_CONTACT_GRACE_JITTER_SECONDS = 0.12;
const LEVEL_REWARD_REROLLS_PER_SELECTION = 2;

function playerSpriteScaleForScene(scene) {
  const tileSize = Math.max(1, Number(scene?.tileSize ?? 68) || 68);
  return Math.max(0.7, (tileSize * 0.8) / 32);
}

function restoredRunStarted(savedRun = null) {
  if (typeof savedRun?.runStarted === "boolean") {
    return savedRun.runStarted;
  }

  return Boolean(
    Number(savedRun?.elapsed ?? 0) > 0
    || (Array.isArray(savedRun?.monsters) && savedRun.monsters.length > 0)
  );
}

function createRunStartZone(scene, playerX = 0, playerY = 0, savedRun = null) {
  const fallbackRadius = scene.tileSize * RUN_START_ZONE_RADIUS_SCALE;
  return {
    originX: Number.isFinite(Number(savedRun?.startZoneOriginX)) ? Number(savedRun.startZoneOriginX) : Number(playerX),
    originY: Number.isFinite(Number(savedRun?.startZoneOriginY)) ? Number(savedRun.startZoneOriginY) : Number(playerY),
    radius: Math.max(40, Number(savedRun?.startZoneRadius ?? fallbackRadius) || fallbackRadius),
  };
}

function createMonsterSpawnToggleTrigger(scene, startZone) {
  if (!scene || !startZone) {
    return null;
  }

  const radius = Math.max(32, scene.tileSize * LEFT_TOGGLE_TRIGGER_RADIUS_SCALE);
  const offset = Math.max(
    scene.tileSize * 6.5,
    Number(startZone.radius ?? 0) + scene.tileSize * LEFT_TOGGLE_TRIGGER_OFFSET_FROM_START_ZONE_SCALE + radius,
  );
  return {
    originX: Number(startZone.originX ?? 0) - offset,
    originY: Number(startZone.originY ?? 0),
    radius,
    touchLatch: false,
  };
}

function distanceFromRunStartZone(game = state.game) {
  if (!game?.player || !game?.startZone) {
    return 0;
  }

  return Math.hypot(
    Number(game.player.worldX ?? 0) - Number(game.startZone.originX ?? 0),
    Number(game.player.worldY ?? 0) - Number(game.startZone.originY ?? 0),
  );
}

function currentMonsterSpawnRate(game = state.game) {
  if (!game?.runStarted) {
    return 0;
  }

  const elapsed = Math.max(0, Number(game.elapsed ?? 0));
  const waveTier = Math.floor(elapsed / MONSTER_SPAWN_RATE_DOUBLING_SECONDS);
  const playerLevel = Math.max(1, Math.round(Number(game.player?.level ?? 1) || 1));
  const levelBonusRate = Math.max(0, playerLevel - 1) * MONSTER_SPAWN_RATE_PER_LEVEL;
  return (MONSTER_SPAWN_BASE_RATE_PER_SECOND + levelBonusRate) * (2 ** waveTier);
}

function maybeStartActiveRun(game = state.game) {
  if (!game || game.runStarted || !game.startZone) {
    return false;
  }

  if (distanceFromRunStartZone(game) <= Number(game.startZone.radius ?? 0)) {
    return false;
  }

  game.runStarted = true;
  game.monsterSpawnProgress = Math.max(0, Number(game.monsterSpawnProgress ?? 0));
  game.elapsed = Math.max(0, Number(game.elapsed ?? 0));
  setHudSaveMessage("Run started");
  return true;
}

function updateMonsterSpawnToggle(game = state.game) {
  if (!game?.player || !game?.scene || !game?.monsterSpawnToggleTrigger) {
    return false;
  }

  const trigger = game.monsterSpawnToggleTrigger;
  const playerRadius = Math.max(8, Number(game.player.radius ?? 0) || game.scene.tileSize * 0.2);
  const distanceToTrigger = Math.hypot(
    Number(game.player.worldX ?? 0) - Number(trigger.originX ?? 0),
    Number(game.player.worldY ?? 0) - Number(trigger.originY ?? 0),
  );
  const isInside = distanceToTrigger <= Number(trigger.radius ?? 0) + playerRadius;
  if (!isInside) {
    trigger.touchLatch = false;
    return false;
  }
  if (trigger.touchLatch) {
    return false;
  }

  trigger.touchLatch = true;
  game.monsterSpawnsPaused = !Boolean(game.monsterSpawnsPaused);
  if (game.monsterSpawnsPaused) {
    game.monsterSpawnProgress = 0;
    if (Array.isArray(game.monsters) && game.monsters.length) {
      game.monsters.length = 0;
    }
    setHudSaveMessage("Monster spawns paused");
  } else {
    setHudSaveMessage("Monster spawns enabled");
  }
  return true;
}

function monsterStreamingViewportMetrics(monster, game = state.game) {
  if (!monster || !game?.player || !game?.arena || !game?.scene) {
    return null;
  }

  const width = Number(game.arena.width ?? 0);
  const height = Number(game.arena.height ?? 0);
  const cameraLeft = game.player.worldX - width * 0.5;
  const cameraTop = game.player.worldY - height * 0.5;
  const definition = typeof monsterById === "function" ? monsterById(monster.monsterId) : null;
  const spriteScale = monster.spriteScale ?? definition?.spriteScale ?? 0.72;
  const spriteSize = game.scene.tileSize * spriteScale;

  return {
    width,
    height,
    spriteSize,
    screenX: monster.worldX - cameraLeft,
    screenY: monster.worldY - cameraTop,
  };
}

function isMonsterWithinStreamingViewport(monster, game = state.game) {
  const metrics = monsterStreamingViewportMetrics(monster, game);
  if (!metrics) {
    return false;
  }

  return (
    metrics.screenX > -metrics.spriteSize
    && metrics.screenX < metrics.width + metrics.spriteSize
    && metrics.screenY > -metrics.spriteSize
    && metrics.screenY < metrics.height + metrics.spriteSize
  );
}

function trimStreamedMonsterCount(game = state.game) {
  if (!game?.player || !Array.isArray(game.monsters) || game.monsters.length <= MONSTER_MAX_ACTIVE_COUNT) {
    return;
  }

  game.monsters.sort((first, second) => (
    Math.hypot(first.worldX - game.player.worldX, first.worldY - game.player.worldY)
    - Math.hypot(second.worldX - game.player.worldX, second.worldY - game.player.worldY)
  ));
  game.monsters.length = MONSTER_MAX_ACTIVE_COUNT;
}

function streamedMonsterCount(game = state.game) {
  if (!game || !Array.isArray(game.monsters)) {
    return 0;
  }

  return game.monsters.reduce((total, monster) => (
    total + (isMonsterWithinStreamingViewport(monster, game) ? 1 : 0)
  ), 0);
}

function spawnStreamedMonsterInViewport(game = state.game) {
  if (!game?.scene || !game?.player || !game?.arena || typeof createMonsterEntity !== "function") {
    return null;
  }

  const width = Number(game.arena.width ?? 0);
  const height = Number(game.arena.height ?? 0);
  if (width <= 0 || height <= 0) {
    return null;
  }

  const cameraLeft = game.player.worldX - width * 0.5;
  const cameraTop = game.player.worldY - height * 0.5;
  const edgeInset = game.scene.tileSize * MONSTER_STREAM_SPAWN_EDGE_INSET_SCALE;
  const side = Math.floor(Math.random() * 4);
  let worldX = cameraLeft + width * 0.5;
  let worldY = cameraTop + height * 0.5;

  if (side === 0) {
    worldX = cameraLeft + edgeInset;
    worldY = cameraTop + edgeInset + Math.random() * Math.max(1, height - edgeInset * 2);
  } else if (side === 1) {
    worldX = cameraLeft + width - edgeInset;
    worldY = cameraTop + edgeInset + Math.random() * Math.max(1, height - edgeInset * 2);
  } else if (side === 2) {
    worldX = cameraLeft + edgeInset + Math.random() * Math.max(1, width - edgeInset * 2);
    worldY = cameraTop + edgeInset;
  } else {
    worldX = cameraLeft + edgeInset + Math.random() * Math.max(1, width - edgeInset * 2);
    worldY = cameraTop + height - edgeInset;
  }

  const monsterId = typeof randomMonsterCatalogId === "function" ? randomMonsterCatalogId() : null;
  return monsterId
    ? createMonsterEntity(monsterId, worldX, worldY, {}, {
        player: game.player,
        scene: game.scene,
      })
    : null;
}

function spawnActiveRunMonsters(game = state.game, count = 1) {
  if (!game?.scene || !game?.player || count <= 0) {
    return [];
  }

  const spawned = [];
  for (let index = 0; index < count; index += 1) {
    if (!Array.isArray(game.monsters) || game.monsters.length >= MONSTER_MAX_ACTIVE_COUNT) {
      break;
    }

    const monster = spawnStreamedMonsterInViewport(game);
    if (!monster) {
      continue;
    }
    spawned.push(monster);
    game.monsters.push(monster);
  }

  return spawned;
}

function prunePlayingSessionMonsters(game = state.game, dt = 0) {
  if (!game?.player || !Array.isArray(game.monsters) || !game.scene) {
    return;
  }
  for (let index = game.monsters.length - 1; index >= 0; index -= 1) {
    const monster = game.monsters[index];
    if (!monster) {
      game.monsters.splice(index, 1);
      continue;
    }

    if ((monster.health ?? 0) <= 0) {
      monster.deathTimer = Math.max(0, Number(monster.deathTimer ?? MONSTER_DEATH_DESPAWN_SECONDS) - dt);
      if (monster.deathTimer <= 0) {
        game.monsters.splice(index, 1);
      }
      continue;
    }

    monster.deathTimer = MONSTER_DEATH_DESPAWN_SECONDS;
    if (!isMonsterWithinStreamingViewport(monster, game)) {
      game.monsters.splice(index, 1);
    }
  }

  trimStreamedMonsterCount(game);
}

function updateMonsterSpawnDirector(dt, game = state.game) {
  if (!game) {
    return;
  }

  prunePlayingSessionMonsters(game, dt);
  if (game.monsterSpawnsPaused) {
    game.monsterSpawnProgress = 0;
    return;
  }
  if (!game.runStarted) {
    return;
  }

  const activeCount = streamedMonsterCount(game);
  if (activeCount >= MONSTER_MAX_ACTIVE_COUNT) {
    game.monsterSpawnProgress = Math.min(0.999, Number(game.monsterSpawnProgress ?? 0));
    return;
  }

  game.monsterSpawnProgress = Math.max(
    0,
    Number(game.monsterSpawnProgress ?? 0) + (currentMonsterSpawnRate(game) * dt),
  );
  const spawnCapacity = Math.max(0, MONSTER_MAX_ACTIVE_COUNT - activeCount);
  const spawnCount = Math.min(spawnCapacity, Math.floor(game.monsterSpawnProgress));
  if (spawnCount <= 0) {
    return;
  }

  game.monsterSpawnProgress -= spawnCount;
  spawnActiveRunMonsters(game, spawnCount);
}

function monsterAttackInterval(monster) {
  const agility = Math.max(1, Number(monster?.stats?.agility ?? 10) || 10);
  return Math.max(
    MONSTER_ATTACK_INTERVAL_MIN_SECONDS,
    MONSTER_ATTACK_INTERVAL_BASE_SECONDS - Math.max(0, agility - 10) * MONSTER_ATTACK_INTERVAL_AGILITY_BONUS,
  );
}

function monsterAttackDamage(monster, player) {
  const attack = Math.max(1, Number(monster?.attack ?? 1) || 1);
  const playerDefense = Math.max(0, Number(player?.defense ?? 0) || 0);
  return Math.max(
    1,
    Math.round((attack * MONSTER_ATTACK_DAMAGE_ATTACK_SCALE) - (playerDefense * MONSTER_ATTACK_DAMAGE_DEFENSE_SCALE)),
  );
}

function monsterAttackRange(monster, player, scene) {
  if (!monster || !player || !scene) {
    return 0;
  }

  const hitbox = typeof monsterHitboxFromEntity === "function" ? monsterHitboxFromEntity(monster, scene) : null;
  const monsterReach = hitbox
    ? Math.max(hitbox.width, hitbox.height) * 0.55
    : scene.tileSize * 0.22;
  const playerReach = Math.max(8, Number(player.radius ?? 0) || scene.tileSize * 0.2);
  return monsterReach + playerReach + scene.tileSize * MONSTER_ATTACK_RANGE_PADDING_SCALE;
}

function monsterApproachVariance(monster) {
  return Math.sin(
    (Number(monster?.animationOffset ?? 0) * 2.31)
    + (Number(monster?.attack ?? 0) * 0.013)
    + (Number(monster?.defense ?? 0) * 0.007),
  );
}

function monsterAttackContactGrace(monster) {
  const variance = monsterApproachVariance(monster);
  return MONSTER_ATTACK_CONTACT_GRACE_SECONDS
    + (((variance + 1) * 0.5) * MONSTER_ATTACK_CONTACT_GRACE_JITTER_SECONDS);
}

function monsterApproachTarget(monster, player, scene, attackRange, distanceToPlayer) {
  const playerX = Number(player?.worldX ?? 0);
  const playerY = Number(player?.worldY ?? 0);
  const monsterX = Number(monster?.worldX ?? 0);
  const monsterY = Number(monster?.worldY ?? 0);
  const gap = Math.max(0, distanceToPlayer - attackRange);
  const flankWindow = Math.max(scene?.tileSize ?? 0, Number(scene?.tileSize ?? 0) * MONSTER_APPROACH_FLANK_DISTANCE_SCALE);
  const flankWeight = clamp(1 - (gap / Math.max(1, flankWindow)), 0, 1);
  const flankAngle = monsterApproachVariance(monster) * MONSTER_APPROACH_FLANK_MAX_RADIANS * flankWeight;
  const approachAngle = Math.atan2(monsterY - playerY, monsterX - playerX) + flankAngle;
  return {
    x: playerX + Math.cos(approachAngle) * attackRange,
    y: playerY + Math.sin(approachAngle) * attackRange,
  };
}

function updateMonsterBehaviors(dt, game = state.game) {
  if (!game?.runStarted || !game?.player || !game?.scene || !Array.isArray(game.monsters)) {
    return;
  }

  const { player, scene } = game;
  if ((player.health ?? 0) <= 0) {
    return;
  }

  game.monsters.forEach((monster) => {
    if (!monster || (monster.health ?? 0) <= 0) {
      return;
    }

    monster.attackCooldown = Math.max(0, Number(monster.attackCooldown ?? 0) - dt);

    const dx = Number(player.worldX ?? 0) - Number(monster.worldX ?? 0);
    const dy = Number(player.worldY ?? 0) - Number(monster.worldY ?? 0);
    const distanceToPlayer = Math.hypot(dx, dy);
    const attackRange = monsterAttackRange(monster, player, scene);
    if (distanceToPlayer > attackRange) {
      monster.attackReadyTimer = null;
      const approachTarget = monsterApproachTarget(monster, player, scene, attackRange, distanceToPlayer);
      const approachDx = Number(approachTarget.x ?? 0) - Number(monster.worldX ?? 0);
      const approachDy = Number(approachTarget.y ?? 0) - Number(monster.worldY ?? 0);
      const distanceToApproachTarget = Math.hypot(approachDx, approachDy);
      const moveStep = Math.min(
        Math.max(0, distanceToApproachTarget),
        Math.max(0, Number(monster.moveSpeed ?? 0) || 0) * MONSTER_MOVE_SPEED_SCALE * dt,
      );
      if (moveStep > 0) {
        const safeDistanceToApproachTarget = Math.max(0.0001, distanceToApproachTarget);
        const directionX = approachDx / safeDistanceToApproachTarget;
        const directionY = approachDy / safeDistanceToApproachTarget;
        monster.worldX += directionX * moveStep;
        monster.worldY += directionY * moveStep;
      }
      return;
    }

    if (typeof monster.attackReadyTimer !== "number" || !Number.isFinite(monster.attackReadyTimer)) {
      monster.attackReadyTimer = monsterAttackContactGrace(monster);
    }
    if (monster.attackReadyTimer > 0) {
      monster.attackReadyTimer = Math.max(0, monster.attackReadyTimer - dt);
      return;
    }

    if (monster.attackCooldown > 0) {
      return;
    }

    const damage = monsterAttackDamage(monster, player);
    applyPlayerDamage(player, damage, {
      displayAmount: damage,
    });
    monster.attackCooldown = monsterAttackInterval(monster);
  });
}

function buildInventorySummarySnapshot(game = state.game) {
  if (!game?.inventory || !game?.player || !game?.scene) {
    return "";
  }

  const { inventory, player, scene } = game;
  const activeContainer = getActiveContainer(game);
  const wieldedWeapons = getWieldedWeapons(game);
  const equipped = equippedWeapon(game);

  return [
    activeContainer?.id || "-",
    activeContainer?.looted ? "1" : "0",
    inventory.activeLoadoutTarget || "weapon",
    inventory.activeWeaponSlotIndex,
    inventory.activeUtilitySlotIndex,
    slotSnapshotKey(inventory.weaponSlots || []),
    wieldedWeapons.map((weapon) => weapon?.id || "-").join("|"),
    equipped?.id || "-",
    player.attack ?? 0,
    scene.tileSize ?? 0,
  ].join("::");
}

function buildInventoryFullSnapshot(game = state.game, summarySnapshot = buildInventorySummarySnapshot(game)) {
  if (!game?.inventory) {
    return "";
  }

  const activeContainer = getActiveContainer(game);
  const visibleSlots = activeContainer ? visibleContainerSlotCount(activeContainer) : 0;

  return [
    summarySnapshot,
    game.inventory.selectedIndex,
    slotSnapshotKey(game.inventory.utilitySlots || []),
    (game.inventory.utilitySlots || [])
      .map((itemId, index) => {
        const buffState = getUtilityWeaponLocalBuffState(itemId, index, game);
        return buffState
          ? `${index}:${buffState.stackCount}:${buffState.active ? 1 : 0}:${buffState.speedMultiplier.toFixed(2)}`
          : `${index}:-`;
      })
      .join("|"),
    slotSnapshotKey(game.inventory.items || []),
    activeContainer?.id || "-",
    visibleSlots,
    activeContainer ? slotSnapshotKey(activeContainer.items.slice(0, visibleSlots)) : "-",
  ].join("::");
}

function getUtilityWeaponLocalBuffState(itemId, slotIndex, game = state.game) {
  if (!game?.player || !itemId) {
    return null;
  }

  const weapon = getWeaponById(itemId);
  if (weapon?.passive?.id !== SPIN_PASSIVE_ID || !isWeaponPassiveActive(weapon.passive)) {
    return null;
  }

  const attackState = game.player.utilityWeaponAttackStates?.[`utility:${slotIndex}`] || null;
  const stackCount = Math.max(0, Math.floor(Number(attackState?.utilityTwinSpinStacks ?? 0)));
  const stackSpeedBonus = Math.max(0, Number(weapon.utilityCombat?.utilityTwinSpinStackSpeedBonus ?? 0.08) || 0);
  const fallbackSpeedMultiplier = clamp(1 + stackCount * stackSpeedBonus, 1, 4);
  const speedMultiplier = typeof utilityTwinSpinLocalSpeedMultiplier === "function"
    ? utilityTwinSpinLocalSpeedMultiplier(attackState, {
      twinSpinStackSpeedBonus: stackSpeedBonus,
    })
    : fallbackSpeedMultiplier;

  return {
    stackCount,
    active: Boolean(attackState?.utilityTwinSpinEnabled),
    speedMultiplier,
    manaCostPerSecond: Math.max(0, Number(weapon.utilityCombat?.utilityTwinSpinManaCostPerSecond ?? 3) || 0),
  };
}

function getUtilityWeaponLocalBeamState(itemId, slotIndex, game = state.game) {
  if (!game?.player || !itemId) {
    return null;
  }

  const weapon = getWeaponById(itemId);
  if (weapon?.passive?.id !== BEAM_PASSIVE_ID) {
    return null;
  }

  const attackState = game.player.utilityWeaponAttackStates?.[`utility:${slotIndex}`] || null;
  const beamState = attackState?.utilityBeamState || null;
  return {
    active: Boolean(beamState?.active),
    damage: Math.max(0, Math.round(Number(beamState?.damage ?? 0) || 0)),
    manaCostPerSecond: Math.max(0, Number(beamState?.manaCostPerSecond ?? weapon.beamSkill?.manaCostPerSecond ?? 0) || 0),
    totalManaSpent: Math.max(0, Number(beamState?.totalManaSpent ?? 0) || 0),
    elapsedSeconds: Math.max(0, Number(beamState?.elapsedSeconds ?? 0) || 0),
  };
}

function collectHudRenderData() {
  const { player } = state.game;
  const weapon = equippedWeapon();
  const hp = clamp(healthRatio(player), 0, 1);
  const mp = clamp(manaRatio(player), 0, 1);
  const coreStats = normalizePlayerCoreStats(player.coreStats);
  const currentExperience = normalizeExperienceValue(player.experience);
  const nextLevelExperience = normalizeExperienceValue(
    player.experienceToNextLevel ?? experienceRequiredForLevel(player.level),
    experienceRequiredForLevel(player.level),
  );
  const levelProgress = experienceProgressRatio(currentExperience, nextLevelExperience);
  const hpFillPercent = roundedFillPercent(hp);
  const armorPool = Math.max(0, Number(player.maxArmor ?? player.armor ?? 0));
  const armorFillPercent = armorPool > 0
    ? roundedFillPercent((Number(player.armor ?? 0) || 0) / armorPool)
    : 0;
  const mpFillPercent = roundedFillPercent(mp);
  const levelProgressPercent = roundedFillPercent(levelProgress);
  const healthText = `${Math.round(player.health)} / ${player.maxHealth}`;
  const armorCurrent = Math.round(Math.max(0, Number(player.armor ?? 0)));
  const armorMax = Math.max(0, Math.round(Number(player.maxArmor ?? player.armor ?? 0)));
  const armorText = `${armorCurrent}`;
  const armorLabelText = `Armor ${armorCurrent} / ${armorMax}`;
  const manaText = `${Math.round(player.mana)} / ${player.maxMana}`;
  const stackCount = Math.max(0, Math.floor(player.physicalBoostStacks ?? 0));
  const pendingRewards = pendingLevelRewardCount(state.game);
  const statPointCount = Math.max(0, Math.floor(Number(player.statPoints ?? 0)));
  const dpsText = `DPS ${(state.game.combatMetrics?.dps ?? 0).toFixed(1)}`;
  const actionSpeed = Number(player.actionSpeed ?? player.attackSpeed ?? 1);
  const statValues = {
    level: `${player.level}`,
    exp: `${formatExperienceCompact(currentExperience)} / ${formatExperienceCompact(nextLevelExperience)}`,
    statPoints: `${statPointCount}`,
    vitality: `${coreStats.vitality}`,
    power: `${coreStats.power}`,
    guard: `${coreStats.guard}`,
    coreAgility: `${coreStats.agility}`,
    instinct: `${coreStats.instinct}`,
    attack: `${player.attack}`,
    hp: healthText,
    mana: manaText,
    defense: `${player.defense}`,
    agility: `${player.agility} (+${player.physicalBoostStacks ?? 0} stacks) (AS x${actionSpeed.toFixed(2)})`,
    armor: `${armorCurrent} / ${armorMax}`,
    hpRegen: `${player.healthRegen}/s`,
    manaRegen: `${player.manaRegen}/s`,
    range: weapon
      ? `${weaponRangeValue(state.game.scene, player, weapon).toFixed(0)}px`
      : `${player.skillRange}m`,
  };

  return {
    gender: player.gender || "female",
    name: player.name,
    chapterText: `Chapter ${state.game.chapter} • Attack Speed x${actionSpeed.toFixed(2)}`,
    levelBadgeText: `${player.level}`,
    levelProgressPercent,
    hpFillPercent,
    armorFillPercent,
    mpFillPercent,
    healthText,
    armorText,
    armorLabelText,
    manaText,
    stackCount,
    pendingRewards,
    pendingRewardBadgeText: pendingRewards > 99 ? "99+" : `${pendingRewards}`,
    dpsText,
    statValues,
    snapshot: [
      player.gender || "female",
      player.name,
      state.game.chapter,
      actionSpeed.toFixed(2),
      player.level,
      experienceToString(currentExperience),
      experienceToString(nextLevelExperience),
      statPointCount,
      coreStats.vitality,
      coreStats.power,
      coreStats.guard,
      coreStats.agility,
      coreStats.instinct,
      levelProgressPercent,
      hpFillPercent,
      healthText,
      armorFillPercent,
      armorText,
      armorLabelText,
      mpFillPercent,
      manaText,
      stackCount,
      pendingRewards,
      dpsText,
      ...Object.values(statValues),
    ].join("::"),
  };
}

function renderInventoryPanel(fullRender = true, force = false) {
  if (!inventoryGrid || !inventoryEquipped || !weaponSlotGrid || !utilitySlotGrid || !state.game) {
    return;
  }

  if (fullRender) {
    normalizePlayInventoryState(state.game);
  }
  const { inventory } = state.game;
  const equipped = equippedWeapon();
  const wieldedWeapons = getWieldedWeapons();
  const activeTarget = resolveInventoryLoadoutTarget(inventory);
  const activeContainer = getActiveContainer();
  const showContainer = Boolean(activeContainer);
  const summarySnapshot = buildInventorySummarySnapshot(state.game);
  const fullSnapshot = fullRender ? buildInventoryFullSnapshot(state.game, summarySnapshot) : "";
  const summaryUnchanged = !force && state.hud.inventorySummarySnapshot === summarySnapshot;
  const fullUnchanged = fullRender ? !force && state.hud.inventoryFullSnapshot === fullSnapshot : true;

  if (summaryUnchanged && (!fullRender || fullUnchanged)) {
    return;
  }

  if (!summaryUnchanged) {
    if (showContainer) {
      if (inventoryStatus) {
        inventoryStatus.textContent = "Chest open";
      }
      if (containerStatus) {
        containerStatus.textContent = activeContainer.looted ? "Empty" : activeContainer.label;
      }
    } else {
      if (inventoryStatus) {
        inventoryStatus.textContent = "Stash";
      }
      if (containerStatus) {
        containerStatus.textContent = "Chest";
      }
    }

    if (wieldedWeapons.length >= 2) {
      const [firstWeapon, secondWeapon] = wieldedWeapons;
      const dualDamage = weaponDamageValue(state.game.player, firstWeapon) + weaponDamageValue(state.game.player, secondWeapon);
      if (hasSpinPassiveLoadout(state.game)) {
        const stackCount = Math.max(0, Math.floor(state.game.player.physicalBoostStacks ?? 0));
        const passiveSourceCount = countWeaponPassiveSources(SPIN_PASSIVE_ID, ["hand", "utility"], state.game);
        inventoryEquipped.textContent = `Dual • ${firstWeapon.label} + ${secondWeapon.label} • ${dualDamage} DMG • ${SPIN_PASSIVE_TITLE} x${Math.max(1, passiveSourceCount)} • Hold Attack • ${stackCount} stacks`;
      } else {
        inventoryEquipped.textContent = `Dual • ${firstWeapon.label} + ${secondWeapon.label} • ${dualDamage} DMG`;
      }
    } else if (equipped) {
      inventoryEquipped.textContent = `${inventory.activeWeaponSlotIndex === 0 ? "Left" : "Right"} • ${equipped.label} • ${weaponDamageValue(state.game.player, equipped)} DMG • ${weaponRangeValue(state.game.scene, state.game.player, equipped).toFixed(0)}px`;
    } else {
      inventoryEquipped.textContent = `${inventory.activeWeaponSlotIndex === 0 ? "Left" : "Right"} empty`;
    }

    if (containerCard) {
      containerCard.hidden = !showContainer;
    }
    if (inventoryLayout) {
      inventoryLayout.classList.toggle("has-container", showContainer);
    }
    if (hudInventoryPanel) {
      hudInventoryPanel.classList.toggle("has-container", showContainer);
    }

    state.hud.inventorySummarySnapshot = summarySnapshot;
  }

  if (!fullRender) {
    return;
  }

  if (fullUnchanged) {
    state.hud.inventoryFullSnapshot = fullSnapshot;
    return;
  }

  const renderSlotButton = ({
    kind,
    index,
    value,
    ariaLabel,
    label,
    subcopy = "",
    emptyText = "Empty",
    selected = false,
    equipped = false,
  }) => {
    const item = getInventoryItemById(value);
    const utilityBuffState = kind === "utility" ? getUtilityWeaponLocalBuffState(value, index, state.game) : null;
    const selectionClass = selected && item
      ? (kind === "stash" || kind === "container" ? "is-selected" : "is-active")
      : "";
    const classes = [
      kind === "weapon" ? "weapon-slot" : kind === "utility" ? "utility-slot" : "inventory-slot",
      item ? "is-filled" : "is-empty",
      selectionClass,
      equipped ? "is-equipped" : "",
      utilityBuffState && utilityBuffState.stackCount > 0 ? "has-local-buff" : "",
    ].filter(Boolean).join(" ");

    const draggable = item ? ' draggable="true"' : "";
    const sourceAttrs = [
      `data-source-kind="${kind}"`,
      `data-source-index="${index}"`,
      item ? `data-item-id="${item.id}"` : "",
      kind === "weapon" ? `data-weapon-slot-index="${index}"` : "",
      kind === "utility" ? `data-utility-slot-index="${index}"` : "",
      kind === "stash" ? `data-slot-index="${index}"` : "",
      kind === "container" ? `data-container-slot-index="${index}"` : "",
    ].filter(Boolean).join(" ");

    if (!item) {
      return `
        <button class="${classes}" type="button" ${sourceAttrs}${draggable} aria-label="${ariaLabel}">
          ${kind === "stash" || kind === "container" ? `<span class="inventory-slot-index">${index + 1}</span>` : ""}
          <span class="slot-label">${label}</span>
          ${subcopy ? `<span class="slot-subcopy">${subcopy}</span>` : ""}
          <span class="slot-empty">${emptyText}</span>
        </button>
      `;
    }

    return `
      <button class="${classes}" type="button" ${sourceAttrs}${draggable} aria-label="${ariaLabel}">
        ${kind === "stash" || kind === "container" ? `<span class="inventory-slot-index">${index + 1}</span>` : ""}
        <span class="slot-label">${label}</span>
        ${subcopy ? `<span class="slot-subcopy">${subcopy}</span>` : ""}
        <img class="inventory-icon ${item.itemType === "artifact" ? "inventory-icon-artifact" : ""}" src="${item.src}" alt="" draggable="false" />
        ${utilityBuffState && utilityBuffState.stackCount > 0
          ? `<span class="slot-buff-badge ${utilityBuffState.active ? "is-live" : ""}" aria-label="${utilityBuffState.stackCount} sword stacks">${utilityBuffState.stackCount}</span>`
          : ""}
      </button>
    `;
  };

  weaponSlotGrid.innerHTML = inventory.weaponSlots
    .map((weaponId, index) => {
      const weapon = getWeaponById(weaponId);
      return renderSlotButton({
        kind: "weapon",
        index,
        value: weaponId,
        ariaLabel: weapon ? `Weapon Slot ${index + 1} ${weapon.label}` : `Weapon Slot ${index + 1}`,
        label: index === 0 ? "Left Hand" : "Right Hand",
        subcopy: weapon ? weapon.label : `Weapon Slot ${index + 1}`,
        selected: activeTarget === "weapon" && inventory.activeWeaponSlotIndex === index,
      });
    })
    .join("");

  utilitySlotGrid.innerHTML = inventory.utilitySlots
    .map((itemId, index) => {
      const item = getInventoryItemById(itemId);
      return renderSlotButton({
        kind: "utility",
        index,
        value: itemId,
        ariaLabel: item ? `Utility Slot ${index + 1} ${item.label}` : `Utility Slot ${index + 1}`,
        label: `Utility ${index + 1}`,
        subcopy: item ? item.label : "",
        selected: activeTarget === "utility" && inventory.activeUtilitySlotIndex === index,
      });
    })
    .join("");

  inventoryGrid.innerHTML = inventory.items
    .map((itemId, index) => {
      const item = getInventoryItemById(itemId);
      return renderSlotButton({
        kind: "stash",
        index,
        value: itemId,
        ariaLabel: item ? item.label : `Stash Slot ${index + 1}`,
        label: "Stash",
        selected: inventory.selectedIndex === index,
        equipped: isInventoryWeaponSlotted(itemId, inventory),
      });
    })
    .join("");

  if (containerGrid && activeContainer) {
    const visibleSlots = visibleContainerSlotCount(activeContainer);
    containerGrid.innerHTML = activeContainer.items
      .slice(0, visibleSlots)
      .map((itemId, index) => {
        const item = getInventoryItemById(itemId);
        return renderSlotButton({
          kind: "container",
          index,
          value: itemId,
          ariaLabel: item ? `${activeContainer.label} ${item.label}` : `Chest Slot ${index + 1}`,
          label: activeContainer.label,
        });
      })
      .join("");
  } else if (containerGrid) {
    containerGrid.innerHTML = "";
  }

  state.hud.inventorySummarySnapshot = summarySnapshot;
  state.hud.inventoryFullSnapshot = fullSnapshot;
}

function renderPlayingHud(force = false) {
  if (!state.game || !playingHud) return;
  const hudData = collectHudRenderData();
  if (!force && state.hud.hudSnapshot === hudData.snapshot) {
    if (state.hud.inventoryOpen) {
      renderInventoryPanel(true);
    }
    return;
  }

  hudPortrait.dataset.gender = hudData.gender;
  if (inventoryPreviewSprite) {
    inventoryPreviewSprite.dataset.gender = hudData.gender;
  }
  if (hudName) {
    hudName.textContent = hudData.name;
  }
  if (hudChapter) {
    hudChapter.textContent = hudData.chapterText;
  }
  if (hudLevel) {
    hudLevel.textContent = hudData.levelBadgeText;
    hudLevel.setAttribute("aria-label", `Level ${hudData.levelBadgeText}`);
  }
  if (hudLevelRing) {
    hudLevelRing.style.setProperty("--level-progress", `${hudData.levelProgressPercent}%`);
  }
  if (hudRewardBadge && hudRewardCount) {
    const hasPendingRewards = hudData.pendingRewards > 0;
    hudRewardBadge.hidden = !hasPendingRewards;
    hudRewardBadge.setAttribute(
      "aria-label",
      hasPendingRewards
        ? `Open pending rewards, ${hudData.pendingRewards} available`
        : "Open pending rewards",
    );
    hudRewardCount.textContent = hudData.pendingRewardBadgeText;
  }

  hudHealthFill.style.width = `${hudData.hpFillPercent}%`;
  hudHealthValue.textContent = hudData.healthText;
  if (hudHealthLabel) {
    hudHealthLabel.textContent = hudData.healthText;
  }
  if (hudArmorFill) {
    hudArmorFill.style.width = `${hudData.armorFillPercent}%`;
  }
  if (hudArmorValue) {
    hudArmorValue.textContent = hudData.armorText;
  }
  if (hudArmorLabel) {
    hudArmorLabel.textContent = hudData.armorLabelText;
  }

  hudManaFill.style.width = `${hudData.mpFillPercent}%`;
  hudManaValue.textContent = hudData.manaText;
  if (hudManaLabel) {
    hudManaLabel.textContent = hudData.manaText;
  }
  if (hudBuffIndicator && hudBuffStackCount) {
    if (hudData.stackCount > 0) {
      hudBuffIndicator.hidden = false;
      hudBuffStackCount.textContent = `${hudData.stackCount}`;
    } else {
      hudBuffIndicator.hidden = true;
    }
  }
  if (hudDpsValue) {
    hudDpsValue.textContent = hudData.dpsText;
  }

  Object.entries(hudStatNodes).forEach(([key, node]) => {
    if (node) {
      node.textContent = hudData.statValues[key];
    }
  });
  if (hudCoreStatButtons.length) {
    const canSpendPoints = Number(hudData.statValues.statPoints) > 0;
    hudCoreStatButtons.forEach((button) => {
      button.disabled = !canSpendPoints;
    });
  }

  state.hud.hudSnapshot = hudData.snapshot;
  if (state.hud.inventoryOpen || force) {
    renderInventoryPanel(true, force);
  }
}

function clearInventoryHoverCard() {
  state.hud.inventoryHoverSnapshot = "";
  state.hud.inventoryHoverTitle = "";
  if (inventoryHoverCard) {
    inventoryHoverCard.hidden = true;
    inventoryHoverCard.style.left = "";
    inventoryHoverCard.style.top = "";
  }
  if (inventoryHoverKind) {
    inventoryHoverKind.textContent = "";
  }
  if (inventoryHoverTitle) {
    inventoryHoverTitle.textContent = "";
  }
  if (inventoryHoverTags) {
    inventoryHoverTags.innerHTML = "";
  }
  if (inventoryHoverStats) {
    inventoryHoverStats.innerHTML = "";
  }
  if (inventoryHoverCopy) {
    inventoryHoverCopy.textContent = "";
  }
}

function inventoryHoverLocationLabel(sourceKind, sourceIndex) {
  if (sourceKind === "weapon") {
    return sourceIndex === 0 ? "Left Hand" : "Right Hand";
  }
  if (sourceKind === "utility") {
    return `Utility ${sourceIndex + 1}`;
  }
  if (sourceKind === "container") {
    return getActiveContainer()?.label || "Chest";
  }
  return "Stash";
}

function buildInventoryHoverPayload(itemId, sourceKind, sourceIndex) {
  if (!state.game) {
    return null;
  }

  const item = getInventoryItemById(itemId);
  if (!item) {
    return null;
  }

  const weapon = getWeaponById(itemId);
  const tags = [
    weapon ? "Weapon" : "Artifact",
    inventoryHoverLocationLabel(sourceKind, sourceIndex),
  ];
  const stats = [];
  let copy = "";

  if (sourceKind === "stash" && isInventoryWeaponSlotted(itemId, state.game.inventory)) {
    tags.push("Equipped");
  }

  if (weapon) {
    const handDamage = weaponDamageValue(state.game.player, weapon);
    const handRange = weaponRangeValue(state.game.scene, state.game.player, weapon);
    const beamProfile = beamSkillProfile(weapon, state.game.player, state.game.scene);
    stats.push(`${handDamage} DMG`);
    stats.push(`${Math.round(handRange)}px Range`);
    stats.push(`Scales with ${weaponScalingTags(weapon).join(" / ")}`);
    if (sourceKind === "utility" && weapon.utilityCombat) {
      const utilityProfile = utilityWeaponCombatProfile(weapon, state.game.player, state.game.scene);
      if (utilityProfile) {
        stats.push(`${utilityProfile.damage} Utility DMG`);
        stats.push(`${Math.round(utilityProfile.travelDistance)}px Utility Reach`);
        stats.push(`Scales with ${weaponScalingTags(weapon, { skillLike: true }).join(" / ")}`);
      }
    }
    copy = "Melee weapon";
    if (weapon.passive?.id === BEAM_PASSIVE_ID && isWeaponPassiveActive(weapon.passive)) {
      tags.push("Passive");
      stats.push(weapon.passive.title);
      if (sourceKind === "utility") {
        const beamState = getUtilityWeaponLocalBeamState(itemId, sourceIndex, state.game);
        if (beamState?.active) {
          tags.push("Channeling");
        }
        stats.push("Auto Beam on target");
        stats.push(`${Number(beamState?.manaCostPerSecond ?? beamProfile?.baseManaCostPerSecond ?? 0).toFixed(1).replace(/\.0$/, "")} Mana/s`);
        if (beamState?.active) {
          stats.push(`${beamState.damage} Utility Beam DMG`);
          stats.push(`${beamState.elapsedSeconds.toFixed(2)}s channel`);
        }
        copy = weapon.passive.utilityDescription || weapon.passive.description;
      } else {
        if (state.game.player?.beam?.weaponId === weapon.id) {
          tags.push("Channeling");
        }
        if (beamProfile) {
          stats.push(`${beamProfile.weaponDamage} Beam Base DMG`);
          stats.push(`${Math.round(beamProfile.range)}px Beam`);
          stats.push(`${Number(beamProfile.baseManaCostPerSecond).toFixed(1).replace(/\.0$/, "")} Mana/s base`);
          stats.push(`x${Number(beamProfile.manaCompoundMultiplierPerSecond ?? 1).toFixed(2)} mana each second`);
          stats.push(`${beamProfile.chargeDuration.toFixed(2)}s charge`);
          stats.push(`Scales with ${weaponScalingTags(weapon, { skillLike: true }).join(" / ")}`);
        }
        copy = weapon.passive.description;
      }
    } else if (weapon.passive?.id === SPIN_PASSIVE_ID && isWeaponPassiveActive(weapon.passive)) {
      tags.push("Passive");
      stats.push(weapon.passive.title);
      if (sourceKind === "utility") {
        const buffState = getUtilityWeaponLocalBuffState(itemId, sourceIndex, state.game);
        const currentSwordStacks = buffState?.stackCount ?? 0;
        if (currentSwordStacks > 0 || buffState?.active) {
          tags.push("Buffed");
        }
        stats.push(`${buffState?.manaCostPerSecond ?? 3} Mana/s while active`);
        stats.push("+1 sword stack / 1 Mana");
        if (currentSwordStacks > 0) {
          stats.push(`${currentSwordStacks} sword stacks`);
          stats.push(`Local Speed x${(buffState?.speedMultiplier ?? 1).toFixed(2)}`);
        }
        if (buffState?.active) {
          stats.push("Twin Spin Active");
        }
        copy = `${weapon.passive.utilityDescription}${currentSwordStacks > 0 ? ` Current: ${currentSwordStacks} sword stacks.` : ""}`;
      } else {
        const passiveSourceCount = countWeaponPassiveSources(SPIN_PASSIVE_ID, ["hand", "utility"], state.game);
        const currentStacks = passiveSourceCount > 0
          ? Math.max(0, Math.floor(state.game.player?.physicalBoostStacks ?? 0))
          : 0;
        stats.push(`+${passiveSourceCount || 1} stack / 1 Mana`);
        if (passiveSourceCount > 1) {
          stats.push(`x${passiveSourceCount} passive sources`);
        }
        copy = `${weapon.passive.description} ${weapon.passive.stackDescription}${currentStacks > 0 ? ` Current: ${currentStacks} stacks.` : ""}`;
      }
    } else if (weapon.passive?.id === TITAN_GROWTH_PASSIVE_ID && isWeaponPassiveActive(weapon.passive)) {
      tags.push("Passive");
      stats.push(weapon.passive.title);
      if (sourceKind === "utility") {
        stats.push("Flying sword only");
        copy = weapon.passive.utilityDescription || weapon.passive.description;
      } else {
        const titanState = state.game.player?.titanGrowth?.weaponId === weapon.id
          ? state.game.player.titanGrowth
          : null;
        const manaCostPerSecond = Math.max(0, Number(weapon.titanGrowthSkill?.manaCostPerSecond ?? 0) || 0);
        const rangeSizeBonusPerMana = Math.max(0, Number(weapon.titanGrowthSkill?.rangeSizeBonusPerMana ?? 0) || 0);
        stats.push(`${manaCostPerSecond.toFixed(1).replace(/\.0$/, "")} Mana/s held`);
        stats.push(`+${Math.round(rangeSizeBonusPerMana * 100)}% Range / Size per 1 Mana`);
        if (titanState?.active) {
          tags.push("Channeling");
          stats.push(`${titanState.totalManaSpent.toFixed(1)} Mana fed`);
          stats.push(`x${Number(titanState.rangeMultiplier ?? 1).toFixed(2)} Range / Size`);
        }
        copy = weapon.passive.description;
      }
    }
  } else if (item.itemType === "artifact") {
    if (item.passive) {
      tags.push("Passive");
      stats.push(item.passive.title);
      if (Number(item.passive.effects?.equipped?.skillRangeMultiplierBonus ?? 0) > 0) {
        stats.push(`+${Math.round(Number(item.passive.effects.equipped.skillRangeMultiplierBonus) * 100)}% Attack / Skill Range`);
      }
      if (Number(item.passive.effects?.equipped?.actionSpeedMultiplierBonus ?? 0) > 0) {
        stats.push(`+${Math.round(Number(item.passive.effects.equipped.actionSpeedMultiplierBonus) * 100)}% Action Speed`);
      }
      if (Number(item.passive.effects?.equipped?.lifeStealRatio ?? 0) > 0) {
        stats.push(`${Number(item.passive.effects.equipped.lifeStealRatio * 100).toFixed(0)}% Lifesteal`);
      }
      copy = item.passive.description;
    } else {
      copy = "Stored relic";
    }
  }

  return {
    kind: weapon ? "Item Detail" : "Relic Detail",
    title: item.label,
    tags,
    stats,
    copy,
    snapshot: [
      item.id,
      sourceKind,
      sourceIndex,
      tags.join("|"),
      stats.join("|"),
      copy,
    ].join("::"),
  };
}

function positionInventoryHoverCard(clientX, clientY) {
  if (!inventoryHoverCard) {
    return;
  }

  const margin = 16;
  const offset = 18;
  const rect = inventoryHoverCard.getBoundingClientRect();
  let nextLeft = clientX + offset;
  let nextTop = clientY + offset;

  if (nextLeft + rect.width > window.innerWidth - margin) {
    nextLeft = clientX - rect.width - offset;
  }
  if (nextTop + rect.height > window.innerHeight - margin) {
    nextTop = window.innerHeight - rect.height - margin;
  }

  inventoryHoverCard.style.left = `${Math.max(margin, nextLeft)}px`;
  inventoryHoverCard.style.top = `${Math.max(margin, nextTop)}px`;
}

function renderInventoryHoverCard(payload, clientX, clientY) {
  if (!inventoryHoverCard || !payload) {
    clearInventoryHoverCard();
    return;
  }

  if (state.hud.inventoryHoverSnapshot !== payload.snapshot) {
    if (inventoryHoverKind) {
      inventoryHoverKind.textContent = payload.kind;
    }
    if (inventoryHoverTitle) {
      inventoryHoverTitle.textContent = payload.title;
    }
    if (inventoryHoverTags) {
      inventoryHoverTags.innerHTML = payload.tags
        .map((tag) => `<span class="inventory-hover-pill">${tag}</span>`)
        .join("");
    }
    if (inventoryHoverStats) {
      inventoryHoverStats.innerHTML = payload.stats
        .map((stat) => `<span class="inventory-hover-stat">${stat}</span>`)
        .join("");
    }
    if (inventoryHoverCopy) {
      inventoryHoverCopy.textContent = payload.copy;
    }
    state.hud.inventoryHoverSnapshot = payload.snapshot;
    state.hud.inventoryHoverTitle = payload.title;
  }

  inventoryHoverCard.hidden = false;
  positionInventoryHoverCard(clientX, clientY);
}

function handleInventoryHoverMove(event) {
  if (!state.game || !state.hud.inventoryOpen || state.hud.dragItem || state.hud.starterWeaponOpen) {
    clearInventoryHoverCard();
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    clearInventoryHoverCard();
    return;
  }

  const button = target.closest("[data-item-id][data-source-kind][data-source-index]");
  if (!button) {
    clearInventoryHoverCard();
    return;
  }

  const payload = buildInventoryHoverPayload(
    button.dataset.itemId,
    button.dataset.sourceKind,
    Number(button.dataset.sourceIndex ?? 0),
  );
  renderInventoryHoverCard(payload, event.clientX, event.clientY);
}

function hasAnyWeaponInRun(game = state.game) {
  if (!game?.inventory || !game?.player) {
    return false;
  }

  return Boolean(
    getWeaponById(game.player.equippedWeaponId)
    || (game.inventory.weaponSlots || []).some((weaponId) => Boolean(getWeaponById(weaponId)))
    || (game.inventory.items || []).some((itemId) => Boolean(getWeaponById(itemId)))
  );
}

function shouldOpenStarterWeaponSelection(game = state.game) {
  return Boolean(game && !game.starterWeaponClaimed && !hasAnyWeaponInRun(game));
}

function pendingLevelRewardCount(game = state.game) {
  return Math.max(0, Math.floor(Number(game?.pendingLevelRewardSelections ?? 0)));
}

function rewardSelectionKind(kind = state.hud.rewardSelectionKind) {
  return kind === "level-up" ? "level-up" : "starter";
}

function rewardSelectionPool(kind = rewardSelectionKind()) {
  if (kind === "level-up") {
    return [...weaponCatalog, ...artifactCatalog];
  }
  return weaponCatalog;
}

function rewardSelectionAllowsReroll(kind = rewardSelectionKind()) {
  return kind === "level-up" || kind === "starter";
}

function defaultRewardSelectionRerolls(kind = rewardSelectionKind()) {
  return rewardSelectionAllowsReroll(kind) ? LEVEL_REWARD_REROLLS_PER_SELECTION : 0;
}

function rewardSelectionHeading(kind = rewardSelectionKind()) {
  return kind === "level-up" ? "Choose Your Reward" : "Choose Your Weapon";
}

function rewardSelectionOptionKey(optionIds = []) {
  return optionIds
    .filter(Boolean)
    .slice()
    .sort()
    .join("|");
}

function randomRewardSelectionOptions(kind = rewardSelectionKind(), excludedOptionIds = []) {
  const pool = rewardSelectionPool(kind);
  const optionCount = Math.min(3, pool.length);
  if (optionCount <= 0) {
    return [];
  }

  const excludedKey = rewardSelectionOptionKey(excludedOptionIds);
  let nextOptions = randomUniqueIds(pool, optionCount);
  if (!excludedKey || pool.length <= optionCount) {
    return nextOptions;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = randomUniqueIds(pool, optionCount);
    if (rewardSelectionOptionKey(candidate) !== excludedKey) {
      return candidate;
    }
    nextOptions = candidate;
  }

  return nextOptions;
}

function maybeOpenQueuedLevelRewardSelection() {
  if (!state.game || state.hud.starterWeaponOpen) {
    return false;
  }

  const pendingSelections = pendingLevelRewardCount(state.game);
  if (pendingSelections <= 0) {
    return false;
  }

  openStarterWeaponSelection("level-up");
  return true;
}

function queueLevelUpRewardSelections(count = 1) {
  if (!state.game) {
    return false;
  }

  const queueCount = Math.max(0, Math.floor(Number(count) || 0));
  if (queueCount <= 0) {
    return false;
  }

  state.game.pendingLevelRewardSelections = Math.max(
    0,
    pendingLevelRewardCount(state.game),
  ) + queueCount;
  state.hud.hudSnapshot = "";
  renderPlayingHud(true);
  return false;
}

function openQueuedLevelRewardSelectionFromHud() {
  if (!state.game) {
    return false;
  }

  const opened = maybeOpenQueuedLevelRewardSelection();
  if (opened) {
    state.hud.hudSnapshot = "";
    renderPlayingHud(true);
  }
  return opened;
}

function closeStarterWeaponSelection() {
  state.hud.starterWeaponOpen = false;
  state.hud.rewardSelectionKind = null;
  state.hud.rewardSelectionRerollsLeft = 0;
  state.hud.starterWeaponOptions = [];
  if (starterWeaponOverlay) {
    starterWeaponOverlay.hidden = true;
  }
  if (starterWeaponGrid) {
    starterWeaponGrid.innerHTML = "";
  }
  if (starterWeaponTitle) {
    starterWeaponTitle.textContent = rewardSelectionHeading("starter");
  }
  if (starterWeaponReroll) {
    starterWeaponReroll.hidden = true;
    starterWeaponReroll.disabled = true;
    starterWeaponReroll.textContent = `Reroll ${LEVEL_REWARD_REROLLS_PER_SELECTION}`;
  }
  if (typeof syncPlayOverlayPauseState === "function") {
    syncPlayOverlayPauseState();
  }
}

function renderStarterWeaponSelection() {
  if (!starterWeaponOverlay || !starterWeaponGrid) {
    return;
  }

  if (!state.hud.starterWeaponOpen || !state.game) {
    closeStarterWeaponSelection();
    return;
  }

  const currentSelectionKind = rewardSelectionKind();
  const optionIds = (state.hud.starterWeaponOptions || []).filter((itemId) => (
    currentSelectionKind === "starter"
      ? Boolean(getWeaponById(itemId))
      : Boolean(getInventoryItemById(itemId))
  ));
  if (!optionIds.length) {
    closeStarterWeaponSelection();
    return;
  }

  if (starterWeaponTitle) {
    starterWeaponTitle.textContent = rewardSelectionHeading(currentSelectionKind);
  }
  if (starterWeaponReroll) {
    const rerollAllowed = rewardSelectionAllowsReroll(currentSelectionKind);
    const rerollsLeft = Math.max(0, Math.floor(Number(state.hud.rewardSelectionRerollsLeft ?? 0)));
    starterWeaponReroll.hidden = !rerollAllowed;
    starterWeaponReroll.disabled = !rerollAllowed || rerollsLeft <= 0;
    starterWeaponReroll.textContent = `Reroll ${rerollsLeft}`;
    starterWeaponReroll.setAttribute("aria-label", `Reroll reward options, ${rerollsLeft} left`);
  }
  starterWeaponOverlay.hidden = false;
  starterWeaponGrid.innerHTML = optionIds.map((itemId) => {
    const item = getInventoryItemById(itemId);
    if (!item) {
      return "";
    }

    const isWeapon = Boolean(getWeaponById(itemId));
    const passiveCopy = item.passive && isWeaponPassiveActive(item.passive)
      ? `
          <p class="starter-weapon-meta">Passive • ${item.passive.title}</p>
          <p class="starter-weapon-meta">${item.passive.description}</p>
          ${item.passive.stackDescription ? `<p class="starter-weapon-meta">${item.passive.stackDescription}</p>` : ""}
        `
      : "";
    const statCopy = isWeapon
      ? `
          <p class="starter-weapon-meta">${weaponDamageValue(state.game.player, item)} DMG</p>
          <p class="starter-weapon-meta">${Math.round(weaponRangeValue(state.game.scene, state.game.player, item))}px range</p>
          <p class="starter-weapon-meta">Scales with ${weaponScalingTags(item).join(" / ")}</p>
        `
      : `
          <p class="starter-weapon-meta">Artifact</p>
        `;

    return `
      <button
        class="starter-weapon-card"
        type="button"
        data-starter-weapon-id="${item.id}"
        aria-label="Choose ${item.label}"
      >
        <div class="starter-weapon-icon-shell">
          <img class="starter-weapon-icon" src="${item.src}" alt="" draggable="false" />
        </div>
        <div class="starter-weapon-copy">
          <strong class="starter-weapon-name">${item.label}</strong>
          ${statCopy}
          ${passiveCopy}
        </div>
      </button>
    `;
  }).join("");
}

function openStarterWeaponSelection(kind = "starter", optionIds = null, rerollsLeft = null) {
  const currentSelectionKind = rewardSelectionKind(kind);
  const fallbackOptions = randomRewardSelectionOptions(currentSelectionKind);
  state.hud.rewardSelectionKind = currentSelectionKind;
  state.hud.rewardSelectionRerollsLeft = Math.max(
    0,
    Math.floor(
      Number(
        rerollsLeft ?? defaultRewardSelectionRerolls(currentSelectionKind)
      ) || 0,
    ),
  );
  state.hud.starterWeaponOptions = Array.isArray(optionIds) && optionIds.length
    ? optionIds.slice(0, 3)
    : fallbackOptions;
  state.hud.starterWeaponOpen = state.hud.starterWeaponOptions.length > 0;
  renderStarterWeaponSelection();
  if (typeof syncPlayOverlayPauseState === "function") {
    syncPlayOverlayPauseState();
  }
}

function rerollStarterWeaponSelection() {
  if (!state.game || !state.hud.starterWeaponOpen) {
    return;
  }

  const currentSelectionKind = rewardSelectionKind();
  if (!rewardSelectionAllowsReroll(currentSelectionKind)) {
    return;
  }

  const rerollsLeft = Math.max(0, Math.floor(Number(state.hud.rewardSelectionRerollsLeft ?? 0)));
  if (rerollsLeft <= 0) {
    return;
  }

  const nextOptions = randomRewardSelectionOptions(
    currentSelectionKind,
    state.hud.starterWeaponOptions || [],
  );
  if (!nextOptions.length) {
    return;
  }

  state.hud.rewardSelectionRerollsLeft = rerollsLeft - 1;
  state.hud.starterWeaponOptions = nextOptions.slice(0, 3);
  renderStarterWeaponSelection();
  setHudSaveMessage(`Reward rerolled (${state.hud.rewardSelectionRerollsLeft} left)`);
}

function refreshAfterRewardClaim(itemLabel) {
  setHudSaveMessage(`${itemLabel} claimed`);
  state.hud.hudSnapshot = "";
  state.hud.inventorySummarySnapshot = "";
  state.hud.inventoryFullSnapshot = "";
  renderInventoryPanel(true, true);
  renderPlayingHud(true);
}

function claimStarterWeapon(itemId) {
  if (!state.game) {
    return;
  }

  const selectionKind = rewardSelectionKind();
  if (selectionKind === "level-up") {
    const item = getInventoryItemById(itemId);
    if (!item) {
      return;
    }

    const placement = typeof grantInventoryRewardItem === "function"
      ? grantInventoryRewardItem(item.id, state.game)
      : null;
    if (!placement) {
      setHudSaveMessage("No open slot for reward");
      renderPlayingHud(true);
      return;
    }

    state.game.pendingLevelRewardSelections = Math.max(0, pendingLevelRewardCount(state.game) - 1);
    closeStarterWeaponSelection();
    refreshAfterRewardClaim(item.label);
    maybeOpenQueuedLevelRewardSelection();
    return;
  }

  const weapon = getWeaponById(itemId);
  if (!weapon) {
    return;
  }

  state.game.inventory.weaponSlots[0] = weapon.id;
  state.game.inventory.activeWeaponSlotIndex = 0;
  state.game.inventory.activeLoadoutTarget = "weapon";
  state.game.player.equippedWeaponId = weapon.id;
  state.game.starterWeaponClaimed = true;
  refreshEquippedWeapon();
  closeStarterWeaponSelection();
  refreshAfterRewardClaim(weapon.label);
}

function handleStarterWeaponSelection(event) {
  if (!state.hud.starterWeaponOpen) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest("[data-starter-weapon-id]");
  if (!button) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  claimStarterWeapon(button.dataset.starterWeaponId);
}

function handleStarterWeaponReroll(event) {
  if (!state.hud.starterWeaponOpen) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  rerollStarterWeaponSelection();
}

let playingSessionWarmupHandle = 0;
let playingSessionWarmupMode = "";

function cancelPlayingSessionWarmup() {
  if (!playingSessionWarmupHandle) {
    return;
  }

  if (playingSessionWarmupMode === "idle" && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(playingSessionWarmupHandle);
  } else {
    window.clearTimeout(playingSessionWarmupHandle);
  }

  playingSessionWarmupHandle = 0;
  playingSessionWarmupMode = "";
}

function schedulePlayingSessionWarmupCallback(callback) {
  cancelPlayingSessionWarmup();

  if (typeof window.requestIdleCallback === "function") {
    playingSessionWarmupMode = "idle";
    playingSessionWarmupHandle = window.requestIdleCallback(() => {
      playingSessionWarmupHandle = 0;
      playingSessionWarmupMode = "";
      callback();
    }, { timeout: 180 });
    return;
  }

  playingSessionWarmupMode = "timeout";
  playingSessionWarmupHandle = window.setTimeout(() => {
    playingSessionWarmupHandle = 0;
    playingSessionWarmupMode = "";
    callback();
  }, 32);
}

function restorePlayingSessionMonsters(game = state.game, savedMonsters = null) {
  if (!game || state.game !== game || (game.monsters || []).length) {
    return game?.monsters || [];
  }

  if (!game.runStarted || !Array.isArray(savedMonsters) || !savedMonsters.length) {
    game.monsters = [];
    return game.monsters;
  }

  game.monsters = restoreMonsterEntities(savedMonsters, game.scene, game.player, 0)
    .filter((monster) => isMonsterWithinStreamingViewport(monster, game))
    .slice(0, MONSTER_MAX_ACTIVE_COUNT);
  return game.monsters;
}

function warmPlayingSessionCaches(game = state.game, options = {}) {
  if (!game || state.game !== game) {
    return;
  }

  const {
    savedMonsters = null,
    openStarterSelection = false,
  } = options;

  restorePlayingSessionMonsters(game, savedMonsters);

  const arenaWidth = Math.max(1, Math.round(game.arena?.width ?? canvas.clientWidth ?? canvas.width ?? 1280));
  const arenaHeight = Math.max(1, Math.round(game.arena?.height ?? canvas.clientHeight ?? canvas.height ?? 720));
  const cameraLeft = game.player.worldX - arenaWidth * 0.5;
  const cameraTop = game.player.worldY - arenaHeight * 0.5;

  ensureFloorCache(game.scene, arenaWidth, arenaHeight, cameraLeft, cameraTop);
  getVisibleTorchEntries(game.scene, game.player, arenaWidth, arenaHeight);

  const monsterTypeIds = new Set((game.monsters || []).map((monster) => monster.monsterId));
  monsterTypeIds.forEach((monsterId) => {
    const definition = monsterById(monsterId);
    definition?.frames?.forEach((frame) => {
      sanitizedMonsterFrame(frame);
    });
  });

  const needsInventoryWarmRender = !state.hud.inventoryOpen
    && !weaponSlotGrid?.childElementCount
    && !utilitySlotGrid?.childElementCount
    && !inventoryGrid?.childElementCount;

  if (needsInventoryWarmRender) {
    renderInventoryPanel(true, true);
  }

  const renderState = getGameRenderState(game);
  if (renderState) {
    renderState.startupReady = true;
  }

  if (openStarterSelection && state.game === game && shouldOpenStarterWeaponSelection(game)) {
    openStarterWeaponSelection();
  }
}

function queuePlayingSessionWarmup(game = state.game, options = {}) {
  if (!game) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (!game || state.game !== game) {
      return;
    }

    schedulePlayingSessionWarmupCallback(() => {
      warmPlayingSessionCaches(game, options);
    });
  });
}

function handleHudStatInteraction(event) {
  if (!(event.target instanceof Element) || !state.game?.player) {
    return;
  }

  const button = event.target.closest("[data-core-stat-increase]");
  if (!button) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const statKey = button.dataset.coreStatIncrease;
  if (!PLAYER_CORE_STAT_KEYS.includes(statKey)) {
    return;
  }

  if (!spendPlayerStatPoint(state.game.player, statKey, { chapter: state.game.chapter })) {
    setHudSaveMessage("Not enough stat points");
    renderPlayingHud(true);
    return;
  }

  const nextValue = state.game.player.coreStats?.[statKey] ?? 0;
  const statLabel = {
    vitality: "Health",
    power: "Attack",
    guard: "Defense",
    agility: "Speed",
    instinct: "Control",
  }[statKey] || statKey;
  setHudSaveMessage(`${statLabel} increased to ${nextValue}`);
  state.hud.hudSnapshot = "";
  renderPlayingHud(true);
}

function startPlayingSession() {
  cancelPlayingSessionWarmup();
  const slot = currentSlot();
  const arena = currentArenaBounds();
  const scene = buildSceneLayout(arena);
  const savedRun = slot.saveData;
  const runStarted = restoredRunStarted(savedRun);
  const stats = buildPlayerStats(slot, savedRun?.playerStats);
  const inventoryItems = restoreInventoryItems(savedRun?.inventoryItems, STASH_CAPACITY);
  const savedContainers = Array.isArray(savedRun?.containers) ? savedRun.containers : [];
  const savedRewardSelectionKind = savedRun?.rewardSelectionKind === "level-up"
    ? "level-up"
    : (savedRun?.rewardSelectionKind === "starter" ? "starter" : null);
  const savedRewardSelectionOptions = Array.isArray(savedRun?.rewardSelectionOptions)
    ? savedRun.rewardSelectionOptions
      .filter((itemId) => (
        savedRewardSelectionKind === "level-up"
          ? Boolean(getInventoryItemById(itemId))
          : Boolean(getWeaponById(itemId))
      ))
      .slice(0, 3)
    : [];
  const hasSavedRewardSelection = Boolean(savedRewardSelectionKind && savedRewardSelectionOptions.length);
  const savedRewardSelectionRerollsLeft = hasSavedRewardSelection
    ? Math.max(
        0,
        Math.floor(
          Number(
            savedRun?.rewardSelectionRerollsLeft
            ?? defaultRewardSelectionRerolls(savedRewardSelectionKind)
          ) || 0,
        ),
      )
    : 0;
  const savedPendingLevelRewardSelections = Math.max(0, Math.floor(Number(savedRun?.pendingLevelRewardSelections ?? 0)));
  const migratedWeaponSlots = restoreSlotIds(savedRun?.equippedWeaponIds, WEAPON_SLOT_CAPACITY, (weaponId) => Boolean(getWeaponById(weaponId)));
  const weaponSlots = restoreSlotIds(savedRun?.weaponSlotIds, WEAPON_SLOT_CAPACITY, (weaponId) => Boolean(getWeaponById(weaponId)));
  const restoredUtilitySlots = restoreSlotIds(savedRun?.utilitySlotIds, UTILITY_SLOT_CAPACITY, (itemId) => Boolean(getInventoryItemById(itemId)));
  if (!weaponSlots.some(Boolean) && migratedWeaponSlots.some(Boolean)) {
    migratedWeaponSlots.forEach((weaponId, index) => {
      weaponSlots[index] = weaponId;
    });
  }

  const seedItemsIntoSlots = (itemIds) => {
    const items = restoreInventoryItems([], CONTAINER_CAPACITY);
    itemIds.forEach((itemId, index) => {
      if (index < items.length) {
        items[index] = itemId;
      }
    });
    return items;
  };

  const legacyContainerItems = [
    restoreInventoryItems(savedRun?.lootBoxItems, CONTAINER_CAPACITY),
    restoreInventoryItems(savedRun?.artifactBoxItems, CONTAINER_CAPACITY),
  ];

  const containerSeeds = [
      {
        id: "container-1",
      label: "Bronze Chest",
      variant: "bronze",
      worldX: -scene.tileSize * 1.15,
      worldY: scene.tileSize * 0.15,
      seedIds: defaultLootWeaponIds(),
      legacyItems: legacyContainerItems[0],
      legacyLooted: Boolean(savedRun?.lootBoxLooted),
    },
      {
        id: "container-2",
      label: "Jade Chest",
      variant: "jade",
      worldX: scene.tileSize * 1.15,
      worldY: scene.tileSize * 0.15,
      seedIds: defaultArtifactIds(),
      legacyItems: legacyContainerItems[1],
      legacyLooted: Boolean(savedRun?.artifactBoxLooted),
    },
  ];

  const containers = containerSeeds.map((seed, index) => {
    const savedContainer = savedContainers[index];
    const hasStoredContainerState = Boolean(savedContainer) || seed.legacyItems.some(Boolean);
    let items = restoreInventoryItems(savedContainer?.items, CONTAINER_CAPACITY);
    let looted = Boolean(savedContainer?.looted);

    if (!savedContainer && seed.legacyItems.some(Boolean)) {
      items = seed.legacyItems.slice();
      looted = seed.legacyLooted;
    }

    if (!hasStoredContainerState && !items.some(Boolean)) {
      items = seedItemsIntoSlots(seed.seedIds);
      looted = false;
    } else if (hasStoredContainerState && !looted && !items.some(Boolean)) {
      items = seedItemsIntoSlots(seed.seedIds);
      looted = false;
    }

    return {
      id: savedContainer?.id || seed.id,
      label: savedContainer?.label || seed.label,
      variant: savedContainer?.variant || seed.variant,
      worldX: savedContainer?.worldX ?? seed.worldX,
      worldY: savedContainer?.worldY ?? seed.worldY,
      size: savedContainer?.size ?? scene.tileSize * 0.72,
      interactionRadius: savedContainer?.interactionRadius ?? scene.tileSize * 1.06,
      items,
      looted,
      flash: 0,
    };
  });

  const savedEquippedWeaponId = getWeaponById(savedRun?.equippedWeaponId) ? savedRun.equippedWeaponId : null;
  const initialPlayerWorldX = Number(savedRun?.worldX ?? 0) || 0;
  const initialPlayerWorldY = Number(savedRun?.worldY ?? 0) || 0;

  state.input.pressed.clear();
  state.input.mouseX = arena.width * 0.68;
  state.input.mouseY = arena.height * 0.5;
  state.input.bossBeamHeld = false;
  state.input.attackHeld = false;
  state.input.attackHoldTime = 0;
  state.input.attackHoldStartedAt = 0;
  state.input.pendingBeamTap = false;
  state.input.pendingTitanTap = false;
  state.hud.dragItem = null;
  state.hud.dragSourceEl = null;
  state.hud.dragDropTargetEl = null;
  state.hud.starterWeaponOpen = false;
  state.hud.rewardSelectionKind = null;
  state.hud.rewardSelectionRerollsLeft = 0;
  state.hud.starterWeaponOptions = [];
  clearInventoryHoverCard();
  state.hud.hudSnapshot = "";
  state.hud.inventorySummarySnapshot = "";
  state.hud.inventoryFullSnapshot = "";
  const pendingStarterWeaponSelection = shouldOpenStarterWeaponSelection({
    starterWeaponClaimed: Boolean(savedRun?.starterWeaponClaimed),
    inventory: {
      items: inventoryItems,
      weaponSlots,
      utilitySlots: restoredUtilitySlots,
    },
    player: {
      equippedWeaponId: savedEquippedWeaponId,
    },
  }) && !hasSavedRewardSelection && savedPendingLevelRewardSelections <= 0;
  const startZone = createRunStartZone(scene, initialPlayerWorldX, initialPlayerWorldY, savedRun);

  state.game = {
    chapter: savedRun?.chapter ?? slot.chapter,
    elapsed: runStarted ? Number(savedRun?.elapsed ?? 0) || 0 : 0,
    arena,
    scene,
    runStarted,
    monsterSpawnsPaused: true,
    monsterSpawnProgress: runStarted ? Math.max(0, Number(savedRun?.monsterSpawnProgress ?? 0)) : 0,
    startZone,
    monsterSpawnToggleTrigger: createMonsterSpawnToggleTrigger(scene, startZone),
    bossSummonTrigger: createBossSummonTrigger(scene, startZone),
    bossSummonTest: createBossSummonTestState(),
    dummies: [],
    monsters: [],
    combatMetrics: {
      damageEvents: [],
      dps: 0,
      totalDamage: 0,
    },
    effects: [],
    starterWeaponClaimed: Boolean(savedRun?.starterWeaponClaimed),
    pendingLevelRewardSelections: savedPendingLevelRewardSelections,
    inventory: {
      capacity: STASH_CAPACITY,
      items: inventoryItems,
      selectedIndex: clamp(Number(savedRun?.selectedInventoryIndex ?? 0), 0, STASH_CAPACITY - 1),
      weaponSlots,
      utilitySlots: restoredUtilitySlots,
      activeWeaponSlotIndex: clamp(Number(savedRun?.activeWeaponSlotIndex ?? savedRun?.activeEquipIndex ?? 0), 0, WEAPON_SLOT_CAPACITY - 1),
      activeUtilitySlotIndex: clamp(Number(savedRun?.activeUtilitySlotIndex ?? 0), 0, UTILITY_SLOT_CAPACITY - 1),
      activeLoadoutTarget: savedRun?.activeLoadoutTarget === "utility" ? "utility" : "weapon",
    },
    containers,
    player: {
      name: slot.name || "New Survivor",
      gender: slot.gender || "female",
      worldX: initialPlayerWorldX,
      worldY: initialPlayerWorldY,
      screenX: arena.width * 0.5,
      screenY: arena.height * 0.5,
      radius: Math.max(16, Math.min(arena.width, arena.height) * 0.022),
      baseSpeed: Math.max(240, Math.min(arena.width, arena.height) * 0.34),
      speed: Math.max(240, Math.min(arena.width, arena.height) * 0.34),
      velocityX: 0,
      velocityY: 0,
      moveX: 0,
      moveY: 0,
      isMoving: false,
      facing: 0,
      spriteScale: playerSpriteScaleForScene(scene),
      animationTime: 0,
      attackCooldown: 0,
      swing: null,
      beam: null,
      beamScreenShake: null,
      spin: null,
      titanGrowth: null,
      screenShake: null,
      combatFloats: [],
      utilityImpactStreaks: [],
      utilityWeaponAttackStates: {},
      equippedWeaponId: savedEquippedWeaponId,
      ...stats,
    },
    renderState: {
      floorCanvas: null,
      floorKey: "",
      torchKey: "",
      torchEntries: [],
      startupReady: false,
    },
  };

  normalizePlayInventoryState(state.game);
  state.game.monsters = [];

  if (!state.game.player.equippedWeaponId) {
    state.game.player.equippedWeaponId =
      state.game.inventory.weaponSlots[state.game.inventory.activeWeaponSlotIndex]
      || state.game.inventory.weaponSlots.find(Boolean)
      || state.game.inventory.items.find((weaponId) => Boolean(weaponId))
      || null;
  }

  if (!state.game.inventory.weaponSlots.some(Boolean) && state.game.player.equippedWeaponId) {
    state.game.inventory.weaponSlots[0] = state.game.player.equippedWeaponId;
    state.game.inventory.activeWeaponSlotIndex = 0;
  }

  if (hasAnyWeaponInRun(state.game)) {
    state.game.starterWeaponClaimed = true;
  }

  refreshAllContainers();
  refreshEquippedWeapon();

  if (playingHud) {
    playingHud.classList.remove("is-hidden");
  }
  setHudSaveMessage(savedRun ? `Loaded the latest save for ${slot.name}` : "No save created this run");
  state.hud.statsOpen = false;
  state.hud.inventoryOpen = false;
  state.hud.activeContainerId = null;
  toggleHudSettings(false);
  syncPhysicalEnhancementStats(state.game.player);
  syncPlayerFacing();
  renderPlayingHud(true);
  if (hasSavedRewardSelection) {
    openStarterWeaponSelection(
      savedRewardSelectionKind,
      savedRewardSelectionOptions,
      savedRewardSelectionRerollsLeft,
    );
  } else {
    closeStarterWeaponSelection();
  }
  queuePlayingSessionWarmup(state.game, {
    savedMonsters: savedRun?.monsters,
    openStarterSelection: pendingStarterWeaponSelection,
  });
}

function normalizeMoveInput(event) {
  const { code, key } = event;
  if (code === "KeyW" || key === "ArrowUp") return "move_up";
  if (code === "KeyS" || key === "ArrowDown") return "move_down";
  if (code === "KeyA" || key === "ArrowLeft") return "move_left";
  if (code === "KeyD" || key === "ArrowRight") return "move_right";
  return null;
}

function movementVector() {
  const pressed = state.input.pressed;
  let x = 0;
  let y = 0;

  if (pressed.has("move_up")) y -= 1;
  if (pressed.has("move_down")) y += 1;
  if (pressed.has("move_left")) x -= 1;
  if (pressed.has("move_right")) x += 1;

  if (!x && !y) {
    return { x: 0, y: 0 };
  }

  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function approachScalar(current, target, delta) {
  const safeDelta = Math.max(0, Number(delta) || 0);
  if (current < target) {
    return Math.min(current + safeDelta, target);
  }
  if (current > target) {
    return Math.max(current - safeDelta, target);
  }
  return target;
}

function updateMoverPhysics(mover, move, moveSpeed, moveAcceleration, moveDeceleration, dt, {
  stopThreshold = 1.5,
  movingThreshold = 4,
} = {}) {
  if (!mover) {
    return;
  }

  const hasInput = Math.abs(move.x) > 0 || Math.abs(move.y) > 0;
  const targetVelocityX = move.x * moveSpeed;
  const targetVelocityY = move.y * moveSpeed;
  const responseRate = hasInput ? moveAcceleration : moveDeceleration;

  mover.velocityX = approachScalar(
    Number(mover.velocityX ?? 0),
    targetVelocityX,
    responseRate * dt,
  );
  mover.velocityY = approachScalar(
    Number(mover.velocityY ?? 0),
    targetVelocityY,
    responseRate * dt,
  );

  const unclampedVelocityLength = Math.hypot(mover.velocityX, mover.velocityY);
  if (!hasInput && unclampedVelocityLength <= stopThreshold) {
    mover.velocityX = 0;
    mover.velocityY = 0;
  } else if (unclampedVelocityLength > moveSpeed && unclampedVelocityLength > 0) {
    const clampScale = moveSpeed / unclampedVelocityLength;
    mover.velocityX *= clampScale;
    mover.velocityY *= clampScale;
  }

  const velocityLength = Math.hypot(mover.velocityX, mover.velocityY);
  const isMoving = velocityLength > movingThreshold;
  mover.moveX = isMoving ? mover.velocityX / velocityLength : move.x;
  mover.moveY = isMoving ? mover.velocityY / velocityLength : move.y;
  mover.isMoving = isMoving;
  mover.speed = moveSpeed;
  mover.worldX = Number(mover.worldX ?? 0) + mover.velocityX * dt;
  mover.worldY = Number(mover.worldY ?? 0) + mover.velocityY * dt;
  mover.animationTime = isMoving
    ? Number(mover.animationTime ?? 0) + dt
    : 0;
}

function updateArenaFromCanvas() {
  if (!state.game) return;
  const nextArena = currentArenaBounds();
  state.game.arena = nextArena;
  state.game.scene = buildSceneLayout(nextArena);
  state.game.player.radius = Math.max(16, Math.min(nextArena.width, nextArena.height) * 0.022);
  state.game.player.baseSpeed = Math.max(240, Math.min(nextArena.width, nextArena.height) * 0.34);
  syncPhysicalEnhancementStats(state.game.player);
  state.game.player.spriteScale = playerSpriteScaleForScene(state.game.scene);
  state.game.player.screenX = nextArena.width * 0.5;
  state.game.player.screenY = nextArena.height * 0.5;
  state.input.mouseX = clamp(state.input.mouseX || nextArena.width * 0.68, 0, nextArena.width);
  state.input.mouseY = clamp(state.input.mouseY || nextArena.height * 0.5, 0, nextArena.height);
  syncPlayerFacing();
}

function openLootBox() {
  if (!state.game) {
    return;
  }

  if (state.hud.starterWeaponOpen) {
    return;
  }

  if (state.hud.inventoryOpen) {
    toggleHudInventory(false);
    renderPlayingHud();
    return;
  }

  const interactableBox = nearestInteractableBox();
  if (!interactableBox) {
    state.hud.activeContainerId = null;
    toggleHudInventory(true);
    renderInventoryPanel(true);
    renderPlayingHud();
    return;
  }

  state.hud.activeContainerId = interactableBox.box.id;
  if (!interactableBox.box.looted) {
    interactableBox.box.flash = 0.34;
  }

  toggleHudInventory(true);
  renderInventoryPanel(true);
  renderPlayingHud();
}

function equipWeaponFromInventory(slotIndex) {
  if (!state.game) {
    return;
  }

  const { inventory, player } = state.game;
  const weaponId = inventory.items[slotIndex];
  inventory.selectedIndex = slotIndex;
  if (weaponId) {
    if (resolveInventoryLoadoutTarget(inventory) === "utility") {
      inventory.utilitySlots[inventory.activeUtilitySlotIndex] = weaponId;
    } else {
      inventory.weaponSlots[inventory.activeWeaponSlotIndex] = weaponId;
      player.equippedWeaponId = inventory.weaponSlots[inventory.activeWeaponSlotIndex];
    }
  }
  renderInventoryPanel(true);
  renderPlayingHud();
}

function selectWeaponSlot(slotIndex) {
  if (!state.game) {
    return;
  }

  state.game.inventory.activeWeaponSlotIndex = clamp(slotIndex, 0, 1);
  state.game.inventory.activeLoadoutTarget = "weapon";
  state.game.player.equippedWeaponId =
    state.game.inventory.weaponSlots[state.game.inventory.activeWeaponSlotIndex]
    || state.game.inventory.weaponSlots.find(Boolean)
    || null;
  renderInventoryPanel(true);
  renderPlayingHud();
}

function selectUtilitySlot(slotIndex) {
  if (!state.game) {
    return;
  }

  state.game.inventory.activeUtilitySlotIndex = clamp(slotIndex, 0, UTILITY_SLOT_CAPACITY - 1);
  state.game.inventory.activeLoadoutTarget = "utility";
  renderInventoryPanel(true);
  renderPlayingHud();
}

function getInventorySlotButtonFromTarget(target) {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest("[data-source-kind][data-source-index]");
}

function markPendingInventoryClick(button) {
  if (!button) {
    state.hud.pendingInventoryClick = null;
    return;
  }

  state.hud.pendingInventoryClick = {
    kind: button.dataset.sourceKind,
    index: Number(button.dataset.sourceIndex),
    expiresAt: performance.now() + 400,
  };
}

function consumePendingInventoryClick(button) {
  const pending = state.hud.pendingInventoryClick;
  if (!pending) {
    return false;
  }

  if (!button || performance.now() > pending.expiresAt) {
    state.hud.pendingInventoryClick = null;
    return false;
  }

  const sourceKind = button.dataset.sourceKind;
  const sourceIndex = Number(button.dataset.sourceIndex);
  const shouldConsume = sourceKind === pending.kind && sourceIndex === pending.index;
  if (shouldConsume) {
    state.hud.pendingInventoryClick = null;
  }
  return shouldConsume;
}

function clearInventoryDragPreview() {
  if (!state.hud.dragPreviewEl) {
    return;
  }
  state.hud.dragPreviewEl.remove();
  state.hud.dragPreviewEl = null;
}

function createInventoryDragPreview(item) {
  clearInventoryDragPreview();
  if (!item?.src) {
    return null;
  }

  const preview = document.createElement("div");
  preview.className = "inventory-drag-preview";
  preview.setAttribute("aria-hidden", "true");

  const icon = document.createElement("img");
  icon.className = `inventory-icon ${item.itemType === "artifact" ? "inventory-icon-artifact" : ""}`;
  icon.src = item.src;
  icon.alt = "";
  icon.draggable = false;
  preview.append(icon);

  document.body.append(preview);
  state.hud.dragPreviewEl = preview;
  return preview;
}

function clearInventoryDragState() {
  state.hud.dragItem = null;
  if (state.hud.dragSourceEl) {
    state.hud.dragSourceEl.classList.remove("is-dragging");
    state.hud.dragSourceEl = null;
  }
  if (state.hud.dragDropTargetEl) {
    state.hud.dragDropTargetEl.classList.remove("is-drop-target");
    state.hud.dragDropTargetEl = null;
  }
  clearInventoryDragPreview();
}

function handleInventoryDragStart(event) {
  if (!state.game) {
    return;
  }

  clearInventoryHoverCard();

  const button = getInventorySlotButtonFromTarget(event.target);
  if (!button) {
    return;
  }

  const sourceKind = button.dataset.sourceKind;
  const sourceIndex = Number(button.dataset.sourceIndex);
  const sourceValue = getSlotValue(sourceKind, sourceIndex);
  if (!sourceValue) {
    event.preventDefault();
    return;
  }

  state.hud.dragItem = {
    kind: sourceKind,
    index: sourceIndex,
  };
  state.hud.dragSourceEl = button;
  button.classList.add("is-dragging");

  if (event.dataTransfer) {
    const item = getInventoryItemById(sourceValue);
    const preview = createInventoryDragPreview(item);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${sourceKind}:${sourceIndex}`);
    if (preview && typeof event.dataTransfer.setDragImage === "function") {
      const previewSize = Math.max(48, Math.round(button.getBoundingClientRect().width || 64));
      event.dataTransfer.setDragImage(preview, previewSize * 0.5, previewSize * 0.5);
    }
  }
}

function handleInventoryDragOver(event) {
  if (!state.hud.dragItem) {
    return;
  }

  const button = getInventorySlotButtonFromTarget(event.target);
  if (!button) {
    return;
  }

  event.preventDefault();
  if (state.hud.dragDropTargetEl !== button) {
    if (state.hud.dragDropTargetEl) {
      state.hud.dragDropTargetEl.classList.remove("is-drop-target");
    }
    button.classList.add("is-drop-target");
    state.hud.dragDropTargetEl = button;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function handleInventoryDrop(event) {
  if (!state.game || !state.hud.dragItem) {
    return;
  }

  const button = getInventorySlotButtonFromTarget(event.target);
  if (!button) {
    clearInventoryDragState();
    return;
  }

  event.preventDefault();
  const destinationKind = button.dataset.sourceKind;
  const destinationIndex = Number(button.dataset.sourceIndex);
  const { kind: sourceKind, index: sourceIndex } = state.hud.dragItem;

  if (!(sourceKind === destinationKind && sourceIndex === destinationIndex)) {
    moveItemBetweenSlots(sourceKind, sourceIndex, destinationKind, destinationIndex);
  }

  state.hud.dragSuppressUntil = performance.now() + 140;
  clearInventoryDragState();
  renderInventoryPanel(true);
  renderPlayingHud();
}

function handleInventoryDragEnd() {
  clearInventoryDragState();
}

function handleInventoryPointerDown(event) {
  if (!state.game || event.button !== 0 || !event.shiftKey) {
    return;
  }

  if ((state.hud.dragSuppressUntil ?? 0) > performance.now()) {
    return;
  }

  const button = getInventorySlotButtonFromTarget(event.target);
  if (!button) {
    return;
  }

  const sourceKind = button.dataset.sourceKind;
  const sourceIndex = Number(button.dataset.sourceIndex ?? 0);
  if (!quickTransferItem(sourceKind, sourceIndex)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  markPendingInventoryClick(button);
  renderInventoryPanel(true);
  renderPlayingHud();
}

function handleInventoryInteraction(event) {
  if (!state.game) {
    return;
  }

  if ((state.hud.dragSuppressUntil ?? 0) > performance.now()) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest(".inventory-slot");
  if (!button) {
    return;
  }

  if (consumePendingInventoryClick(button)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const sourceKind = button.dataset.sourceKind;
  const sourceIndex = Number(button.dataset.sourceIndex ?? button.dataset.slotIndex ?? 0);
  if (event.shiftKey && quickTransferItem(sourceKind, sourceIndex)) {
    renderInventoryPanel(true);
    renderPlayingHud();
    return;
  }
  state.game.inventory.selectedIndex = sourceIndex;
  renderInventoryPanel(true);
  renderPlayingHud();
}

function handleWeaponSlotInteraction(event) {
  if (!state.game) {
    return;
  }

  if ((state.hud.dragSuppressUntil ?? 0) > performance.now()) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest(".weapon-slot");
  if (!button) {
    return;
  }

  if (consumePendingInventoryClick(button)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (event.shiftKey && quickTransferItem("weapon", Number(button.dataset.weaponSlotIndex))) {
    renderInventoryPanel(true);
    renderPlayingHud();
    return;
  }
  selectWeaponSlot(Number(button.dataset.weaponSlotIndex));
}

function handleUtilitySlotInteraction(event) {
  if (!state.game) {
    return;
  }

  if ((state.hud.dragSuppressUntil ?? 0) > performance.now()) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest(".utility-slot");
  if (!button) {
    return;
  }

  if (consumePendingInventoryClick(button)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (event.shiftKey && quickTransferItem("utility", Number(button.dataset.utilitySlotIndex))) {
    renderInventoryPanel(true);
    renderPlayingHud();
    return;
  }
  selectUtilitySlot(Number(button.dataset.utilitySlotIndex));
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nextWidth = Math.round(rect.width * dpr);
  const nextHeight = Math.round(rect.height * dpr);
  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateArenaFromCanvas();
}

function fillRoundRect(x, y, width, height, radius, fillStyle, strokeStyle = null) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

const backdropRenderCache = {
  canvas: document.createElement("canvas"),
  key: "",
};

const playingSceneVisualCache = {
  baseCanvas: document.createElement("canvas"),
  baseKey: "",
  vignetteCanvas: document.createElement("canvas"),
  vignetteKey: "",
  torchMaskCanvas: document.createElement("canvas"),
  torchGlowCanvas: document.createElement("canvas"),
  torchLightKey: "",
};

function ensureBackdropCache(width, height) {
  const cacheKey = `${Math.round(width)}:${Math.round(height)}`;
  if (backdropRenderCache.key === cacheKey) {
    return backdropRenderCache.canvas;
  }

  const backgroundCanvas = backdropRenderCache.canvas || document.createElement("canvas");
  const backgroundCtx = backgroundCanvas.getContext("2d", { alpha: false }) || backgroundCanvas.getContext("2d");
  backgroundCanvas.width = Math.max(1, Math.round(width));
  backgroundCanvas.height = Math.max(1, Math.round(height));

  const gradient = backgroundCtx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#16181c");
  gradient.addColorStop(0.55, "#111317");
  gradient.addColorStop(1, "#090a0d");
  backgroundCtx.fillStyle = gradient;
  backgroundCtx.fillRect(0, 0, width, height);

  backgroundCtx.strokeStyle = "rgba(255,255,255,0.05)";
  backgroundCtx.lineWidth = 1;
  const gridSize = 44;
  for (let x = 0; x < width; x += gridSize) {
    backgroundCtx.beginPath();
    backgroundCtx.moveTo(x, 0);
    backgroundCtx.lineTo(x, height);
    backgroundCtx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    backgroundCtx.beginPath();
    backgroundCtx.moveTo(0, y);
    backgroundCtx.lineTo(width, y);
    backgroundCtx.stroke();
  }

  backdropRenderCache.canvas = backgroundCanvas;
  backdropRenderCache.key = cacheKey;
  return backgroundCanvas;
}

function ensurePlayingSceneBaseCache(width, height, arena) {
  const cacheKey = [
    Math.round(width),
    Math.round(height),
    Math.round(arena?.minX ?? 0),
    Math.round(arena?.minY ?? 0),
    Math.round(arena?.maxX ?? width),
    Math.round(arena?.maxY ?? height),
  ].join(":");
  if (playingSceneVisualCache.baseKey === cacheKey) {
    return playingSceneVisualCache.baseCanvas;
  }

  const baseCanvas = playingSceneVisualCache.baseCanvas || document.createElement("canvas");
  const baseCtx = baseCanvas.getContext("2d", { alpha: false }) || baseCanvas.getContext("2d");
  baseCanvas.width = Math.max(1, Math.round(width));
  baseCanvas.height = Math.max(1, Math.round(height));

  baseCtx.fillStyle = "#050705";
  baseCtx.fillRect(0, 0, width, height);

  const bgGradient = baseCtx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#131814");
  bgGradient.addColorStop(0.5, "#0d1511");
  bgGradient.addColorStop(1, "#09100c");
  baseCtx.fillStyle = bgGradient;
  baseCtx.fillRect(0, 0, width, height);

  baseCtx.fillStyle = "#161417";
  baseCtx.fillRect(
    arena?.minX ?? 0,
    arena?.minY ?? 0,
    (arena?.maxX ?? width) - (arena?.minX ?? 0),
    (arena?.maxY ?? height) - (arena?.minY ?? 0),
  );

  playingSceneVisualCache.baseCanvas = baseCanvas;
  playingSceneVisualCache.baseKey = cacheKey;
  return baseCanvas;
}

function ensurePlayingSceneVignetteCache(width, height) {
  const cacheKey = `${Math.round(width)}:${Math.round(height)}`;
  if (playingSceneVisualCache.vignetteKey === cacheKey) {
    return playingSceneVisualCache.vignetteCanvas;
  }

  const vignetteCanvas = playingSceneVisualCache.vignetteCanvas || document.createElement("canvas");
  const vignetteCtx = vignetteCanvas.getContext("2d") || vignetteCanvas.getContext("2d", { alpha: true });
  vignetteCanvas.width = Math.max(1, Math.round(width));
  vignetteCanvas.height = Math.max(1, Math.round(height));
  vignetteCtx.clearRect(0, 0, width, height);

  const vignette = vignetteCtx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.16,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.66,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  vignetteCtx.fillStyle = vignette;
  vignetteCtx.fillRect(0, 0, width, height);

  playingSceneVisualCache.vignetteCanvas = vignetteCanvas;
  playingSceneVisualCache.vignetteKey = cacheKey;
  return vignetteCanvas;
}

function ensureTorchLightCache(scene) {
  const spriteSize = Math.max(96, Math.round(scene.tileSize * 5.4));
  const cacheKey = `${Math.round(scene.tileSize)}:${spriteSize}`;
  if (playingSceneVisualCache.torchLightKey === cacheKey) {
    return {
      maskCanvas: playingSceneVisualCache.torchMaskCanvas,
      glowCanvas: playingSceneVisualCache.torchGlowCanvas,
    };
  }

  const maskCanvas = playingSceneVisualCache.torchMaskCanvas || document.createElement("canvas");
  const glowCanvas = playingSceneVisualCache.torchGlowCanvas || document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d") || maskCanvas.getContext("2d", { alpha: true });
  const glowCtx = glowCanvas.getContext("2d") || glowCanvas.getContext("2d", { alpha: true });
  const center = spriteSize * 0.5;

  maskCanvas.width = spriteSize;
  maskCanvas.height = spriteSize;
  glowCanvas.width = spriteSize;
  glowCanvas.height = spriteSize;

  maskCtx.clearRect(0, 0, spriteSize, spriteSize);
  const maskGradient = maskCtx.createRadialGradient(
    center,
    center,
    spriteSize * 0.08,
    center,
    center,
    center,
  );
  maskGradient.addColorStop(0, "rgba(255,255,255,0.9)");
  maskGradient.addColorStop(0.4, "rgba(255,255,255,0.38)");
  maskGradient.addColorStop(1, "rgba(255,255,255,0)");
  maskCtx.fillStyle = maskGradient;
  maskCtx.fillRect(0, 0, spriteSize, spriteSize);

  glowCtx.clearRect(0, 0, spriteSize, spriteSize);
  const glowGradient = glowCtx.createRadialGradient(
    center,
    center,
    spriteSize * 0.04,
    center,
    center,
    center * 0.92,
  );
  glowGradient.addColorStop(0, "rgba(255, 208, 132, 0.28)");
  glowGradient.addColorStop(0.34, "rgba(255, 156, 86, 0.18)");
  glowGradient.addColorStop(1, "rgba(255, 116, 60, 0)");
  glowCtx.fillStyle = glowGradient;
  glowCtx.fillRect(0, 0, spriteSize, spriteSize);

  playingSceneVisualCache.torchMaskCanvas = maskCanvas;
  playingSceneVisualCache.torchGlowCanvas = glowCanvas;
  playingSceneVisualCache.torchLightKey = cacheKey;
  return { maskCanvas, glowCanvas };
}

function drawBackdrop(width, height, time) {
  ctx.drawImage(ensureBackdropCache(width, height), 0, 0, width, height);

  ctx.save();
  ctx.translate(width * 0.62, height * 0.54);
  const pulse = Math.sin(time * 0.0012) * 0.5 + 0.5;
  const sectors = [
    { r: 230, color: "rgba(79,138,106,0.12)" },
    { r: 310, color: "rgba(184,116,60,0.08)" },
    { r: 390, color: "rgba(243,234,219,0.04)" },
  ];
  sectors.forEach(({ r, color }) => {
    ctx.beginPath();
    ctx.arc(0, 0, r + pulse * 6, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  for (let i = 0; i < 5; i += 1) {
    const angle = time * 0.00018 + i * 1.2;
    const x = Math.cos(angle) * (110 + i * 46);
    const y = Math.sin(angle * 1.1) * (90 + i * 28);
    ctx.beginPath();
    ctx.fillStyle = i % 2 === 0 ? "rgba(184,116,60,0.8)" : "rgba(79,138,106,0.78)";
    ctx.arc(x, y, i === 0 ? 8 : 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const nodeCount = 18;
  for (let i = 0; i < nodeCount; i += 1) {
    const angle = (Math.PI * 2 * i) / nodeCount + time * 0.00005;
    const radius = 150 + (i % 3) * 52;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.74;
    ctx.beginPath();
    ctx.fillStyle = "rgba(242,233,215,0.18)";
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#d7b37a";
  ctx.font = '14px "Iowan Old Style", Georgia, serif';
  ctx.textAlign = "center";
  const runeLine = ["ᚱ", "⟁", "✶", "⟐", "⊕", "ᚠ"];
  for (let index = 0; index < 8; index += 1) {
    const x = width * 0.12 + index * (width * 0.11);
    const y = height * 0.18 + Math.sin(time * 0.0004 + index) * 18;
    ctx.fillText(runeLine[index % runeLine.length], x, y);
  }
  ctx.restore();
}

function drawPixelSprite(image, sx, sy, sw, sh, dx, dy, dw, dh) {
  const sourceWidth = Number(image?.naturalWidth || image?.videoWidth || image?.width || 0);
  const sourceHeight = Number(image?.naturalHeight || image?.videoHeight || image?.height || 0);
  if (!image || image.complete === false || !sourceWidth || !sourceHeight) {
    return false;
  }
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = smoothing;
  return true;
}

function drawWholePixelImage(image, dx, dy, dw, dh) {
  const sourceWidth = Number(image?.naturalWidth || image?.videoWidth || image?.width || 0);
  const sourceHeight = Number(image?.naturalHeight || image?.videoHeight || image?.height || 0);
  return drawPixelSprite(image, 0, 0, sourceWidth, sourceHeight, dx, dy, dw, dh);
}

function drawAnimatedEffect(effect, screenX, screenY, scene, progressOverride = null) {
  const asset = playingAssets[effect.assetKey];
  if (!asset?.complete) {
    return;
  }

  const progress = clamp(progressOverride ?? (1 - effect.timer / effect.duration), 0, 0.9999);
  const frameIndex = Math.min(effect.frameCount - 1, Math.floor(progress * effect.frameCount));
  const frameX = (frameIndex % effect.columns) * effect.frameSize;
  const frameY = Math.floor(frameIndex / effect.columns) * effect.frameSize;
  const effectSize = scene.tileSize * effect.sizeScale;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(effect.angle + effect.rotationOffset);
  ctx.globalCompositeOperation = effect.blend;
  ctx.filter = `brightness(${effect.brightness}) saturate(${effect.saturate})`;
  drawPixelSprite(
    asset,
    frameX,
    frameY,
    effect.frameSize,
    effect.frameSize,
    -effectSize * 0.5,
    -effectSize * 0.5,
    effectSize,
    effectSize,
  );
  ctx.filter = "none";
  ctx.restore();
}

function drawPropShadow(x, y, width, height, opacity = 0.28) {
  ctx.fillStyle = `rgba(0,0,0,${opacity})`;
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
}

function resolvePlayerSpriteDirection(angle) {
  const sector = Math.round(angle / (Math.PI / 4));
  const normalized = ((sector % 8) + 8) % 8;

  switch (normalized) {
    case 0:
      return { row: 2, flipX: false };
    case 1:
      return { row: 1, flipX: false };
    case 2:
      return { row: 0, flipX: false };
    case 3:
      return { row: 1, flipX: true };
    case 4:
      return { row: 2, flipX: true };
    case 5:
      return { row: 3, flipX: true };
    case 6:
      return { row: 4, flipX: false };
    case 7:
    default:
      return { row: 3, flipX: false };
  }
}

function hash2D(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function getGameRenderState(game = state.game) {
  if (!game) {
    return null;
  }

  if (!game.renderState) {
    game.renderState = {
      floorCanvas: null,
      floorKey: "",
      torchKey: "",
      torchEntries: [],
      startupReady: true,
    };
  }

  return game.renderState;
}

function ensureFloorCache(scene, width, height, cameraLeft, cameraTop) {
  const renderState = getGameRenderState();
  const tileSize = scene.tileSize;
  const startTileX = Math.floor(cameraLeft / tileSize) - 1;
  const endTileX = Math.floor((cameraLeft + width) / tileSize) + 1;
  const startTileY = Math.floor(cameraTop / tileSize) - 1;
  const endTileY = Math.floor((cameraTop + height) / tileSize) + 1;
  const tileColumns = endTileX - startTileX + 1;
  const tileRows = endTileY - startTileY + 1;
  const cacheKey = `${tileSize}:${startTileX}:${startTileY}:${tileColumns}:${tileRows}`;

  if (renderState.floorKey !== cacheKey) {
    const floorCanvas = renderState.floorCanvas || document.createElement("canvas");
    const floorCtx = floorCanvas.getContext("2d", { alpha: false }) || floorCanvas.getContext("2d");
    floorCanvas.width = Math.ceil(tileColumns * tileSize) + 2;
    floorCanvas.height = Math.ceil(tileRows * tileSize) + 2;

    for (let row = 0; row < tileRows; row += 1) {
      for (let column = 0; column < tileColumns; column += 1) {
        const tileX = startTileX + column;
        const tileY = startTileY + row;
        const localX = Math.floor(column * tileSize);
        const localY = Math.floor(row * tileSize);
        const tone = hash2D(tileX, tileY);
        const variant = hash2D(tileX + 19, tileY - 7);
        floorCtx.fillStyle = tone > 0.5 ? "rgba(42, 35, 39, 0.56)" : "rgba(31, 27, 31, 0.62)";
        floorCtx.fillRect(localX, localY, tileSize + 1, tileSize + 1);

        if (variant > 0.74) {
          floorCtx.fillStyle = "rgba(74, 52, 47, 0.14)";
          floorCtx.fillRect(localX, localY, tileSize + 1, tileSize + 1);
        }

        floorCtx.strokeStyle = "rgba(140, 102, 82, 0.1)";
        floorCtx.lineWidth = 1;
        floorCtx.strokeRect(localX, localY, tileSize, tileSize);

        if (variant < 0.12) {
          floorCtx.strokeStyle = "rgba(194, 132, 91, 0.1)";
          floorCtx.beginPath();
          floorCtx.moveTo(localX + tileSize * 0.2, localY + tileSize * 0.25);
          floorCtx.lineTo(localX + tileSize * 0.74, localY + tileSize * 0.7);
          floorCtx.stroke();
        }
        if (variant > 0.88) {
          floorCtx.strokeStyle = "rgba(128, 150, 136, 0.08)";
          floorCtx.beginPath();
          floorCtx.arc(localX + tileSize * 0.5, localY + tileSize * 0.5, tileSize * 0.18, 0, Math.PI * 2);
          floorCtx.stroke();
        }
      }
    }

    renderState.floorCanvas = floorCanvas;
    renderState.floorKey = cacheKey;
  }

  return {
    canvas: renderState.floorCanvas,
    offsetX: Math.floor(startTileX * tileSize - cameraLeft),
    offsetY: Math.floor(startTileY * tileSize - cameraTop),
  };
}

function getVisibleTorchEntries(scene, player, width, height) {
  const renderState = getGameRenderState();
  const cellSize = scene.tileSize * scene.torchCellSpan;
  const cameraLeft = player.worldX - width * 0.5;
  const cameraTop = player.worldY - height * 0.5;
  const startCellX = Math.floor(cameraLeft / cellSize) - 1;
  const endCellX = Math.floor((cameraLeft + width) / cellSize) + 1;
  const startCellY = Math.floor(cameraTop / cellSize) - 1;
  const endCellY = Math.floor((cameraTop + height) / cellSize) + 1;
  const cacheKey = `${scene.tileSize}:${startCellX}:${startCellY}:${endCellX}:${endCellY}`;

  if (renderState.torchKey !== cacheKey) {
    const torchEntries = [];
    for (let cellY = startCellY; cellY <= endCellY; cellY += 1) {
      for (let cellX = startCellX; cellX <= endCellX; cellX += 1) {
        const spawnRoll = hash2D(cellX * 3.7 + 11.2, cellY * 5.1 - 6.8);
        if (spawnRoll <= 1 - scene.torchChance) continue;

        const offsetX = (hash2D(cellX + 17, cellY - 12) - 0.5) * scene.tileSize * 1.6;
        const offsetY = (hash2D(cellX - 9, cellY + 21) - 0.5) * scene.tileSize * 1.6;
        torchEntries.push({
          worldX: (cellX + 0.5) * cellSize + offsetX,
          worldY: (cellY + 0.5) * cellSize + offsetY,
          spriteSize: scene.torchSpriteSize,
          flickerSeed: hash2D(cellX + 43, cellY + 57),
        });
      }
    }

    renderState.torchKey = cacheKey;
    renderState.torchEntries = torchEntries;
  }

  return renderState.torchEntries;
}

function getVisibleTorches(scene, player, width, height) {
  const cameraLeft = player.worldX - width * 0.5;
  const cameraTop = player.worldY - height * 0.5;
  return getVisibleTorchEntries(scene, player, width, height).map((entry) => {
    const screenX = Math.round(entry.worldX - cameraLeft);
    const screenY = Math.round(entry.worldY - cameraTop);
    const flicker =
      0.92 +
      Math.sin(state.time * 0.008 + entry.flickerSeed * Math.PI * 2) * 0.07 +
      entry.flickerSeed * 0.05;

    return {
      ...entry,
      screenX,
      screenY,
      lightRadius: scene.tileSize * (2.1 + flicker * 0.4),
      flicker,
    };
  });
}

function drawPlayingScene(width, height) {
  const { player, scene, dummies, effects, monsters } = state.game;
  const arena = state.game.arena;
  const renderState = getGameRenderState();
  const startupReady = renderState?.startupReady !== false;
  const cameraAnchor = currentCameraAnchor(state.game) || player;

  ctx.drawImage(ensurePlayingSceneBaseCache(width, height, arena), 0, 0, width, height);

  let screenShakeX = 0;
  let screenShakeY = 0;
  if (player.screenShake?.timer > 0) {
    const duration = Math.max(0.001, Number(player.screenShake.duration ?? player.screenShake.timer) || 0.001);
    const progress = 1 - clamp(player.screenShake.timer / duration, 0, 1);
    const decay = Math.max(0, 1 - progress);
    const amplitude = Math.max(0, Number(player.screenShake.amplitude ?? 0) || 0) * decay;
    const phase = state.time * 0.22;
    screenShakeX = Math.cos(phase * 1.3) * amplitude;
    screenShakeY = Math.sin(phase * 1.9) * amplitude * 0.7;
  }
  if (player.beamScreenShake) {
    const amplitude = Math.max(0, Number(player.beamScreenShake.amplitude ?? 0) || 0);
    const phaseSpeed = Math.max(0.001, Number(player.beamScreenShake.phaseSpeed ?? 0.32) || 0.32);
    const verticalScale = clamp(Number(player.beamScreenShake.verticalScale ?? 0.72) || 0.72, 0.1, 1);
    const phase = state.time * phaseSpeed;
    screenShakeX += Math.cos(phase * 1.6) * amplitude;
    screenShakeY += Math.sin(phase * 2.3) * amplitude * verticalScale;
  }

  ctx.save();
  if (screenShakeX || screenShakeY) {
    ctx.translate(screenShakeX, screenShakeY);
  }

  const cameraLeft = Number(cameraAnchor.worldX ?? player.worldX ?? 0) - width * 0.5;
  const cameraTop = Number(cameraAnchor.worldY ?? player.worldY ?? 0) - height * 0.5;
  let torches = [];
  if (startupReady) {
    const floorCache = ensureFloorCache(scene, width, height, cameraLeft, cameraTop);
    ctx.drawImage(floorCache.canvas, floorCache.offsetX, floorCache.offsetY);
    torches = getVisibleTorches(scene, cameraAnchor, width, height);
    const torchLightCache = ensureTorchLightCache(scene);

    ctx.drawImage(ensurePlayingSceneVignetteCache(width, height), 0, 0, width, height);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.33)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";
    torches.forEach((torch) => {
      const lightCenterY = torch.screenY - torch.spriteSize * 0.2;
      const drawSize = torch.lightRadius * 2;
      ctx.globalAlpha = 0.88 + torch.flicker * 0.12;
      ctx.drawImage(
        torchLightCache.maskCanvas,
        torch.screenX - drawSize * 0.5,
        lightCenterY - drawSize * 0.5,
        drawSize,
        drawSize,
      );
    });
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    torches.forEach((torch) => {
      const lightCenterY = torch.screenY - torch.spriteSize * 0.2;
      const drawSize = torch.lightRadius * 2;
      ctx.globalAlpha = 0.84 + torch.flicker * 0.26;
      ctx.drawImage(
        torchLightCache.glowCanvas,
        torch.screenX - drawSize * 0.5,
        lightCenterY - drawSize * 0.5,
        drawSize,
        drawSize,
      );
    });
    ctx.restore();

    torches.forEach((torch) => {
      drawPropShadow(
        torch.screenX - torch.spriteSize * 0.22,
        torch.screenY + torch.spriteSize * 0.15,
        torch.spriteSize * 0.085,
        torch.spriteSize * 0.035,
        0.19,
      );
      ctx.save();
      ctx.translate(torch.screenX, torch.screenY);
      ctx.filter = `brightness(${0.86 + torch.flicker * 0.18}) sepia(0.42) saturate(1.1)`;
      drawPixelSprite(
        playingAssets.sideTorch,
        0,
        0,
        16,
        16,
        -torch.spriteSize * 0.5,
        -torch.spriteSize * 0.78,
        torch.spriteSize,
        torch.spriteSize,
      );
      ctx.filter = "none";
      ctx.restore();
    });
  } else {
    ctx.save();
    ctx.fillStyle = "rgba(10, 12, 15, 0.18)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    ctx.drawImage(ensurePlayingSceneVignetteCache(width, height), 0, 0, width, height);
  }

  const drawChestPrompt = (screenX, promptY, size, label) => {
    const pulse = Math.sin(state.time * 0.01) * 0.5 + 0.5;
    const outerRadius = size * (0.24 + pulse * 0.03);
    const innerRadius = size * 0.2;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(10, 14, 16, 0.84)";
    ctx.beginPath();
    ctx.arc(screenX, promptY, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(242, 233, 215, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, promptY, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(224, 124, 65, 0.52)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(screenX, promptY, outerRadius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#f2e9d7";
    ctx.font = 'bold 15px "Avenir Next", "Trebuchet MS", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("E", screenX, promptY + 1);

    ctx.fillStyle = "rgba(242, 233, 215, 0.82)";
    ctx.font = '12px "Avenir Next", "Trebuchet MS", sans-serif';
    ctx.fillText(label, screenX, promptY + outerRadius + 14);
    ctx.restore();
  };

  const drawWorldChest = (box, options = {}) => {
    const screenX = box.worldX - cameraLeft;
    const screenY = box.worldY - cameraTop;
    const size = box.size;
    drawPropShadow(screenX, screenY + size * 0.28, size * 0.24, size * 0.09, 0.22);
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.filter = box.looted
      ? `${options.filterLooted || "brightness(0.72) saturate(0.85)"}`
      : `${options.filterFull || "brightness(0.98) saturate(1.1)"}`;
    if (box.flash > 0) {
      ctx.globalAlpha = 0.78 + box.flash * 0.7;
    }
    drawWholePixelImage(
      playingAssets.miniBox,
      -size * 0.5,
      -size * 0.7,
      size,
      size,
    );
    ctx.filter = "none";
    ctx.restore();

    return { screenX, screenY, size };
  };

  state.game.containers.forEach((container) => {
    const isJade = container.variant === "jade";
    const chestRender = drawWorldChest(container, {
      filterFull: isJade
        ? "hue-rotate(150deg) brightness(0.94) saturate(1.18)"
        : "brightness(0.98) saturate(1.1)",
      filterLooted: isJade
        ? "hue-rotate(150deg) brightness(0.7) saturate(0.88)"
        : "brightness(0.72) saturate(0.85)",
    });
    const distance = Math.hypot(container.worldX - player.worldX, container.worldY - player.worldY);
    if (distance <= container.interactionRadius) {
      drawChestPrompt(
        chestRender.screenX,
        chestRender.screenY - chestRender.size * 0.9,
        chestRender.size,
        "Open Chest",
      );
    }
  });

  if (!state.game.runStarted && state.game.startZone) {
    const startZone = state.game.startZone;
    const pulse = Math.sin(state.time * 0.0044) * 0.5 + 0.5;
    const ringScreenX = startZone.originX - cameraLeft;
    const ringScreenY = startZone.originY - cameraTop;

    ctx.save();
    ctx.beginPath();
    ctx.arc(ringScreenX, ringScreenY, startZone.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(84, 164, 126, 0.08)";
    ctx.fill();

    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(142, 233, 187, ${0.28 + pulse * 0.16})`;
    ctx.beginPath();
    ctx.arc(ringScreenX, ringScreenY, startZone.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(245, 232, 193, ${0.34 + pulse * 0.14})`;
    ctx.beginPath();
    ctx.arc(ringScreenX, ringScreenY, startZone.radius - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (state.game.startZone) {
    const startZone = state.game.startZone;
    const pulse = Math.sin(state.time * 0.0052) * 0.5 + 0.5;
    const markerRadius = Math.max(32, scene.tileSize * TOP_MARKER_RADIUS_SCALE);
    const markerOffset = Math.max(
      scene.tileSize * 6.5,
      Number(startZone.radius ?? 0) + scene.tileSize * TOP_MARKER_OFFSET_FROM_START_ZONE_SCALE + markerRadius,
    );
    const markerScreenX = startZone.originX - cameraLeft;
    const markerScreenY = startZone.originY - markerOffset - cameraTop;

    ctx.save();
    ctx.beginPath();
    ctx.arc(markerScreenX, markerScreenY, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(168, 132, 18, ${0.12 + pulse * 0.1})`;
    ctx.fill();

    ctx.setLineDash([16, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(255, 228, 92, ${0.38 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(markerScreenX, markerScreenY, markerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(255, 244, 178, ${0.18 + pulse * 0.14})`;
    ctx.beginPath();
    ctx.arc(markerScreenX, markerScreenY, Math.max(10, markerRadius - 8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (state.game.monsterSpawnToggleTrigger) {
    const monsterSpawnToggleTrigger = state.game.monsterSpawnToggleTrigger;
    const pulse = Math.sin(state.time * 0.0046) * 0.5 + 0.5;
    const triggerScreenX = monsterSpawnToggleTrigger.originX - cameraLeft;
    const triggerScreenY = monsterSpawnToggleTrigger.originY - cameraTop;
    const spawnsPaused = Boolean(state.game.monsterSpawnsPaused);

    ctx.save();
    ctx.beginPath();
    ctx.arc(triggerScreenX, triggerScreenY, monsterSpawnToggleTrigger.radius, 0, Math.PI * 2);
    ctx.fillStyle = spawnsPaused
      ? "rgba(28, 94, 168, 0.18)"
      : "rgba(24, 76, 122, 0.1)";
    ctx.fill();

    ctx.setLineDash(spawnsPaused ? [] : [16, 10]);
    ctx.lineWidth = spawnsPaused ? 4 : 3;
    ctx.strokeStyle = spawnsPaused
      ? "rgba(118, 203, 255, 0.94)"
      : `rgba(94, 170, 235, ${0.32 + pulse * 0.16})`;
    ctx.beginPath();
    ctx.arc(triggerScreenX, triggerScreenY, monsterSpawnToggleTrigger.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = spawnsPaused
      ? "rgba(215, 241, 255, 0.84)"
      : `rgba(186, 226, 255, ${0.18 + pulse * 0.14})`;
    ctx.beginPath();
    ctx.arc(triggerScreenX, triggerScreenY, Math.max(10, monsterSpawnToggleTrigger.radius - 8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawBossSceneOverlays(cameraLeft, cameraTop, scene, width, height, state.game);

  const visibleDummies = getVisibleDummies(cameraAnchor, dummies || [], width, height);
  const visibleMonsters = getVisibleMonsters(cameraAnchor, monsters || [], width, height, scene);
  drawVisibleMonsters(visibleMonsters, scene);
  drawVisibleDummies(visibleDummies, scene);
  drawUtilityImpactStreaks(player, cameraLeft, cameraTop);

  effects.forEach((effect) => {
    if (!EFFECT_CATALOG[effect.kind]) {
      return;
    }
    const screenX = effect.worldX - cameraLeft;
    const screenY = effect.worldY - cameraTop;
    drawAnimatedEffect(effect, screenX, screenY, scene);
  });

  const spriteScale = player.spriteScale;
  const frameWidth = 16;
  const frameHeight = 32;
  const walkFrame = player.isMoving ? Math.floor(player.animationTime * 10) % 4 : 0;
  const drawWidth = frameWidth * spriteScale;
  const drawHeight = frameHeight * spriteScale;
  const { row: spriteRow, flipX } = resolvePlayerSpriteDirection(player.facing);

  drawUtilityWeaponOrbitLayer(player, scene, drawHeight, "behind");
  drawPropShadow(player.screenX, player.screenY + drawHeight * 0.34, drawWidth * 0.24, drawHeight * 0.12, 0.34);

  ctx.save();
  ctx.translate(player.screenX, player.screenY);
  if (flipX) ctx.scale(-1, 1);
  ctx.filter = "brightness(0.58) sepia(0.48) saturate(0.62)";
  drawPixelSprite(
    playingAssets.playerWalk,
    walkFrame * frameWidth,
    spriteRow * frameHeight,
    frameWidth,
    frameHeight,
    -drawWidth * 0.5,
    -drawHeight * 0.55,
    drawWidth,
    drawHeight,
  );
  ctx.filter = "none";
  ctx.restore();

  drawUtilityWeaponOrbitLayer(player, scene, drawHeight, "front");
  drawPlayerCombatVisuals(player, scene, drawHeight);
  const playerCombatFloats = Array.isArray(player.combatFloats)
    ? player.combatFloats
    : (Array.isArray(player.healFloats) ? player.healFloats : []);
  if (playerCombatFloats.length) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.font = 'bold 14px "Avenir Next", "Trebuchet MS", sans-serif';
    playerCombatFloats.forEach((combatFloat, index) => {
      if (!combatFloat || combatFloat.timer <= 0) {
        return;
      }

      const progress = 1 - clamp(combatFloat.timer / combatFloat.duration, 0, 1);
      const rise = progress * drawHeight * 0.28;
      const driftX = Number(combatFloat.offsetX ?? 0) * (0.3 + progress * 0.7);
      const drawX = player.screenX + driftX;
      const drawY = player.screenY - drawHeight * 0.68 - rise - index * 9;
      const isDamage = combatFloat.kind === "damage";
      const label = `${isDamage ? "-" : "+"}${combatFloat.label ?? formatPlayerHealFloatValue(combatFloat.value)}`;
      ctx.strokeStyle = isDamage ? "rgba(31, 10, 10, 0.84)" : "rgba(11, 21, 15, 0.82)";
      ctx.lineWidth = 4;
      ctx.strokeText(label, drawX, drawY);
      ctx.fillStyle = isDamage ? "rgba(255, 118, 118, 0.96)" : "rgba(128, 255, 172, 0.96)";
      ctx.fillText(label, drawX, drawY);
    });
    ctx.restore();
  }
  if (typeof drawBossSceneTopLayer === "function") {
    drawBossSceneTopLayer(cameraLeft, cameraTop, scene, width, height, state.game);
  }
  ctx.restore();
}

function drawUtilityImpactStreaks(player, cameraLeft, cameraTop) {
  if (!Array.isArray(player?.utilityImpactStreaks) || !player.utilityImpactStreaks.length) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  player.utilityImpactStreaks.forEach((streak) => {
    if (!streak || streak.timer <= 0) {
      return;
    }

    const progress = 1 - clamp(streak.timer / streak.duration, 0, 1);
    const fade = Math.max(0, 1 - progress);
    const centerX = streak.worldX - cameraLeft;
    const centerY = streak.worldY - cameraTop;
    const angle = Number(streak.angle ?? 0);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const normalX = -directionY;
    const normalY = directionX;
    const length = Math.max(5, Number(streak.length ?? 0) * (0.94 + progress * 0.08));
    const halfLength = length * 0.5;
    const width = Math.max(0.28, Number(streak.width ?? 0) * (0.98 - progress * 0.06));
    const halfWidth = width * 0.5;
    const tipLength = Math.max(width * 1.9, length * 0.22);
    const shaftHalfLength = Math.max(0, halfLength - tipLength);

    const startTipX = centerX - directionX * halfLength;
    const startTipY = centerY - directionY * halfLength;
    const endTipX = centerX + directionX * halfLength;
    const endTipY = centerY + directionY * halfLength;
    const innerStartX = centerX - directionX * shaftHalfLength;
    const innerStartY = centerY - directionY * shaftHalfLength;
    const innerEndX = centerX + directionX * shaftHalfLength;
    const innerEndY = centerY + directionY * shaftHalfLength;

    ctx.fillStyle = `rgba(255, 236, 214, ${0.1 + fade * 0.16})`;
    ctx.beginPath();
    ctx.moveTo(startTipX, startTipY);
    ctx.lineTo(innerStartX + normalX * width, innerStartY + normalY * width);
    ctx.lineTo(innerEndX + normalX * width, innerEndY + normalY * width);
    ctx.lineTo(endTipX, endTipY);
    ctx.lineTo(innerEndX - normalX * width, innerEndY - normalY * width);
    ctx.lineTo(innerStartX - normalX * width, innerStartY - normalY * width);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.28 + fade * 0.28})`;
    ctx.beginPath();
    ctx.moveTo(startTipX, startTipY);
    ctx.lineTo(innerStartX + normalX * halfWidth, innerStartY + normalY * halfWidth);
    ctx.lineTo(innerEndX + normalX * halfWidth, innerEndY + normalY * halfWidth);
    ctx.lineTo(endTipX, endTipY);
    ctx.lineTo(innerEndX - normalX * halfWidth, innerEndY - normalY * halfWidth);
    ctx.lineTo(innerStartX - normalX * halfWidth, innerStartY - normalY * halfWidth);
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

function handlePointerMove(event) {
  if (page !== "play" || (typeof isPlaySimulationPaused === "function" && isPlaySimulationPaused())) return;
  const rect = canvas.getBoundingClientRect();
  state.input.mouseX = event.clientX - rect.left;
  state.input.mouseY = event.clientY - rect.top;
  syncPlayerFacing();
}

function handleCanvasMouseDown(event) {
  if (
    page !== "play"
    || event.button !== 0
    || (typeof isPlaySimulationPaused === "function" && isPlaySimulationPaused())
  ) {
    return;
  }
  state.input.attackHeld = true;
  state.input.attackHoldTime = 0;
  state.input.attackHoldStartedAt = performance.now();
  state.input.pendingBeamTap = hasBeamPassiveLoadout();
  state.input.pendingTitanTap = hasTitanGrowthPassiveLoadout();
  if (!state.input.pendingBeamTap && !state.input.pendingTitanTap) {
    triggerMeleeAttack();
  }
}

function handleCanvasMouseUp(event) {
  if (
    page !== "play"
    || event.button !== 0
    || (typeof isPlaySimulationPaused === "function" && isPlaySimulationPaused())
  ) {
    return;
  }
  const beamProfile = currentBeamProfile();
  const holdDuration = (state.input.attackHoldStartedAt ?? 0) > 0
    ? (performance.now() - state.input.attackHoldStartedAt) / 1000
    : Number(state.input.attackHoldTime ?? 0);
  const shouldReleaseTitanFinisher = Boolean(
    state.input.pendingTitanTap
    && holdDuration >= TITAN_GROWTH_TAP_THRESHOLD
    && state.game?.player?.titanGrowth?.active
  );
  const shouldFallbackSlash = Boolean(
    (
      state.input.pendingBeamTap
      && beamProfile
      && !state.game?.player?.beam
      && holdDuration < beamProfile.chargeDuration
    )
    || (
      state.input.pendingTitanTap
      && holdDuration < TITAN_GROWTH_TAP_THRESHOLD
    )
  );
  state.input.attackHeld = false;
  state.input.attackHoldTime = 0;
  state.input.attackHoldStartedAt = 0;
  state.input.pendingBeamTap = false;
  state.input.pendingTitanTap = false;
  let triggeredTitanFinisher = false;
  if (state.game?.player) {
    startPhysicalBoostDecay(state.game.player);
    state.game.player.beam = null;
    state.game.player.beamScreenShake = null;
    state.game.player.spin = null;
    if (shouldReleaseTitanFinisher) {
      triggeredTitanFinisher = triggerTitanGrowthFinisher();
    }
    state.game.player.titanGrowth = null;
  }
  if (shouldFallbackSlash && !triggeredTitanFinisher) {
    triggerMeleeAttack();
  }
}

function updatePlaying(dt) {
  if (page !== "play" || !state.game) return;
  const { player, dummies, effects, monsters } = state.game;
  const controlledBoss = activeControlledBoss(state.game);
  const controllingBoss = Boolean(controlledBoss);

  if (!controllingBoss) {
    updateSpinState(dt);
    updateTitanGrowthState(dt);
    updatePhysicalBoostDecay();
  }
  if (player.screenShake) {
    player.screenShake.timer = Math.max(0, Number(player.screenShake.timer ?? 0) - dt);
    if (player.screenShake.timer <= 0) {
      player.screenShake = null;
    }
  }
  const move = hasOpenHudOverlay() ? { x: 0, y: 0 } : movementVector();
  if (controllingBoss) {
    player.velocityX = 0;
    player.velocityY = 0;
    player.animationTime = 0;
    player.isMoving = false;
  } else {
    updateMoverPhysics(
      player,
      move,
      currentMoveSpeed(player),
      currentMoveAcceleration(player),
      currentMoveDeceleration(player),
      dt,
    );
  }

  maybeStartActiveRun(state.game);
  updateMonsterSpawnToggle(state.game);
  updateBossSummonTrigger(state.game);
  updateBossSummonTestFlow(state.game);
  if (!controllingBoss || state.input.attackHeld || player.beam) {
    updateBeamState(dt);
  }
  const activeBoss = state.game.bossSummonTest?.activeBoss;
  if (activeBoss) {
    updateTitanCentipedePhaseTransition(dt, activeBoss);
    updateTitanCentipedeMovement(dt, state.game);
    updateTitanCentipedeRamAttack(dt, state.game);
    updateTitanCentipedeBossBeam(dt, state.game);
    syncTitanCentipedeTrail(activeBoss);
  } else if (typeof clearTitanCentipedeBeamClash === "function") {
    clearTitanCentipedeBeamClash(state.game);
  }

  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  if (player.swing) {
    player.swing.timer -= dt;
    const progress = clamp(1 - player.swing.timer / player.swing.duration, 0, 1);
    if (player.swing.mode === "dual-cross") {
      player.swing.currentAngleA = (player.facing - player.swing.halfArc) + (player.swing.halfArc * 2 * progress);
      player.swing.currentAngleB = (player.facing + player.swing.halfArc) - (player.swing.halfArc * 2 * progress);
    } else {
      player.swing.currentAngle = (player.facing - player.swing.halfArc) + (player.swing.halfArc * 2 * progress);
    }
    applySwingHits();
    if (player.swing.timer <= 0) {
      player.swing = null;
    }
  }

  if (player.beam) {
    applyBeamHits(dt);
  }
  if (!controllingBoss) {
    applySpinHits(dt);
    applyUtilityWeaponAttacks(dt);
  }
  updateMonsterBehaviors(dt, state.game);

  dummies.forEach((dummy) => {
    dummy.hitFlash = Math.max(0, (dummy.hitFlash || 0) - dt);
    if (dummy.health <= 0) {
      dummy.respawnTimer = Math.max(0, (dummy.respawnTimer ?? (dummy.respawnDelay ?? 0.45)) - dt);
      if (dummy.respawnTimer <= 0) {
        dummy.health = dummy.maxHealth;
        dummy.hitFlash = 0;
        dummy.damageFloat = null;
      }
    }
    if (dummy.damageFloat) {
      dummy.damageFloat.timer -= dt;
      if (dummy.damageFloat.timer <= 0) {
        dummy.damageFloat = null;
      }
    }
  });

  (monsters || []).forEach((monster) => {
    monster.hitFlash = Math.max(0, (monster.hitFlash || 0) - dt);
    if (monster.damageFloat) {
      monster.damageFloat.timer -= dt;
      if (monster.damageFloat.timer <= 0) {
        monster.damageFloat = null;
      }
    }
  });

  updateMonsterSpawnDirector(dt, state.game);

  const playerCombatFloatsForTick = Array.isArray(player.combatFloats)
    ? player.combatFloats
    : (Array.isArray(player.healFloats) ? player.healFloats : null);
  if (playerCombatFloatsForTick) {
    for (let index = playerCombatFloatsForTick.length - 1; index >= 0; index -= 1) {
      const combatFloat = playerCombatFloatsForTick[index];
      if (!combatFloat) {
        playerCombatFloatsForTick.splice(index, 1);
        continue;
      }

      combatFloat.timer -= dt;
      if (combatFloat.timer <= 0) {
        playerCombatFloatsForTick.splice(index, 1);
      }
    }
  }

  if (Array.isArray(player.utilityImpactStreaks)) {
    for (let index = player.utilityImpactStreaks.length - 1; index >= 0; index -= 1) {
      const streak = player.utilityImpactStreaks[index];
      if (!streak) {
        player.utilityImpactStreaks.splice(index, 1);
        continue;
      }
      streak.timer -= dt;
      if (streak.timer <= 0) {
        player.utilityImpactStreaks.splice(index, 1);
      }
    }
  }

  for (let index = effects.length - 1; index >= 0; index -= 1) {
    effects[index].timer -= dt;
    if (effects[index].timer <= 0) {
      effects.splice(index, 1);
    }
  }

  state.game.containers.forEach((container) => {
    container.flash = Math.max(0, container.flash - dt);
  });
  player.health = clamp(player.health + Number(player.healthRegen) * dt, 0, player.maxHealth);
  tickPlayerManaRecovery(player, dt);
  updateDpsMetric();
  if (state.game.runStarted) {
    state.game.elapsed += dt;
  }
  renderPlayingHud();
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scaleX = width > 0 ? canvas.width / width : 1;
  const scaleY = height > 0 ? canvas.height / height : 1;
  ctx.setTransform(scaleX || 1, 0, 0, scaleY || 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  if (page === "play" && state.game) {
    drawPlayingScene(width, height);
    return;
  }
  drawBackdrop(width, height, state.time);
}

function update(dt) {
  if (page === "play" && state.game && (typeof isPlaySimulationPaused === "function" && isPlaySimulationPaused())) {
    renderPlayingHud();
    return;
  }
  state.time += dt * 1000;
  updatePlaying(dt);
}

function step(ms) {
  const dt = ms / 1000;
  update(dt);
  draw();
}

let lastFrame = performance.now();
function frame(now) {
  const delta = Math.min(now - lastFrame, 32);
  lastFrame = now;
  step(delta);
  window.requestAnimationFrame(frame);
}

let fullscreenTogglePromise = null;

function fullscreenElement() {
  return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement
    || null;
}

function requestDocumentFullscreen() {
  const request =
    document.documentElement.requestFullscreen
    || document.documentElement.webkitRequestFullscreen
    || document.documentElement.msRequestFullscreen;
  if (typeof request !== "function") {
    return Promise.reject(new Error("Fullscreen is not supported"));
  }
  return Promise.resolve(request.call(document.documentElement));
}

function exitDocumentFullscreen() {
  const exit =
    document.exitFullscreen
    || document.webkitExitFullscreen
    || document.msExitFullscreen;
  if (typeof exit !== "function") {
    return Promise.resolve();
  }
  return Promise.resolve(exit.call(document));
}

function isEditableKeyboardTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }

  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}

function isFullscreenToggleKeyEvent(event) {
  if (event.defaultPrevented || event.repeat) {
    return false;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  if (isEditableKeyboardTarget(event.target)) {
    return false;
  }

  return event.code === "KeyF" || String(event.key || "").toLowerCase() === "f";
}

function toggleFullscreen() {
  if (fullscreenTogglePromise) {
    return fullscreenTogglePromise;
  }

  const nextAction = fullscreenElement()
    ? exitDocumentFullscreen()
    : requestDocumentFullscreen();

  fullscreenTogglePromise = Promise.resolve(nextAction)
    .catch(() => {})
    .finally(() => {
      fullscreenTogglePromise = null;
    });

  return fullscreenTogglePromise;
}

function handleKeyDown(event) {
  if (isFullscreenToggleKeyEvent(event)) {
    event.preventDefault();
    toggleFullscreen();
    return;
  }

  if (event.key === "Escape" && fullscreenElement()) {
    event.preventDefault();
    exitDocumentFullscreen();
    return;
  }

  if (page === "play") {
    if (state.hud.starterWeaponOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
      }
      return;
    }

    if (hasOpenHudOverlay()) {
      if (event.code === "KeyE" && state.hud.inventoryOpen) {
        openLootBox();
        event.preventDefault();
        return;
      }

      if (event.key === "Escape") {
        if (state.hud.settingsOpen) {
          toggleHudSettings(false);
        } else if (state.hud.statsOpen) {
          toggleHudStats(false);
        } else if (state.hud.inventoryOpen) {
          toggleHudInventory(false);
        }
        event.preventDefault();
      }
      return;
    }

    const moveInput = normalizeMoveInput(event);
    if (moveInput) {
      state.input.pressed.add(moveInput);
      event.preventDefault();
      return;
    }

    if (handleBossPhaseHotkey(event, state.game)) {
      event.preventDefault();
      return;
    }

    if (event.code === "KeyB") {
      if (handleBossControlInteract(state.game)) {
        event.preventDefault();
        return;
      }
    }

    if (bossBeamControlKey(event) && state.game?.bossSummonTest?.controllingBoss) {
      state.input.bossBeamHeld = true;
      event.preventDefault();
      return;
    }

    if (event.code === "KeyE") {
      openLootBox();
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      if (state.hud.settingsOpen) {
        toggleHudSettings(false);
      } else if (state.hud.statsOpen) {
        toggleHudStats(false);
      } else if (state.hud.inventoryOpen) {
        toggleHudInventory(false);
      } else {
        cancelPlayingSessionWarmup();
        state.input.pressed.clear();
        state.input.bossBeamHeld = false;
        state.input.attackHeld = false;
        state.input.attackHoldTime = 0;
        state.input.attackHoldStartedAt = 0;
        state.input.pendingBeamTap = false;
        state.input.pendingTitanTap = false;
        if (state.game?.player) {
          state.game.player.beam = null;
          state.game.player.spin = null;
          state.game.player.titanGrowth = null;
          resetPhysicalBoostStacks(state.game.player);
        }
        state.game = null;
        goToPage("select");
      }
    }
    return;
  }

  if (page === "main") {
    if (event.key === "Enter") {
      goToPage("select");
      return;
    }
    if (event.key === "Escape" && mainSettingsPanel && !mainSettingsPanel.hidden) {
      mainSettingsPanel.hidden = true;
      if (mainMenuStatus) {
        mainMenuStatus.textContent = "Feature coming soon.";
      }
    }
    return;
  }

  if (page === "menu") {
    if (normalizeMoveInput(event) === "move_down") {
      cycleSlot(1);
      return;
    }
    if (normalizeMoveInput(event) === "move_up") {
      cycleSlot(-1);
      return;
    }
    if (event.key === "Enter") {
      const slot = currentSlot();
      if (slot.occupied) {
        goToPage("play");
      } else {
        goToPage("create");
      }
    }
    return;
  }

  if (page === "create") {
    if (event.key === "Escape") {
      goToPage("select");
      return;
    }
    if (event.key === "Enter") {
      createCharacter();
      goToPage("ritual");
    }
    return;
  }

  if (page === "ritual") {
    if (event.key === "Escape") {
      goToPage("create");
      return;
    }
    if (event.key.toLowerCase() === "r") {
      rerollRitualSkills();
      renderRitualPage();
      return;
    }
    if (event.key === "Enter") {
      const slot = currentSlot();
      const prep = ensurePrepForSlot(slot);
      prep.ritualAccepted = true;
      prep.buildSealed = true;
      slot.skills = prepSkills(prep).map((skill) => skill.name);
      slot.buildType = buildTypeFromPrep(prep);
      savePrep();
      saveSlots();
      goToPage("play");
    }
    return;
  }

  if (page === "setup") {
    goToPage(currentSlot().occupied ? "ritual" : "create");
    return;
  }

  if (page === "start-run") {
    goToPage(currentSlot().occupied ? "ritual" : "create");
    return;
  }

  if (page === "briefing") {
    goToPage(currentSlot().occupied ? "ritual" : "select");
  }
}

function handleKeyUp(event) {
  if (page !== "play") return;
  if (bossBeamControlKey(event)) {
    state.input.bossBeamHeld = false;
    return;
  }
  const moveInput = normalizeMoveInput(event);
  if (moveInput) {
    state.input.pressed.delete(moveInput);
  }
}
