const SPIN_MANA_COST_PER_SECOND = 1;
const SPIN_SPEED_GAIN_PER_MANA = 1;
const SPIN_BASE_RATE = Math.PI * 2.6;
const SPIN_CHARGE_DURATION =2;
const ACTIVE_TWIN_SPIN_RANGE_MULTIPLIER = 1.25;
const BOOST_STACK_DECAY_SECONDS = 5;
const DPS_SAMPLE_WINDOW_SECONDS = 3;
const UTILITY_WEAPON_ORBIT_RATE = 0.0018;
const UTILITY_WEAPON_ORBIT_ROTATION = Math.PI * 1.75;
const UTILITY_WEAPON_THRUST_DEFAULT_DISTANCE_MULTIPLIER = 30;
const UTILITY_WEAPON_THRUST_TIP_OFFSET_RATIO = 0.38;
const UTILITY_WEAPON_THRUST_MIN_SPEED = 720;
const TITAN_GROWTH_TAP_THRESHOLD = 0.18;
const UTILITY_WEAPON_TWIN_SPIN_DEFAULT_BLADE_COUNT = 3;
const UTILITY_WEAPON_TWIN_SPIN_BLADE_TOLERANCE = Math.PI * 0.28;
const UTILITY_WEAPON_TWIN_SPIN_LOCAL_SPEED_CAP = 4;
const UTILITY_WEAPON_AFTERIMAGE_DURATION = 0.09;
const UTILITY_WEAPON_AFTERIMAGE_MIN_STRENGTH = 0.18;
const UTILITY_WEAPON_AFTERIMAGE_MAX_COUNT = 5;

function meleeRangeFromWeapon(scene, weapon) {
  if (!scene || !weapon?.melee) {
    return 0;
  }
  return Number((scene.tileSize * weapon.melee.rangeScale).toFixed(2));
}

function weaponVisualRangeValue(scene, player, weapon, { multiplier = 1, skillLike = false, minimum = 0, chapter = state.game?.chapter ?? 1, includeTemporaryGrowth = true } = {}) {
  if (!scene || !weapon?.melee) {
    return 0;
  }

  const baseRange = meleeRangeFromWeapon(scene, weapon);
  const safeMultiplier = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
  const temporaryGrowthScale = skillLike || !includeTemporaryGrowth
    ? 1
    : titanGrowthRangeScale(player, weapon);
  const rangeScale = skillLike
    ? weaponSkillRangeScale(player, chapter)
    : weaponEquippedRangeScale(state.game);
  return Number((Math.max(minimum, baseRange * safeMultiplier * rangeScale * temporaryGrowthScale)).toFixed(2));
}

function weaponActionSpeedScale(player) {
  if (!player) {
    return 1;
  }

  return Math.max(0.25, Number(player.actionSpeed ?? player.attackSpeed ?? 1) || 1);
}

function weaponSkillRangeScale(player, chapter = state.game?.chapter ?? 1) {
  if (!player) {
    return 1;
  }

  return Math.max(
    0.25,
    Number(
      typeof playerSkillRangeMultiplier === "function"
        ? playerSkillRangeMultiplier(player, chapter)
        : 1,
    ) || 1,
  );
}

function weaponEquippedRangeScale(game = state.game) {
  return Math.max(
    0.25,
    1 + (
      typeof getEquippedArtifactPassiveEffectTotal === "function"
        ? getEquippedArtifactPassiveEffectTotal("skillRangeMultiplierBonus", game)
        : 0
    ),
  );
}

function weaponDamageValue(player, weapon, { multiplier = 1, minimum = 1 } = {}) {
  const playerAttack = Math.max(0, Number(player?.attack ?? 0));
  const weaponDamage = Math.max(0, Number(weapon?.damageBonus ?? 0));
  const safeMultiplier = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
  return Math.max(minimum, Math.round((playerAttack + weaponDamage) * safeMultiplier));
}

function weaponRangeValue(scene, player, weapon, { multiplier = 1, skillLike = false, minimum = 0, chapter = state.game?.chapter ?? 1 } = {}) {
  if (!scene || !weapon?.melee) {
    return 0;
  }

  const visualRange = weaponVisualRangeValue(scene, player, weapon, {
    multiplier,
    skillLike,
    minimum,
    chapter,
  });
  const hitRangeScale = skillLike
    ? 1
    : Math.max(1, Number(weapon.melee?.hitRangeScale ?? 1) || 1);
  return Number((Math.max(minimum, visualRange * hitRangeScale)).toFixed(2));
}

function weaponScalingTags(weapon, { skillLike = false } = {}) {
  if (!weapon) {
    return [];
  }

  const tags = ["Attack", "Speed"];
  if (skillLike || weapon.utilityCombat) {
    tags.push("Control");
  }
  return tags;
}


function shortestAngleDelta(source, target) {
  let delta = source - target;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function resetPhysicalBoostStacks(player) {
  if (!player) {
    return;
  }
  player.physicalBoostStacks = 0;
  player.spinManaProgress = 0;
  player.physicalBoostExpiresAt = 0;
  syncPhysicalEnhancementStats(player);
}

function startPhysicalBoostDecay(player) {
  if (!player || (player.physicalBoostStacks ?? 0) <= 0) {
    return;
  }
  player.physicalBoostExpiresAt = performance.now() + (BOOST_STACK_DECAY_SECONDS * 1000);
}

function getWieldedWeapons(game = state.game) {
  if (!game?.inventory) {
    const single = equippedWeapon(game);
    return single ? [single] : [];
  }

  const slottedWeapons = (game.inventory.weaponSlots || [])
    .map((weaponId) => getWeaponById(weaponId))
    .filter(Boolean);

  if (slottedWeapons.length >= 2) {
    return slottedWeapons.slice(0, 2);
  }

  const active = equippedWeapon(game);
  return active ? [active] : [];
}

function hasDualWield(game = state.game) {
  return getWieldedWeapons(game).length >= 2;
}

function getWeaponPassiveSources(game = state.game) {
  if (!game?.inventory) {
    return [];
  }

  const handSources = (game.inventory.weaponSlots || [])
    .map((weaponId, slotIndex) => {
      const weapon = getWeaponById(weaponId);
      return weapon?.passive && isWeaponPassiveActive(weapon.passive) ? {
        weapon,
        passive: weapon.passive,
        passiveId: weapon.passive.id,
        location: "hand",
        slotIndex,
      } : null;
    })
    .filter(Boolean);

  const utilitySources = (game.inventory.utilitySlots || [])
    .map((itemId, slotIndex) => {
      const weapon = getWeaponById(itemId);
      return weapon?.passive && isWeaponPassiveActive(weapon.passive) ? {
        weapon,
        passive: weapon.passive,
        passiveId: weapon.passive.id,
        location: "utility",
        slotIndex,
      } : null;
    })
    .filter(Boolean);

  return [...handSources, ...utilitySources];
}

function getTitanGrowthPassiveWeapon(game = state.game) {
  return getWieldedWeapons(game).find((weapon) => (
    weapon?.passive?.id === TITAN_GROWTH_PASSIVE_ID
    && isWeaponPassiveActive(weapon.passive)
    && weapon?.titanGrowthSkill?.enabled
  )) || null;
}

function getTitanGrowthPassiveWeapons(game = state.game) {
  return getWieldedWeapons(game).filter((weapon) => (
    weapon?.passive?.id === TITAN_GROWTH_PASSIVE_ID
    && isWeaponPassiveActive(weapon.passive)
    && weapon?.titanGrowthSkill?.enabled
  ));
}

function hasTitanGrowthPassiveLoadout(game = state.game) {
  return Boolean(getTitanGrowthPassiveWeapon(game));
}

function titanGrowthRangeScale(player, weapon) {
  if (!player || !weapon?.titanGrowthSkill?.enabled) {
    return 1;
  }

  const titanGrowth = player.titanGrowth;
  if (!titanGrowth || titanGrowth.weaponId !== weapon.id || titanGrowth.active !== true) {
    return 1;
  }

  return Math.max(1, Number(titanGrowth.rangeMultiplier ?? 1) || 1);
}

function getWeaponPassiveEffectTotal(passiveId, effectKey, locations = ["hand", "utility"], game = state.game) {
  if (!passiveId || !effectKey) {
    return 0;
  }

  return getWeaponPassiveSources(game)
    .filter((source) => source.passiveId === passiveId && locations.includes(source.location))
    .reduce((total, source) => {
      const effectValue = Number(source.passive?.effects?.[source.location]?.[effectKey] ?? 0);
      return total + (Number.isFinite(effectValue) ? effectValue : 0);
    }, 0);
}

function countWeaponPassiveSources(passiveId, locations = ["hand", "utility"], game = state.game) {
  if (!passiveId) {
    return 0;
  }

  return getWeaponPassiveSources(game)
    .filter((source) => source.passiveId === passiveId && locations.includes(source.location))
    .length;
}

function hasSpinPassiveLoadout(game = state.game) {
  return hasDualWield(game) && getWeaponPassiveEffectTotal(
    SPIN_PASSIVE_ID,
    "enablesNativeTrigger",
    ["hand"],
    game,
  ) > 0;
}

function getOrbitingUtilityWeapons(game = state.game) {
  if (!game?.inventory?.utilitySlots) {
    return [];
  }

  return game.inventory.utilitySlots
    .map((itemId, index) => {
      const weapon = getWeaponById(itemId);
      return weapon ? { weapon, slotIndex: index } : null;
    })
    .filter(Boolean);
}

function buildUtilityWeaponHomeEntries(player, scene, drawHeight, game = state.game) {
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const orbitingWeapons = getOrbitingUtilityWeapons(game);
  const orbitCount = orbitingWeapons.length;
  if (!orbitCount) {
    return [];
  }

  const orbitRadius = scene.tileSize * 0.62;
  const orbitBaseSize = Math.max(scene.tileSize * 0.58, drawHeight * 0.7);
  const orbitPhase = state.time * UTILITY_WEAPON_ORBIT_RATE;

  return orbitingWeapons
    .map(({ weapon, slotIndex }, index) => {
      const angle = orbitPhase + ((Math.PI * 2 * index) / orbitCount);
      const depth = Math.sin(angle);
      return {
        weapon,
        slotIndex,
        angle,
        depth,
        key: `utility:${slotIndex}`,
        worldX: combatAnchor.worldX + Math.cos(angle) * orbitRadius,
        worldY: combatAnchor.worldY + Math.sin(angle) * orbitRadius - drawHeight * 0.08,
        screenX: combatAnchor.screenX + Math.cos(angle) * orbitRadius,
        screenY: combatAnchor.screenY + Math.sin(angle) * orbitRadius - drawHeight * 0.08,
        size: orbitBaseSize * (depth < 0 ? 0.9 : 1),
      };
    });
}

function getUtilityWeaponAttackStateStore(player) {
  if (!player?.utilityWeaponAttackStates || typeof player.utilityWeaponAttackStates !== "object") {
    player.utilityWeaponAttackStates = {};
  }
  return player.utilityWeaponAttackStates;
}

function isHostileCombatTarget(target) {
  return Boolean(
    target?.hostile === true
    || target?.entity?.hostile === true
    || target?.kind === "monster",
  );
}

function getHostileCombatTargets(game = state.game) {
  return getCombatTargets(game).filter((target) => isCombatTargetAlive(target) && isHostileCombatTarget(target));
}

function pointInsideExpandedRect(x, y, left, top, right, bottom, padding = 0) {
  return (
    x >= left - padding
    && x <= right + padding
    && y >= top - padding
    && y <= bottom + padding
  );
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) {
    return Math.hypot(px - x1, py - y1);
  }

  const projection = clamp((((px - x1) * dx) + ((py - y1) * dy)) / lengthSquared, 0, 1);
  const closestX = x1 + dx * projection;
  const closestY = y1 + dy * projection;
  return Math.hypot(px - closestX, py - closestY);
}

function segmentIntersectsExpandedRect(x1, y1, x2, y2, left, top, right, bottom, padding = 0) {
  const expandedLeft = left - padding;
  const expandedTop = top - padding;
  const expandedRight = right + padding;
  const expandedBottom = bottom + padding;

  if (
    pointInsideExpandedRect(x1, y1, expandedLeft, expandedTop, expandedRight, expandedBottom)
    || pointInsideExpandedRect(x2, y2, expandedLeft, expandedTop, expandedRight, expandedBottom)
  ) {
    return true;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const checks = [
    [-dx, x1 - expandedLeft],
    [dx, expandedRight - x1],
    [-dy, y1 - expandedTop],
    [dy, expandedBottom - y1],
  ];

  for (const [p, q] of checks) {
    if (Math.abs(p) <= 0.000001) {
      if (q < 0) {
        return false;
      }
      continue;
    }

    const ratio = q / p;
    if (p < 0) {
      if (ratio > tMax) {
        return false;
      }
      if (ratio > tMin) {
        tMin = ratio;
      }
    } else {
      if (ratio < tMin) {
        return false;
      }
      if (ratio < tMax) {
        tMax = ratio;
      }
    }
  }

  return true;
}

function segmentHitsCombatTarget(target, startX, startY, endX, endY, padding = 0) {
  if (target?.hitbox) {
    return segmentIntersectsExpandedRect(
      startX,
      startY,
      endX,
      endY,
      target.hitbox.left,
      target.hitbox.top,
      target.hitbox.right,
      target.hitbox.bottom,
      padding,
    );
  }

  const entity = target?.entity ?? target;
  const radius = Math.max(0, Number(target?.radius ?? entity?.radius ?? 0)) + padding;
  return pointToSegmentDistance(
    target?.worldX ?? entity?.worldX ?? 0,
    target?.worldY ?? entity?.worldY ?? 0,
    startX,
    startY,
    endX,
    endY,
  ) <= radius;
}

function normalizeDirection(dx, dy, fallbackX = 1, fallbackY = 0) {
  const length = Math.hypot(dx, dy);
  if (length <= 0.0001) {
    const fallbackLength = Math.hypot(fallbackX, fallbackY) || 1;
    return {
      x: fallbackX / fallbackLength,
      y: fallbackY / fallbackLength,
    };
  }
  return {
    x: dx / length,
    y: dy / length,
  };
}

function rotateVector(x, y, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: (x * cosine) - (y * sine),
    y: (x * sine) + (y * cosine),
  };
}

function resolveMeleeSwingBladePose(combatAnchor, weapon, angle, swordDistance, swordSize) {
  if (!combatAnchor || !weapon) {
    return null;
  }

  const rotation = angle + Number(weapon.melee?.rotationOffsetRadians ?? Math.PI * 0.25);
  const x = combatAnchor.screenX + Math.cos(angle) * swordDistance;
  const y = combatAnchor.screenY + Math.sin(angle) * swordDistance;
  const tipOffset = rotateVector(
    swordSize * Number(weapon.melee?.tipLocalXScale ?? 0.34),
    swordSize * Number(weapon.melee?.tipLocalYScale ?? -0.46),
    rotation,
  );

  return {
    x,
    y,
    rotation,
    swordSize,
    tipX: x + tipOffset.x,
    tipY: y + tipOffset.y,
  };
}

function resolveDisplayedMeleeBladeMetrics(scene, player, weapon, visualRange) {
  const swordSize = Math.max(scene.tileSize * 0.74, visualRange * 0.54);
  const baseVisualRange = weaponVisualRangeValue(scene, player, weapon, {
    includeTemporaryGrowth: false,
  });
  const baseSwordDistance = Math.max(0, baseVisualRange * 0.72);
  const extraVisualRange = Math.max(0, visualRange - baseVisualRange);
  const outwardDistanceRatio = clamp(
    Number(weapon?.titanGrowthSkill?.outwardDistanceRatio ?? 1),
    0,
    1,
  );
  const swordDistance = Math.max(
    0,
    baseSwordDistance + (extraVisualRange * 0.72 * outwardDistanceRatio),
  );

  return {
    swordSize,
    swordDistance,
  };
}

function resolveSpinBladeMetrics(scene, visualRange, weapon) {
  if (!scene || !weapon?.image?.complete) {
    return {
      swordSize: Math.max(scene?.tileSize ? scene.tileSize * 0.74 : 0, visualRange * 0.54),
      swordDistance: Math.max(0, visualRange * 0.74),
      tipRadius: Math.max(0, visualRange),
    };
  }

  const swordSize = Math.max(scene.tileSize * 0.74, visualRange * 0.54);
  const swordDistance = Math.max(0, visualRange * 0.74);
  const samplePose = resolveMeleeSwingBladePose(
    { screenX: 0, screenY: 0 },
    weapon,
    0,
    swordDistance,
    swordSize,
  );
  return {
    swordSize,
    swordDistance,
    tipRadius: samplePose ? Math.hypot(samplePose.tipX, samplePose.tipY) : Math.max(swordDistance, visualRange),
  };
}

function getPlayerUtilityImpactStreaks(player) {
  if (!player) {
    return [];
  }
  if (!Array.isArray(player.utilityImpactStreaks)) {
    player.utilityImpactStreaks = [];
  }
  return player.utilityImpactStreaks;
}

function queueUtilityImpactStreak(player, worldX, worldY, angle, {
  length = 0,
  width = 0,
  duration = 0.18,
} = {}) {
  if (
    !player
    || !Number.isFinite(worldX)
    || !Number.isFinite(worldY)
    || !Number.isFinite(angle)
  ) {
    return;
  }

  const streaks = getPlayerUtilityImpactStreaks(player);
  streaks.push({
    worldX,
    worldY,
    angle,
    length: Math.max(10, Number(length ?? 0) || 0),
    width: Math.max(2, Number(width ?? 0) || 0),
    timer: Math.max(0.05, Number(duration ?? 0.18) || 0.18),
    duration: Math.max(0.05, Number(duration ?? 0.18) || 0.18),
  });
  if (streaks.length > 36) {
    streaks.splice(0, streaks.length - 36);
  }
}

function queuePlayerAttackImpactStreak(player, scene, target, angle, {
  lengthScale = 0.68,
  widthScale = 0.02,
  duration = 0.05,
} = {}) {
  if (!player || !scene || !target || !Number.isFinite(angle)) {
    return;
  }

  const impactX = Number(target.worldX ?? target.entity?.worldX ?? 0);
  const impactY = Number(target.worldY ?? target.entity?.worldY ?? 0);
  if (!Number.isFinite(impactX) || !Number.isFinite(impactY)) {
    return;
  }

  queueUtilityImpactStreak(player, impactX, impactY, angle, {
    length: scene.tileSize * lengthScale,
    width: scene.tileSize * widthScale,
    duration,
  });
}

function findNearestCombatTarget(targets, worldX, worldY, maxDistance = Infinity) {
  let nearestTarget = null;
  let nearestDistance = Infinity;
  const safeMaxDistance = Number.isFinite(Number(maxDistance)) ? Math.max(0, Number(maxDistance)) : Infinity;

  targets.forEach((target) => {
    const distance = combatTargetDistanceFromPoint(target, worldX, worldY);
    if (distance > safeMaxDistance) {
      return;
    }
    if (distance < nearestDistance) {
      nearestTarget = target;
      nearestDistance = distance;
    }
  });

  return nearestTarget;
}

function collectReservedUtilityTargetKeys(attackStates, hostileTargets, excludeAttackKey = "") {
  const hostileTargetKeys = new Set((hostileTargets || []).map((target) => getCombatTargetKey(target)));
  return Object.entries(attackStates || {}).reduce((reservedKeys, [attackKey, attackState]) => {
    if (attackKey === excludeAttackKey) {
      return reservedKeys;
    }

    if (!attackState || (attackState.phase !== "attack" && attackState.phase !== "return")) {
      return reservedKeys;
    }

    const lockedTargetKey = typeof attackState.lockedTargetKey === "string" ? attackState.lockedTargetKey : "";
    if (!lockedTargetKey || !hostileTargetKeys.has(lockedTargetKey)) {
      return reservedKeys;
    }

    reservedKeys.add(lockedTargetKey);
    return reservedKeys;
  }, new Set());
}

function findNearestAvailableCombatTarget(
  targets,
  worldX,
  worldY,
  maxDistance = Infinity,
  reservedTargetKeys = null,
) {
  const reservedKeys = reservedTargetKeys instanceof Set ? reservedTargetKeys : null;
  const availableTargets = reservedKeys?.size
    ? targets.filter((target) => !reservedKeys.has(getCombatTargetKey(target)))
    : targets;

  return findNearestCombatTarget(
    availableTargets.length ? availableTargets : targets,
    worldX,
    worldY,
    maxDistance,
  );
}

function resolveUtilityWeaponAttackDirection(entry, combatAnchor, target = null) {
  const fallbackDirection = normalizeDirection(
    entry.worldX - combatAnchor.worldX,
    entry.worldY - combatAnchor.worldY,
    Math.cos(entry.angle),
    Math.sin(entry.angle),
  );

  if (!target) {
    return fallbackDirection;
  }

  return normalizeDirection(
    target.worldX - entry.worldX,
    target.worldY - entry.worldY,
    fallbackDirection.x,
    fallbackDirection.y,
  );
}

function tickUtilityWeaponTimerMap(attackState, key, dt) {
  if (!attackState) {
    return;
  }

  if (!attackState[key] || typeof attackState[key] !== "object") {
    attackState[key] = {};
    return;
  }

  Object.keys(attackState[key]).forEach((targetKey) => {
    const nextTimer = Math.max(0, Number(attackState[key][targetKey] ?? 0) - dt);
    if (nextTimer <= 0) {
      delete attackState[key][targetKey];
      return;
    }
    attackState[key][targetKey] = nextTimer;
  });
}

function tickUtilityWeaponHitTimers(attackState, dt) {
  tickUtilityWeaponTimerMap(attackState, "hitTimers", dt);
}

function tickUtilityWeaponSpinHitTimers(attackState, dt) {
  tickUtilityWeaponTimerMap(attackState, "spinHitTimers", dt);
}

function utilityTwinSpinStackCount(attackState) {
  return Math.max(0, Math.floor(Number(attackState?.utilityTwinSpinStacks ?? 0)));
}

function startUtilityTwinSpinStackDecay(attackState) {
  if (!attackState || utilityTwinSpinStackCount(attackState) <= 0) {
    return;
  }
  attackState.utilityTwinSpinExpiresAt = performance.now() + (BOOST_STACK_DECAY_SECONDS * 1000);
}

function tickUtilityTwinSpinStackDecay(attackState) {
  if (!attackState || utilityTwinSpinStackCount(attackState) <= 0) {
    if (attackState) {
      attackState.utilityTwinSpinExpiresAt = 0;
      attackState.utilityTwinSpinManaProgress = 0;
    }
    return;
  }

  const expiresAt = Number(attackState.utilityTwinSpinExpiresAt ?? 0);
  if (expiresAt > 0 && performance.now() >= expiresAt) {
    attackState.utilityTwinSpinStacks = 0;
    attackState.utilityTwinSpinManaProgress = 0;
    attackState.utilityTwinSpinExpiresAt = 0;
  }
}

function applyUtilityTwinSpinLocalStacks(attackState, manaSpent, profile) {
  if (!attackState || !profile || !Number.isFinite(manaSpent) || manaSpent <= 0) {
    return;
  }

  const stacksPerMana = Math.max(0, Number(profile.twinSpinLocalStackPerMana ?? 1) || 0);
  if (stacksPerMana <= 0) {
    return;
  }

  attackState.utilityTwinSpinManaProgress = clamp(
    Number(attackState.utilityTwinSpinManaProgress ?? 0) + (manaSpent * stacksPerMana),
    0,
    99999,
  );
  const gainedStacks = Math.floor(attackState.utilityTwinSpinManaProgress);
  if (gainedStacks > 0) {
    attackState.utilityTwinSpinStacks = utilityTwinSpinStackCount(attackState) + gainedStacks;
    attackState.utilityTwinSpinManaProgress -= gainedStacks;
  }
  attackState.utilityTwinSpinExpiresAt = 0;
}

function utilityTwinSpinLocalSpeedMultiplier(attackState, profile) {
  const stackCount = utilityTwinSpinStackCount(attackState);
  const perStackBonus = Math.max(0, Number(profile?.twinSpinStackSpeedBonus ?? 0) || 0);
  return clamp(
    1 + (stackCount * perStackBonus),
    1,
    UTILITY_WEAPON_TWIN_SPIN_LOCAL_SPEED_CAP,
  );
}

function resolveUtilityWeaponTipAnchor(entry, tipOffset, rotation = UTILITY_WEAPON_ORBIT_ROTATION) {
  const baseTipOffset = Math.max(
    0,
    Number(tipOffset) || (entry?.size ?? 0) * UTILITY_WEAPON_THRUST_TIP_OFFSET_RATIO,
  );
  return rotateVector(
    0,
    -baseTipOffset,
    rotation - UTILITY_WEAPON_ORBIT_ROTATION,
  );
}

function resolveUtilityWeaponAttackTransform(entry, scene, attackState, tipWorldX, tipWorldY) {
  const tipOffset = Math.max(
    scene.tileSize * 0.18,
    Number(attackState?.tipOffset ?? (entry.size * UTILITY_WEAPON_THRUST_TIP_OFFSET_RATIO)),
  );
  const directionX = Number(attackState?.directionX ?? Math.cos(entry.angle));
  const directionY = Number(attackState?.directionY ?? Math.sin(entry.angle));
  const directionAngle = Math.atan2(directionY, directionX);
  const rotation = UTILITY_WEAPON_ORBIT_ROTATION + directionAngle + (Math.PI * 0.5);
  const tipAnchor = resolveUtilityWeaponTipAnchor(entry, tipOffset, rotation);

  return {
    tipOffset,
    directionX,
    directionY,
    directionAngle,
    rotation,
    tipAnchor,
    centerWorldX: Number(tipWorldX) - tipAnchor.x,
    centerWorldY: Number(tipWorldY) - tipAnchor.y,
  };
}

function tickUtilityWeaponAfterimage(attackState, dt) {
  if (!attackState) {
    return;
  }

  attackState.afterimageTimer = Math.max(0, Number(attackState.afterimageTimer ?? 0) - dt);
  if (attackState.afterimageTimer <= 0) {
    attackState.afterimageStrength = 0;
    return;
  }

  attackState.afterimageStrength = clamp(
    Number(attackState.afterimageStrength ?? 0) * Math.pow(0.16, dt / UTILITY_WEAPON_AFTERIMAGE_DURATION),
    0,
    1,
  );
}

function refreshUtilityWeaponAfterimage(attackState, strength, directionX, directionY) {
  if (!attackState) {
    return;
  }

  const safeStrength = clamp(Number(strength) || 0, 0, 1);
  if (safeStrength <= UTILITY_WEAPON_AFTERIMAGE_MIN_STRENGTH) {
    return;
  }

  const direction = normalizeDirection(
    directionX,
    directionY,
    Number(attackState.directionX ?? 1),
    Number(attackState.directionY ?? 0),
  );
  attackState.afterimageTimer = UTILITY_WEAPON_AFTERIMAGE_DURATION;
  attackState.afterimageStrength = Math.max(
    safeStrength,
    Number(attackState.afterimageStrength ?? 0),
  );
  attackState.afterimageDirectionX = direction.x;
  attackState.afterimageDirectionY = direction.y;
}

function utilityWeaponTargetPassPadding(target, scene, tipRadius = 0, minimumPassPadding = 0) {
  const minimumPadding = Math.max(0, Number(minimumPassPadding) || 0);
  if (target?.hitbox) {
    return Math.max(
      minimumPadding,
      scene.tileSize * 0.24,
      Math.max(target.hitbox.width, target.hitbox.height) * 0.76 + Number(tipRadius || 0),
    );
  }

  return Math.max(
    minimumPadding,
    scene.tileSize * 0.24,
    Number(target?.radius ?? target?.entity?.radius ?? scene.tileSize * 0.14) + Number(tipRadius || 0) + scene.tileSize * 0.14,
  );
}

function setUtilityWeaponAttackPass(
  attackState,
  currentTipX,
  currentTipY,
  target,
  scene,
  tipRadius = 0,
  minimumPassPadding = 0,
  options = {},
) {
  if (!attackState || !target) {
    return;
  }

  const aimPoint = combatTargetAimPoint(target);
  const fallbackDirection = normalizeDirection(
    Number(attackState.directionX ?? 1),
    Number(attackState.directionY ?? 0),
    1,
    0,
  );
  const approachDirection = normalizeDirection(
    aimPoint.x - currentTipX,
    aimPoint.y - currentTipY,
    fallbackDirection.x,
    fallbackDirection.y,
  );
  const passPadding = utilityWeaponTargetPassPadding(target, scene, tipRadius, minimumPassPadding);
  const passPointAX = aimPoint.x - approachDirection.x * passPadding;
  const passPointAY = aimPoint.y - approachDirection.y * passPadding;
  const passPointBX = aimPoint.x + approachDirection.x * passPadding;
  const passPointBY = aimPoint.y + approachDirection.y * passPadding;
  const distanceToA = Math.hypot(passPointAX - currentTipX, passPointAY - currentTipY);
  const distanceToB = Math.hypot(passPointBX - currentTipX, passPointBY - currentTipY);
  const primary = distanceToA >= distanceToB
    ? { x: passPointAX, y: passPointAY }
    : { x: passPointBX, y: passPointBY };
  const alternate = distanceToA >= distanceToB
    ? { x: passPointBX, y: passPointBY }
    : { x: passPointAX, y: passPointAY };

  attackState.lockedTargetKey = target.key;
  attackState.phase = "attack";
  attackState.destinationX = primary.x;
  attackState.destinationY = primary.y;
  attackState.alternateDestinationX = alternate.x;
  attackState.alternateDestinationY = alternate.y;
}

function approachUtilityVelocity(current, target, delta) {
  const safeDelta = Math.max(0, Number(delta) || 0);
  if (current < target) {
    return Math.min(current + safeDelta, target);
  }
  if (current > target) {
    return Math.max(current - safeDelta, target);
  }
  return target;
}

function moveUtilityWeaponTipWithPhysics(
  attackState,
  currentX,
  currentY,
  targetX,
  targetY,
  dt,
  maxSpeed,
  acceleration,
  deceleration,
  fallbackDirectionX = 1,
  fallbackDirectionY = 0,
) {
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const distance = Math.hypot(dx, dy);
  const fallbackDirection = normalizeDirection(fallbackDirectionX, fallbackDirectionY, 1, 0);
  const currentVelocityX = Number(attackState?.velocityX ?? 0);
  const currentVelocityY = Number(attackState?.velocityY ?? 0);

  if (distance <= 0.0001) {
    const nextVelocityX = approachUtilityVelocity(currentVelocityX, 0, deceleration * dt);
    const nextVelocityY = approachUtilityVelocity(currentVelocityY, 0, deceleration * dt);
    return {
      x: targetX,
      y: targetY,
      reached: true,
      directionX: fallbackDirection.x,
      directionY: fallbackDirection.y,
      velocityX: nextVelocityX,
      velocityY: nextVelocityY,
    };
  }

  const desiredDirection = normalizeDirection(dx, dy, fallbackDirection.x, fallbackDirection.y);
  const desiredVelocityX = desiredDirection.x * maxSpeed;
  const desiredVelocityY = desiredDirection.y * maxSpeed;
  const perpendicularX = -desiredDirection.y;
  const perpendicularY = desiredDirection.x;
  const currentSpeed = Math.hypot(currentVelocityX, currentVelocityY);
  const alongVelocity = currentVelocityX * desiredDirection.x + currentVelocityY * desiredDirection.y;
  const lateralVelocity = currentVelocityX * perpendicularX + currentVelocityY * perpendicularY;
  const alignment = currentSpeed > 0.0001
    ? clamp(alongVelocity / currentSpeed, -1, 1)
    : 1;
  const steeringDistance = Math.max(
    maxSpeed * 0.2,
    currentSpeed * 0.16,
    18,
  );
  const nearTargetFactor = clamp(1 - distance / steeringDistance, 0, 1);
  const turnAssist = clamp(
    (1 - alignment) * 0.34
    + nearTargetFactor * 0.9
    + (alongVelocity < 0 ? 0.42 : 0),
    0,
    1,
  );
  const stabilizedAlongVelocity = alongVelocity < 0
    ? approachUtilityVelocity(
      alongVelocity,
      0,
      deceleration * dt * (1.4 + turnAssist * 4.8),
    )
    : alongVelocity;
  const stabilizedLateralVelocity = approachUtilityVelocity(
    lateralVelocity,
    0,
    deceleration * dt * (0.9 + turnAssist * 5.6),
  );
  const stabilizedVelocityX = desiredDirection.x * stabilizedAlongVelocity + perpendicularX * stabilizedLateralVelocity;
  const stabilizedVelocityY = desiredDirection.y * stabilizedAlongVelocity + perpendicularY * stabilizedLateralVelocity;
  const nextVelocityX = approachUtilityVelocity(
    stabilizedVelocityX,
    desiredVelocityX,
    acceleration * dt * (1 + turnAssist * 0.35),
  );
  const nextVelocityY = approachUtilityVelocity(
    stabilizedVelocityY,
    desiredVelocityY,
    acceleration * dt * (1 + turnAssist * 0.35),
  );
  const velocityLength = Math.hypot(nextVelocityX, nextVelocityY);

  if (velocityLength <= 0.0001) {
    return {
      x: currentX,
      y: currentY,
      reached: false,
      directionX: desiredDirection.x,
      directionY: desiredDirection.y,
      velocityX: 0,
      velocityY: 0,
    };
  }

  const moveDistance = velocityLength * dt;
  if (distance <= moveDistance) {
    return {
      x: targetX,
      y: targetY,
      reached: true,
      directionX: desiredDirection.x,
      directionY: desiredDirection.y,
      velocityX: nextVelocityX,
      velocityY: nextVelocityY,
    };
  }

  return {
    x: currentX + (nextVelocityX / velocityLength) * moveDistance,
    y: currentY + (nextVelocityY / velocityLength) * moveDistance,
    reached: false,
    directionX: nextVelocityX / velocityLength,
    directionY: nextVelocityY / velocityLength,
    velocityX: nextVelocityX,
    velocityY: nextVelocityY,
  };
}

function buildUtilityWeaponRenderEntry(entry, player, scene) {
  const attackState = getUtilityWeaponAttackStateStore(player)[entry.key];
  const isThrusting = (
    attackState?.phase === "attack"
    || attackState?.phase === "return"
  );

  if (!isThrusting) {
    return {
      ...entry,
      rotation: UTILITY_WEAPON_ORBIT_ROTATION,
      attackPhase: "idle",
      tipWorldX: entry.worldX,
      tipWorldY: entry.worldY,
      tipScreenX: entry.screenX,
      tipScreenY: entry.screenY,
      utilityBeamState: null,
    };
  }

  const travel = Math.max(0, Number(attackState.travel ?? 0));
  const tipWorldX = Number(
    attackState.currentTipX
    ?? (Number(attackState.originTipX ?? entry.worldX) + Math.cos(entry.angle) * travel)
  );
  const tipWorldY = Number(
    attackState.currentTipY
    ?? (Number(attackState.originTipY ?? entry.worldY) + Math.sin(entry.angle) * travel)
  );
  const transform = resolveUtilityWeaponAttackTransform(
    entry,
    scene,
    attackState,
    tipWorldX,
    tipWorldY,
  );
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const screenX = entry.screenX + (transform.centerWorldX - entry.worldX);
  const screenY = entry.screenY + (transform.centerWorldY - entry.worldY);

  return {
    ...entry,
    worldX: transform.centerWorldX,
    worldY: transform.centerWorldY,
    screenX,
    screenY,
    depth: transform.centerWorldY - combatAnchor.worldY,
    rotation: transform.rotation,
    attackPhase: attackState.phase,
    lockedTargetKey: attackState.lockedTargetKey || null,
    tipWorldX,
    tipWorldY,
    tipScreenX: screenX + (tipWorldX - transform.centerWorldX),
    tipScreenY: screenY + (tipWorldY - transform.centerWorldY),
    utilityTwinSpinEnabled: Boolean(attackState.utilityTwinSpinEnabled),
    utilityTwinSpinBladeCount: Math.max(2, Math.floor(Number(attackState.utilityTwinSpinBladeCount ?? UTILITY_WEAPON_TWIN_SPIN_DEFAULT_BLADE_COUNT))),
    utilityTwinSpinAngle: Number(attackState.utilityTwinSpinAngle ?? transform.directionAngle),
    utilityTwinSpinDistance: Math.max(0, Number(attackState.utilityTwinSpinVisualDistance ?? 0)),
    utilityBeamState: attackState.utilityBeamState || null,
    afterimageTimer: Math.max(0, Number(attackState.afterimageTimer ?? 0)),
    afterimageStrength: clamp(Number(attackState.afterimageStrength ?? 0) || 0, 0, 1),
    afterimageDirectionX: Number(attackState.afterimageDirectionX ?? transform.directionX ?? 1),
    afterimageDirectionY: Number(attackState.afterimageDirectionY ?? transform.directionY ?? 0),
  };
}

function drawUtilityWeaponAccelerationAfterimages(entry, scene, rotationOverride = null, centerOverride = null) {
  const afterimageTimer = Math.max(0, Number(entry.afterimageTimer ?? 0));
  const afterimageStrength = clamp(Number(entry.afterimageStrength ?? 0) || 0, 0, 1);
  if (
    afterimageTimer <= 0
    || afterimageStrength <= UTILITY_WEAPON_AFTERIMAGE_MIN_STRENGTH
    || !entry.weapon?.image?.complete
  ) {
    return;
  }

  const direction = normalizeDirection(
    Number(entry.afterimageDirectionX ?? 0),
    Number(entry.afterimageDirectionY ?? 0),
    Math.cos(entry.rotation ?? 0),
    Math.sin(entry.rotation ?? 0),
  );
  const normalizedTime = clamp(afterimageTimer / UTILITY_WEAPON_AFTERIMAGE_DURATION, 0, 1);
  const count = UTILITY_WEAPON_AFTERIMAGE_MAX_COUNT;
  const spacing = Math.max(
    scene.tileSize * 0.08,
    entry.size * (0.12 + afterimageStrength * 0.06),
  );
  const drawOffset = resolveWeaponSpriteDrawOffset(entry.weapon, entry.size);
  const rotation = Number(rotationOverride ?? entry.rotation ?? UTILITY_WEAPON_ORBIT_ROTATION);
  const centerX = Number(centerOverride?.x ?? entry.screenX ?? 0);
  const centerY = Number(centerOverride?.y ?? entry.screenY ?? 0);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let index = count; index >= 1; index -= 1) {
    const stepProgress = index / (count + 1);
    const distance = spacing * index;
    const alpha = (0.12 + afterimageStrength * 0.2) * normalizedTime * (1 - stepProgress * 0.18);
    if (alpha <= 0.01) {
      continue;
    }

    ctx.save();
    ctx.translate(
      centerX - direction.x * distance,
      centerY - direction.y * distance,
    );
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.filter = "brightness(1.1) saturate(0.92)";
    drawWholePixelImage(
      entry.weapon.image,
      drawOffset.x,
      drawOffset.y,
      entry.size,
      entry.size,
    );
    ctx.restore();
  }
  ctx.restore();
}

function buildUtilityWeaponOrbitEntries(player, scene, drawHeight, game = state.game) {
  return buildUtilityWeaponHomeEntries(player, scene, drawHeight, game)
    .map((entry) => buildUtilityWeaponRenderEntry(entry, player, scene))
    .sort((first, second) => first.screenY - second.screenY);
}

function drawUtilityWeaponOrbitLayer(player, scene, drawHeight, layer = "front") {
  const orbitEntries = buildUtilityWeaponOrbitEntries(player, scene, drawHeight);
  if (!orbitEntries.length) {
    return;
  }

  const renderFrontLayer = layer === "front";
  orbitEntries.forEach((entry) => {
    const isFront = entry.depth >= 0;
    if (isFront !== renderFrontLayer || !entry.weapon?.image?.complete) {
      return;
    }

    const utilityBeamStateVisible = Boolean(
      entry.utilityBeamState?.active || entry.utilityBeamState?.charging,
    );

    if (entry.utilityBeamState?.active) {
      drawUtilityBeamVisual(entry.utilityBeamState, player, scene);
    }

    if (utilityBeamStateVisible && entry.weapon?.beamSkill?.enabled) {
      const beamSwordPose = resolveUtilityBeamSwordPose(entry);
      if (beamSwordPose) {
        drawUtilityWeaponAccelerationAfterimages(
          entry,
          scene,
          beamSwordPose.rotation,
          { x: beamSwordPose.x, y: beamSwordPose.y },
        );
        const chargeProgress = clamp(
          Number(entry.utilityBeamState?.chargeProgress ?? (entry.utilityBeamState?.active ? 1 : 0)) || 0,
          0,
          1,
        );
        const pulse = Math.sin(
          state.time * Number(entry.utilityBeamState.shimmerSpeed ?? 0.018)
          + Number(entry.utilityBeamState.phaseOffset ?? 0),
        ) * 0.5 + 0.5;
        drawUtilityBeamWeaponAura(entry, beamSwordPose, scene);
        drawBeamWeaponSprite(entry.weapon, beamSwordPose, {
          filter: entry.utilityBeamState?.active
            ? "brightness(1.18) saturate(1.08)"
            : "brightness(1.26) saturate(1.02)",
          highlightIntensity: entry.utilityBeamState?.active
            ? (0.9 + pulse * 0.3)
            : (0.72 + chargeProgress * 0.86 + pulse * 0.18),
          tintFillAlpha: entry.utilityBeamState?.active
            ? 0.74
            : (0.6 + chargeProgress * 0.22),
        });
        return;
      }
    }

    drawUtilityWeaponAccelerationAfterimages(entry, scene);

    ctx.save();
    ctx.translate(entry.screenX, entry.screenY);
    ctx.globalAlpha = entry.attackPhase !== "idle"
      ? 0.98
      : (isFront ? 0.94 : 0.56);
    ctx.filter = entry.attackPhase !== "idle"
      ? "brightness(1.02) saturate(1.06)"
      : (isFront
        ? "brightness(0.96) saturate(1.02)"
        : "brightness(0.6) saturate(0.74)");
    ctx.rotate(entry.rotation ?? UTILITY_WEAPON_ORBIT_ROTATION);
    drawWholePixelImage(
      entry.weapon.image,
      -entry.size * 0.5,
      -entry.size * 0.5,
      entry.size,
      entry.size,
    );

    if (entry.utilityTwinSpinEnabled && entry.attackPhase !== "idle") {
      const totalBlades = Math.max(3, Number(entry.utilityTwinSpinBladeCount) || UTILITY_WEAPON_TWIN_SPIN_DEFAULT_BLADE_COUNT);
      const extraBladeSize = entry.size * 0.94;
      for (let bladeIndex = 1; bladeIndex < totalBlades; bladeIndex += 1) {
        const bladeAngle = entry.utilityTwinSpinAngle + (Math.PI * 2 * bladeIndex) / totalBlades;
        const bladeX = Math.cos(bladeAngle) * entry.utilityTwinSpinDistance;
        const bladeY = Math.sin(bladeAngle) * entry.utilityTwinSpinDistance;
        const extraBladeOffset = resolveWeaponSpriteDrawOffset(entry.weapon, extraBladeSize);
        ctx.save();
        ctx.translate(bladeX, bladeY);
        ctx.rotate(bladeAngle + Math.PI * 0.25);
        drawWholePixelImage(
          entry.weapon.image,
          extraBladeOffset.x,
          extraBladeOffset.y,
          extraBladeSize,
          extraBladeSize,
        );
        ctx.restore();
      }
    }

    ctx.filter = "none";
    ctx.restore();
  });
}

function applyTwinSpinManaStacks(player, manaSpent) {
  if (!player || !Number.isFinite(manaSpent) || manaSpent <= 0) {
    return;
  }

  player.spinManaProgress = clamp((player.spinManaProgress ?? 0) + manaSpent, 0, 99999);
  const gainedStacks = Math.floor(player.spinManaProgress);
  if (gainedStacks <= 0) {
    return;
  }

  player.physicalBoostStacks = (player.physicalBoostStacks ?? 0) + (gainedStacks * SPIN_SPEED_GAIN_PER_MANA);
  player.spinManaProgress -= gainedStacks;
  startPhysicalBoostDecay(player);
  syncPhysicalEnhancementStats(player);
}

function applyWeaponManaSpendPassives(player, manaSpent, game = state.game) {
  if (!player || !Number.isFinite(manaSpent) || manaSpent <= 0) {
    return;
  }

  const twinSpinMultiplier = getWeaponPassiveEffectTotal(
    SPIN_PASSIVE_ID,
    "manaSpendStackMultiplier",
    ["hand", "utility"],
    game,
  );
  if (twinSpinMultiplier > 0) {
    applyTwinSpinManaStacks(player, manaSpent * twinSpinMultiplier);
  }
}

function utilityWeaponCombatProfile(weapon, player, scene) {
  if (
    !weapon?.melee
    || !player
    || !scene
    || !(weapon.utilityCombat?.autoThrustAttack || weapon.utilityCombat?.autoOrbitAttack)
  ) {
    return null;
  }

  const attackSpeedScale = Math.max(1, weaponActionSpeedScale(player));
  const skillRangeScale = weaponSkillRangeScale(player, state.game?.chapter ?? 1);
  const forceScale = typeof playerForceScale === "function"
    ? playerForceScale(player, state.game?.chapter ?? 1)
    : 1;
  const nativeBeamProfile = isWeaponPassiveActive(weapon.passive) && weapon.passive?.id === BEAM_PASSIVE_ID
    ? beamSkillProfile(weapon, player, scene)
    : null;
  const thrustSpeed = Math.max(
    UTILITY_WEAPON_THRUST_MIN_SPEED,
    scene.tileSize * Number(weapon.utilityCombat.flightSpeedScale ?? 22) * attackSpeedScale,
  );
  const weaponDamageBase = weaponDamageValue(player, weapon);
  const thrustAcceleration = Math.max(
    UTILITY_WEAPON_THRUST_MIN_SPEED * 6,
    thrustSpeed * (10 + forceScale * 8),
  );
  return {
    weaponDamageBase,
    damage: weaponDamageValue(player, weapon, {
      multiplier: Number(weapon.utilityCombat.damageMultiplier ?? 0.42),
    }),
    manaCostPerSecond: nativeBeamProfile
      ? 0
      : Math.max(0, Number(weapon.utilityCombat.manaCostPerSecond ?? 15) || 0),
    tipRadius: Math.max(
      scene.tileSize * 0.1,
      scene.tileSize * Number(
        weapon.utilityCombat.tipRadiusScale
        ?? weapon.utilityCombat.hitRadiusScale
        ?? 0.22,
      ),
    ),
    hitInterval: clamp(
      Number(weapon.utilityCombat.hitIntervalSeconds ?? 0.12) / attackSpeedScale,
      0.04,
      0.24,
    ),
    cycleCooldown: clamp(
      Number(weapon.utilityCombat.cycleCooldownSeconds ?? 0.12) / attackSpeedScale,
      0.03,
      0.24,
    ),
    travelDistance: Math.max(
      scene.tileSize * 1.6,
      player.radius * Number(
        weapon.utilityCombat.travelDistanceMultiplier
        ?? UTILITY_WEAPON_THRUST_DEFAULT_DISTANCE_MULTIPLIER,
      ),
    ) * skillRangeScale,
    passDistance: Math.max(
      scene.tileSize * 1.35,
      player.radius * Number(weapon.utilityCombat.passDistanceMultiplier ?? 5.4),
    ) * skillRangeScale,
    thrustSpeed,
    thrustAcceleration,
    thrustAccelerationRate: thrustAcceleration / Math.max(1, UTILITY_WEAPON_THRUST_MIN_SPEED * 6),
    thrustDeceleration: Math.max(
      UTILITY_WEAPON_THRUST_MIN_SPEED * 7,
      thrustSpeed * (12 + forceScale * 8),
    ),
    singlePassAttack: Boolean(weapon.utilityCombat.singlePassAttack),
    twinSpinEnabled: Boolean(
      weapon.utilityCombat.utilityTwinSpinEnabled
      && isWeaponPassiveActive(weapon.passive)
      && weapon.passive?.id === SPIN_PASSIVE_ID
    ),
    twinSpinBladeCount: Math.max(
      3,
      Math.floor(Number(weapon.utilityCombat.utilityTwinSpinBladeCount ?? UTILITY_WEAPON_TWIN_SPIN_DEFAULT_BLADE_COUNT)),
    ),
    twinSpinDamage: weaponDamageValue(player, weapon, {
      multiplier: Number(weapon.utilityCombat.utilityTwinSpinDamageMultiplier ?? 0.34),
    }),
    twinSpinRange: weaponRangeValue(scene, player, weapon, {
      multiplier: Number(weapon.utilityCombat.utilityTwinSpinRangeScale ?? 0.94),
      skillLike: true,
      minimum: scene.tileSize * 0.9,
    }),
    twinSpinHitInterval: clamp(
      Number(weapon.utilityCombat.utilityTwinSpinHitIntervalSeconds ?? 0.12) / attackSpeedScale,
      0.04,
      0.22,
    ),
    twinSpinRate: SPIN_BASE_RATE
      * Math.max(1, attackSpeedScale)
      * Number(weapon.utilityCombat.utilityTwinSpinRateMultiplier ?? 1),
    twinSpinVisualDistance: weaponRangeValue(scene, player, weapon, {
      multiplier: Number(weapon.utilityCombat.utilityTwinSpinVisualDistanceScale ?? 0.62),
      skillLike: true,
      minimum: scene.tileSize * 0.34,
    }),
    twinSpinManaCostPerSecond: Math.max(
      0,
      Number(weapon.utilityCombat.utilityTwinSpinManaCostPerSecond ?? 3) || 0,
    ),
    twinSpinLocalStackPerMana: Math.max(
      0,
      Number(weapon.utilityCombat.utilityTwinSpinLocalStackPerMana ?? 1) || 0,
    ),
    twinSpinStackSpeedBonus: Math.max(
      0,
      Number(weapon.utilityCombat.utilityTwinSpinStackSpeedBonus ?? 0.08) || 0,
    ),
    utilityBeamEnabled: Boolean(weapon.utilityCombat.utilityBeamEnabled && nativeBeamProfile),
    utilityBeamChargeDuration: Math.max(
      0,
      Number(
        weapon.utilityCombat.utilityBeamChargeDurationSeconds
        ?? nativeBeamProfile?.chargeDuration
        ?? 0,
      ) || 0,
    ),
    utilityBeamRange: Math.max(
      0,
      Number(weapon.utilityCombat.utilityBeamFixedRangeTileMultiplier ?? 0) > 0
        ? scene.tileSize * Number(weapon.utilityCombat.utilityBeamFixedRangeTileMultiplier)
        : Number(nativeBeamProfile?.range ?? 0),
    ),
    utilityBeamWidth: Math.max(0, Number(nativeBeamProfile?.width ?? 0)),
    utilityBeamVisualCoreWidth: Math.max(0, Number(nativeBeamProfile?.visualCoreWidth ?? 0)),
    utilityBeamVisualWhiteHotWidth: Math.max(0, Number(nativeBeamProfile?.visualWhiteHotWidth ?? 0)),
    utilityBeamVisualGlowWidth: Math.max(0, Number(nativeBeamProfile?.visualGlowWidth ?? 0)),
    utilityBeamEndpointRadius: Math.max(0, Number(nativeBeamProfile?.endpointRadius ?? 0)),
    utilityBeamHitInterval: clamp(Number(nativeBeamProfile?.hitInterval ?? 0.13), 0.05, 0.24),
    utilityBeamWeaponDamage: Math.max(1, Number(nativeBeamProfile?.weaponDamage ?? weaponDamageValue(player, weapon))),
    utilityBeamBaseManaCostPerSecond: Math.max(0, Number(nativeBeamProfile?.baseManaCostPerSecond ?? nativeBeamProfile?.manaCostPerSecond ?? 0)),
    utilityBeamManaCompoundMultiplierPerSecond: Math.max(1, Number(nativeBeamProfile?.manaCompoundMultiplierPerSecond ?? 1)),
    utilityBeamParticleCount: Math.max(0, Math.floor(Number(nativeBeamProfile?.particleCount ?? 0))),
    utilityBeamParticleSpread: Math.max(0, Number(nativeBeamProfile?.particleSpread ?? 0)),
    utilityBeamParticleSize: Math.max(0, Number(nativeBeamProfile?.particleSize ?? 0)),
    utilityBeamParticleShakeAmplitude: Math.max(0, Number(nativeBeamProfile?.particleShakeAmplitude ?? 0)),
    utilityBeamParticleShakeSpeed: Math.max(0.001, Number(nativeBeamProfile?.particleShakeSpeed ?? 0.032) || 0.032),
    utilityBeamParticleFlowSpeed: Math.max(0.0001, Number(nativeBeamProfile?.particleFlowSpeed ?? 0.00095) || 0.00095),
    utilityBeamShimmerSpeed: Math.max(0.001, Number(nativeBeamProfile?.shimmerSpeed ?? 0.018) || 0.018),
  };
}

function resolveUtilityWeaponThrustDamage(profile, attackState) {
  const baseDamage = Math.max(1, Number(profile?.damage ?? 0));
  const weaponDamageBase = Math.max(1, Number(profile?.weaponDamageBase ?? baseDamage));
  const accelerationRate = Math.max(0, Number(profile?.thrustAccelerationRate ?? 1));
  const travelDistance = Math.max(1, Number(profile?.travelDistance ?? 1));
  const lockDistance = Math.max(0, Number(attackState?.lockDistanceAtAcquire ?? 0));
  const lockDistanceFactor = clamp(lockDistance / travelDistance, 0, 1);
  const bonusDamage = accelerationRate * weaponDamageBase * lockDistanceFactor;
  return Math.max(baseDamage, Math.round(baseDamage + bonusDamage));
}


function applyUtilityTwinSpinHits(attackState, entry, profile, scene, targets) {
  if (!attackState || !profile?.twinSpinEnabled || !scene || !targets?.length) {
    return;
  }

  const tipX = Number(attackState.currentTipX);
  const tipY = Number(attackState.currentTipY);
  if (!Number.isFinite(tipX) || !Number.isFinite(tipY)) {
    return;
  }

  const transform = resolveUtilityWeaponAttackTransform(entry, scene, attackState, tipX, tipY);
  const bladeCount = Math.max(3, Number(attackState.utilityTwinSpinBladeCount ?? profile.twinSpinBladeCount));
  const spinAngle = Number(attackState.utilityTwinSpinAngle ?? transform.directionAngle);
  const localSpeedMultiplier = utilityTwinSpinLocalSpeedMultiplier(attackState, profile);

  targets.forEach((target) => {
    if (!isCombatTargetAlive(target)) {
      return;
    }

    const targetKey = getCombatTargetKey(target);
    const timer = attackState.spinHitTimers?.[targetKey] ?? 0;
    if (timer > 0) {
      return;
    }

    const distance = combatTargetDistanceFromPoint(
      target,
      transform.centerWorldX,
      transform.centerWorldY,
    );
    if (distance > profile.twinSpinRange) {
      return;
    }

    const angleToTarget = Math.atan2(
      combatTargetAimPoint(target).y - transform.centerWorldY,
      combatTargetAimPoint(target).x - transform.centerWorldX,
    );
    const bladeHit = Array.from({ length: bladeCount }).some((_, bladeIndex) => {
      const bladeAngle = spinAngle + (Math.PI * 2 * bladeIndex) / bladeCount;
      return Math.abs(shortestAngleDelta(angleToTarget, bladeAngle)) <= UTILITY_WEAPON_TWIN_SPIN_BLADE_TOLERANCE;
    });

    if (!bladeHit) {
      return;
    }

    applyDamageToCombatTarget(target, profile.twinSpinDamage, {
      hitFlash: 0.14,
      damageFloatDuration: 0.5,
      attackMode: "utility-twin-spin",
    });
    queuePlayerAttackImpactStreak(
      state.game?.player,
      scene,
      target,
      angleToTarget,
      {
        lengthScale: 0.58,
        widthScale: 0.018,
        duration: 0.045,
      },
    );
    attackState.spinHitTimers[targetKey] = clamp(
      profile.twinSpinHitInterval / localSpeedMultiplier,
      0.03,
      0.22,
    );
  });
}

function applyUtilityWeaponAttacks(dt) {
  if (!state.game?.player || !state.game?.scene) {
    return;
  }

  const { player, scene } = state.game;
  const drawHeight = 32 * (player.spriteScale ?? 1);
  const orbitEntries = buildUtilityWeaponHomeEntries(player, scene, drawHeight, state.game)
    .filter((entry) => Boolean(entry.weapon?.melee));
  if (!orbitEntries.length) {
    player.utilityWeaponAttackStates = {};
    return;
  }

  const attackStates = getUtilityWeaponAttackStateStore(player);
  const activeKeys = new Set(orbitEntries.map((entry) => entry.key));
  Object.keys(attackStates).forEach((attackKey) => {
    if (!activeKeys.has(attackKey)) {
      delete attackStates[attackKey];
    }
  });

  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const targets = getCombatTargets(state.game).filter((target) => isCombatTargetAlive(target));
  const hostileTargets = targets.filter((target) => isHostileCombatTarget(target));

  orbitEntries.forEach((entry) => {
    const profile = utilityWeaponCombatProfile(entry.weapon, player, scene);
    if (!profile) {
      delete attackStates[entry.key];
      return;
    }

    let attackState = attackStates[entry.key];
    if (!attackState || typeof attackState !== "object") {
      attackState = {
        phase: "idle",
        cooldown: entry.slotIndex * 0.04,
        hitTimers: {},
        spinHitTimers: {},
        utilityTwinSpinStacks: 0,
        utilityTwinSpinManaProgress: 0,
        utilityTwinSpinExpiresAt: 0,
        currentTipX: null,
        currentTipY: null,
        velocityX: 0,
        velocityY: 0,
        utilityBeamState: null,
      };
      attackStates[entry.key] = attackState;
    }
    tickUtilityWeaponAfterimage(attackState, dt);
    tickUtilityWeaponHitTimers(attackState, dt);
    tickUtilityWeaponSpinHitTimers(attackState, dt);
    tickUtilityTwinSpinStackDecay(attackState);

    const tipOffset = Math.max(scene.tileSize * 0.18, entry.size * UTILITY_WEAPON_THRUST_TIP_OFFSET_RATIO);
    const findNearestPlayerTarget = (excludedTargetKey = "") => {
      const filteredTargets = excludedTargetKey
        ? hostileTargets.filter((target) => getCombatTargetKey(target) !== excludedTargetKey)
        : hostileTargets;
      const candidateTargets = filteredTargets.length ? filteredTargets : hostileTargets;
      return findNearestAvailableCombatTarget(
        candidateTargets,
        combatAnchor.worldX,
        combatAnchor.worldY,
        profile.travelDistance,
        collectReservedUtilityTargetKeys(attackStates, hostileTargets, entry.key),
      );
    };
    const resolveLockedTarget = () => hostileTargets.find((target) => (
      target.key === attackState.lockedTargetKey
      && combatTargetDistanceFromPoint(target, combatAnchor.worldX, combatAnchor.worldY) <= profile.travelDistance
    )) || null;
    const retargetAttackPass = (
      target,
      fromX,
      fromY,
      tipRadiusOverride = Number(attackState.tipRadius ?? profile.tipRadius),
    ) => {
      if (!target) {
        return;
      }
      setUtilityWeaponAttackPass(
        attackState,
        fromX,
        fromY,
        target,
        scene,
        tipRadiusOverride,
        profile.passDistance,
      );
      attackState.lockDistanceAtAcquire = combatTargetDistanceFromPoint(
        target,
        combatAnchor.worldX,
        combatAnchor.worldY,
      );
    };
    const resetToIdle = () => {
      attackState.phase = "idle";
      attackState.cooldown = profile.cycleCooldown;
      attackState.lockedTargetKey = null;
      attackState.lockDistanceAtAcquire = 0;
      attackState.destinationX = null;
      attackState.destinationY = null;
      attackState.alternateDestinationX = null;
      attackState.alternateDestinationY = null;
      attackState.currentTipX = null;
      attackState.currentTipY = null;
      attackState.velocityX = 0;
      attackState.velocityY = 0;
      attackState.hitTimers = {};
      attackState.spinHitTimers = {};
      attackState.utilityBeamState = null;
      attackState.utilityTwinSpinEnabled = false;
      attackState.utilityTwinSpinAngle = null;
      attackState.utilityTwinSpinBladeCount = null;
      attackState.utilityTwinSpinVisualDistance = null;
      startUtilityTwinSpinStackDecay(attackState);
    };

    const localTwinSpinSpeedMultiplier = profile.twinSpinEnabled
      ? utilityTwinSpinLocalSpeedMultiplier(attackState, profile)
      : 1;
    const maxSpeed = Math.max(
      0,
      Number(attackState.speed ?? profile.thrustSpeed) * localTwinSpinSpeedMultiplier,
    );
    const acceleration = Math.max(
      0,
      Number(profile.thrustAcceleration ?? profile.thrustSpeed * 4.8) * localTwinSpinSpeedMultiplier,
    );
    const deceleration = Math.max(
      0,
      Number(profile.thrustDeceleration ?? profile.thrustSpeed * 5.4) * localTwinSpinSpeedMultiplier,
    );
    let previousTipX = Number(attackState.currentTipX);
    let previousTipY = Number(attackState.currentTipY);

    if (attackState.phase === "idle") {
      attackState.cooldown = Math.max(0, Number(attackState.cooldown ?? 0) - dt);
      if (attackState.cooldown > 0) {
        return;
      }

      const lockTarget = findNearestPlayerTarget();
      if (!lockTarget) {
        attackState.lockedTargetKey = null;
        attackState.lockDistanceAtAcquire = 0;
        attackState.hitTimers = {};
        attackState.spinHitTimers = {};
        attackState.utilityBeamState = null;
        return;
      }

      const launchDirection = resolveUtilityWeaponAttackDirection(entry, combatAnchor, lockTarget);
      const launchRotation = UTILITY_WEAPON_ORBIT_ROTATION + Math.atan2(launchDirection.y, launchDirection.x) + (Math.PI * 0.5);
      const launchTipAnchor = resolveUtilityWeaponTipAnchor(entry, tipOffset, launchRotation);
      previousTipX = entry.worldX + launchTipAnchor.x;
      previousTipY = entry.worldY + launchTipAnchor.y;

      Object.assign(attackState, {
        phase: "attack",
        speed: profile.thrustSpeed,
        tipRadius: profile.tipRadius,
        tipOffset,
        cooldown: 0,
        currentTipX: previousTipX,
        currentTipY: previousTipY,
        velocityX: launchDirection.x * Math.max(0, profile.thrustSpeed * 0.18),
        velocityY: launchDirection.y * Math.max(0, profile.thrustSpeed * 0.18),
        utilityTwinSpinEnabled: profile.twinSpinEnabled,
        utilityTwinSpinAngle: Math.atan2(launchDirection.y, launchDirection.x),
        utilityTwinSpinBladeCount: profile.twinSpinBladeCount,
        utilityTwinSpinVisualDistance: profile.twinSpinVisualDistance,
      });
      setUtilityWeaponAttackPass(
        attackState,
        previousTipX,
        previousTipY,
        lockTarget,
        scene,
        profile.tipRadius,
        profile.passDistance,
      );
      attackState.lockDistanceAtAcquire = combatTargetDistanceFromPoint(
        lockTarget,
        combatAnchor.worldX,
        combatAnchor.worldY,
      );
    } else if (!Number.isFinite(previousTipX) || !Number.isFinite(previousTipY)) {
      previousTipX = entry.worldX;
      previousTipY = entry.worldY;
      attackState.currentTipX = previousTipX;
      attackState.currentTipY = previousTipY;
    }

    if (attackState.phase === "attack") {
      const lockedTarget = resolveLockedTarget();
      if (!lockedTarget) {
        const nextTarget = findNearestPlayerTarget(attackState.lockedTargetKey || "");
        if (nextTarget) {
          retargetAttackPass(
            nextTarget,
            previousTipX,
            previousTipY,
          );
        } else {
          attackState.phase = "return";
          attackState.lockedTargetKey = null;
          attackState.lockDistanceAtAcquire = 0;
          attackState.destinationX = entry.worldX;
          attackState.destinationY = entry.worldY;
          attackState.alternateDestinationX = null;
          attackState.alternateDestinationY = null;
        }
      }
    }

    if (attackState.phase !== "attack" && attackState.phase !== "return") {
      return;
    }

    if (attackState.phase === "attack") {
      const requestedUtilityMana = profile.manaCostPerSecond * dt;
      if (requestedUtilityMana > 0) {
        const spentUtilityMana = spendPlayerMana(
          player,
          requestedUtilityMana,
          { applyPassiveHooks: false },
        );
        if (spentUtilityMana < requestedUtilityMana) {
          attackState.phase = "return";
          attackState.lockedTargetKey = null;
          attackState.lockDistanceAtAcquire = 0;
          attackState.destinationX = entry.worldX;
          attackState.destinationY = entry.worldY;
          attackState.alternateDestinationX = null;
          attackState.alternateDestinationY = null;
          attackState.utilityBeamState = null;
          attackState.utilityTwinSpinEnabled = false;
        }
      }
    }

    if (profile.twinSpinEnabled) {
      const spentTwinSpinMana = spendPlayerMana(
        player,
        profile.twinSpinManaCostPerSecond * dt,
        { applyPassiveHooks: false },
      );
      if (spentTwinSpinMana > 0) {
        attackState.utilityTwinSpinEnabled = true;
        applyUtilityTwinSpinLocalStacks(attackState, spentTwinSpinMana, profile);
      } else {
        attackState.utilityTwinSpinEnabled = false;
        startUtilityTwinSpinStackDecay(attackState);
      }
    }

    const fallbackDirection = normalizeDirection(
      Number(attackState.directionX ?? Math.cos(entry.angle)),
      Number(attackState.directionY ?? Math.sin(entry.angle)),
      Math.cos(entry.angle),
      Math.sin(entry.angle),
    );
    const destinationX = Number(
      attackState.destinationX
      ?? (attackState.phase === "return" ? entry.worldX : previousTipX)
    );
    const destinationY = Number(
      attackState.destinationY
      ?? (attackState.phase === "return" ? entry.worldY : previousTipY)
    );
    const nextTip = moveUtilityWeaponTipWithPhysics(
      attackState,
      previousTipX,
      previousTipY,
      destinationX,
      destinationY,
      dt,
      maxSpeed,
      acceleration,
      deceleration,
      fallbackDirection.x,
      fallbackDirection.y,
    );
    const accelerationDeltaX = Number(nextTip.velocityX) - Number(attackState.velocityX ?? 0);
    const accelerationDeltaY = Number(nextTip.velocityY) - Number(attackState.velocityY ?? 0);
    const accelerationStrength = clamp(
      Math.hypot(accelerationDeltaX, accelerationDeltaY) / Math.max(1, acceleration * dt),
      0,
      1,
    );
    refreshUtilityWeaponAfterimage(
      attackState,
      accelerationStrength,
      nextTip.directionX,
      nextTip.directionY,
    );

    attackState.directionX = nextTip.directionX;
    attackState.directionY = nextTip.directionY;
    attackState.currentTipX = nextTip.x;
    attackState.currentTipY = nextTip.y;
    attackState.velocityX = nextTip.velocityX;
    attackState.velocityY = nextTip.velocityY;
    if (profile.twinSpinEnabled && attackState.utilityTwinSpinEnabled) {
      if (!Number.isFinite(Number(attackState.utilityTwinSpinAngle))) {
        attackState.utilityTwinSpinAngle = Math.atan2(nextTip.directionY, nextTip.directionX);
      }
      attackState.utilityTwinSpinAngle += (profile.twinSpinRate * localTwinSpinSpeedMultiplier) * dt;
    }

    targets.forEach((target) => {
      const targetKey = getCombatTargetKey(target);
      const timer = attackState.hitTimers[targetKey] ?? 0;
      if (timer > 0) {
        return;
      }

      if (!segmentHitsCombatTarget(
        target,
        previousTipX,
        previousTipY,
        nextTip.x,
        nextTip.y,
        Number(attackState.tipRadius ?? profile.tipRadius),
      )) {
        return;
      }

      applyDamageToCombatTarget(target, resolveUtilityWeaponThrustDamage(profile, attackState), {
        hitFlash: 0.12,
        damageFloatDuration: 0.48,
        attackMode: "utility-thrust",
      });
      const impactX = Number(target.worldX ?? target.entity?.worldX ?? nextTip.x);
      const impactY = Number(target.worldY ?? target.entity?.worldY ?? nextTip.y);
      queueUtilityImpactStreak(
        player,
        impactX,
        impactY,
        Math.atan2(nextTip.directionY, nextTip.directionX),
        {
          length: scene.tileSize * 0.68,
          width: scene.tileSize * 0.02,
          duration: 0.05,
        },
      );
      attackState.hitTimers[targetKey] = clamp(
        profile.hitInterval / localTwinSpinSpeedMultiplier,
        0.03,
        0.24,
      );
    });

    if (profile.twinSpinEnabled && attackState.utilityTwinSpinEnabled) {
      applyUtilityTwinSpinHits(
        attackState,
        entry,
        profile,
        scene,
        hostileTargets,
      );
    }

    applyUtilityPrismBeamState({
      attackState,
      entry,
      profile,
      player,
      scene,
      dt,
      tipX: nextTip.x,
      tipY: nextTip.y,
      beamTarget: attackState.phase === "attack" ? resolveLockedTarget() : null,
      targets,
    });

    if (!nextTip.reached) {
      return;
    }

    if (attackState.phase === "return") {
      resetToIdle();
      return;
    }

    if (profile.singlePassAttack) {
      const nextTarget = findNearestPlayerTarget(attackState.lockedTargetKey || "");
      if (nextTarget) {
        retargetAttackPass(
          nextTarget,
          nextTip.x,
          nextTip.y,
        );
        return;
      }
      attackState.phase = "return";
      attackState.lockedTargetKey = null;
      attackState.lockDistanceAtAcquire = 0;
      attackState.destinationX = entry.worldX;
      attackState.destinationY = entry.worldY;
      attackState.alternateDestinationX = null;
      attackState.alternateDestinationY = null;
      return;
    }

    const lockedTarget = resolveLockedTarget();
    if (lockedTarget) {
      retargetAttackPass(
        lockedTarget,
        nextTip.x,
        nextTip.y,
      );
      return;
    }

    const nextTarget = findNearestPlayerTarget();
    if (nextTarget) {
      retargetAttackPass(
        nextTarget,
        nextTip.x,
        nextTip.y,
      );
      return;
    }

    attackState.phase = "return";
    attackState.lockedTargetKey = null;
    attackState.lockDistanceAtAcquire = 0;
    attackState.destinationX = entry.worldX;
    attackState.destinationY = entry.worldY;
    attackState.alternateDestinationX = null;
    attackState.alternateDestinationY = null;
  });
}

function currentAttackProfile(game = state.game) {
  if (!game?.player) {
    return null;
  }

  const weapons = getWieldedWeapons(game);
  if (!weapons.length) {
    return null;
  }

  if (weapons.length >= 2) {
    const [firstWeapon, secondWeapon] = weapons;
    const firstDamage = weaponDamageValue(game.player, firstWeapon);
    const secondDamage = weaponDamageValue(game.player, secondWeapon);
    const firstVisualRange = weaponVisualRangeValue(game.scene, game.player, firstWeapon);
    const secondVisualRange = weaponVisualRangeValue(game.scene, game.player, secondWeapon);
    return {
      mode: "dual",
      weapons: [firstWeapon, secondWeapon],
      weaponIds: [firstWeapon.id, secondWeapon.id],
      halfArc: Math.PI * 0.7,
      range: Math.max(
        weaponRangeValue(game.scene, game.player, firstWeapon),
        weaponRangeValue(game.scene, game.player, secondWeapon),
      ),
      visualRange: Math.max(firstVisualRange, secondVisualRange),
      damage: firstDamage + secondDamage,
    };
  }

  const [weapon] = weapons;
  return {
    mode: "single",
    weapons: [weapon],
    weaponIds: [weapon.id],
    halfArc: weapon.melee.arcRadians * 0.7,
    range: weaponRangeValue(game.scene, game.player, weapon),
    visualRange: weaponVisualRangeValue(game.scene, game.player, weapon),
    damage: weaponDamageValue(game.player, weapon),
  };
}

function resolveCurrentSwingRanges(player, scene, swing) {
  if (!player || !scene || !swing) {
    return {
      range: Math.max(0, Number(swing?.range ?? 0) || 0),
      visualRange: Math.max(0, Number(swing?.visualRange ?? swing?.range ?? 0) || 0),
    };
  }

  if (swing.mode === "titan-burst") {
    return {
      range: Math.max(0, Number(swing.range ?? 0) || 0),
      visualRange: Math.max(0, Number(swing.visualRange ?? swing.range ?? 0) || 0),
    };
  }

  if (swing.mode === "dual-cross") {
    const weapons = (swing.weaponIds || [])
      .map((weaponId) => getWeaponById(weaponId))
      .filter(Boolean);
    if (!weapons.length) {
      return {
        range: Math.max(0, Number(swing.range ?? 0) || 0),
        visualRange: Math.max(0, Number(swing.visualRange ?? swing.range ?? 0) || 0),
      };
    }
    return {
      range: Math.max(...weapons.map((weapon) => weaponRangeValue(scene, player, weapon))),
      visualRange: Math.max(...weapons.map((weapon) => weaponVisualRangeValue(scene, player, weapon))),
    };
  }

  const weapon = getWeaponById(swing.weaponId);
  if (!weapon) {
    return {
      range: Math.max(0, Number(swing.range ?? 0) || 0),
      visualRange: Math.max(0, Number(swing.visualRange ?? swing.range ?? 0) || 0),
    };
  }

  return {
    range: weaponRangeValue(scene, player, weapon),
    visualRange: weaponVisualRangeValue(scene, player, weapon),
  };
}


function buildTrainingDummies(tileSize) {
  const spread = tileSize * 2.7;
  return [
    { id: 1, worldX: spread, worldY: -tileSize * 0.45, radius: tileSize * 0.22, maxHealth: 1200, health: 1200, defense: 0, hitFlash: 0, damageFloat: null, respawnDelay: 0.45, respawnTimer: 0 },
    { id: 2, worldX: -spread * 0.85, worldY: tileSize * 0.9, radius: tileSize * 0.22, maxHealth: 1200, health: 1200, defense: 0, hitFlash: 0, damageFloat: null, respawnDelay: 0.45, respawnTimer: 0 },
    { id: 3, worldX: spread * 1.65, worldY: tileSize * 1.18, radius: tileSize * 0.22, maxHealth: 1200, health: 1200, defense: 0, hitFlash: 0, damageFloat: null, respawnDelay: 0.45, respawnTimer: 0 },
  ];
}

function getCombatTargetKey(target) {
  if (!target) {
    return "";
  }
  if (typeof target.key === "string" && target.key) {
    return target.key;
  }
  const kind = target.kind || target.entityType || "target";
  return `${kind}:${target.id ?? "unknown"}`;
}

function getCombatTargets(game = state.game) {
  if (!game) {
    return [];
  }

  const dummyTargets = (game.dummies || []).map((dummy) => ({
    key: getCombatTargetKey({ kind: "dummy", id: dummy.id }),
    kind: "dummy",
    hostile: false,
    id: dummy.id,
    entity: dummy,
    worldX: dummy.worldX,
    worldY: dummy.worldY,
    radius: dummy.radius,
    defense: dummy.defense ?? 0,
    health: dummy.health,
    maxHealth: dummy.maxHealth,
  }));

  const monsterTargets = (game.monsters || []).map((monster) => {
    const hitbox = monsterHitboxFromEntity(monster, game.scene);
    return {
      key: getCombatTargetKey({ kind: "monster", id: monster.id }),
      kind: "monster",
      hostile: true,
      id: monster.id,
      entity: monster,
      worldX: hitbox.centerX,
      worldY: hitbox.centerY,
      radius: Math.max(hitbox.width, hitbox.height) * 0.5,
      hitbox,
      defense: monster.defense ?? 0,
      health: monster.health,
      maxHealth: monster.maxHealth,
    };
  });

  return [...monsterTargets, ...dummyTargets];
}

function isCombatTargetAlive(target) {
  const entity = target?.entity ?? target;
  return (entity?.health ?? 0) > 0;
}

function combatTargetAimPoint(target) {
  if (target?.hitbox) {
    return {
      x: target.hitbox.centerX,
      y: target.hitbox.centerY,
    };
  }

  return {
    x: target?.worldX ?? target?.entity?.worldX ?? 0,
    y: target?.worldY ?? target?.entity?.worldY ?? 0,
  };
}

function combatTargetDistanceFromPoint(target, x, y) {
  if (target?.hitbox) {
    const dx = Math.max(target.hitbox.left - x, 0, x - target.hitbox.right);
    const dy = Math.max(target.hitbox.top - y, 0, y - target.hitbox.bottom);
    return Math.hypot(dx, dy);
  }

  const dx = (target?.worldX ?? 0) - x;
  const dy = (target?.worldY ?? 0) - y;
  return Math.max(0, Math.hypot(dx, dy) - (target?.radius ?? 0));
}

function collectTargetsInAttackArc({
  originX,
  originY,
  range,
  facing,
  halfArc,
  targets = getCombatTargets(),
}) {
  return targets.filter((target) => {
    if (!isCombatTargetAlive(target)) {
      return false;
    }

    const dx = target.worldX - originX;
    const dy = target.worldY - originY;
    const distance = combatTargetDistanceFromPoint(target, originX, originY);
    if (distance > range) {
      return false;
    }

    const angleDelta = shortestAngleDelta(Math.atan2(dy, dx), facing);
    return Math.abs(angleDelta) <= halfArc;
  });
}

function applyDamageToCombatTarget(target, damage, { hitFlash = 0.15, damageFloatDuration = 0.58, attackMode = "single" } = {}) {
  const entity = target?.entity ?? target;
  if (!entity || !Number.isFinite(damage) || damage <= 0 || (entity.health ?? 0) <= 0) {
    return null;
  }

  const resolvedDamage = calculateResolvedDamage({
    baseDamage: damage,
    target,
    attackMode,
  });
  entity.health = clamp(entity.health - resolvedDamage.finalDamage, 0, entity.maxHealth);
  recordDamageToDps(resolvedDamage.finalDamage);
  const lifeStealRatio = typeof getEquippedArtifactPassiveEffectTotal === "function"
    ? Math.max(0, getEquippedArtifactPassiveEffectTotal("lifeStealRatio", state.game))
    : 0;
  if (lifeStealRatio > 0 && state.game?.player && typeof applyPlayerHealing === "function") {
    applyPlayerHealing(state.game.player, resolvedDamage.finalDamage * lifeStealRatio, {
      displayAmount: resolvedDamage.finalDamage * lifeStealRatio,
      duration: 0.58,
    });
  }
  entity.hitFlash = hitFlash;
  entity.damageFloat = {
    value: resolvedDamage.finalDamage,
    timer: damageFloatDuration,
    duration: damageFloatDuration,
  };
  if (entity.health <= 0 && target?.kind === "monster") {
    const reward = Math.max(0, Math.floor(Number(entity.experienceReward ?? 1)));
    if (reward > 0) {
      const experienceResult = grantPlayerExperience(state.game?.player, reward, {
        chapter: state.game?.chapter ?? 1,
      });
      if (experienceResult?.levelsGained > 0 && typeof queueLevelUpRewardSelections === "function") {
        queueLevelUpRewardSelections(experienceResult.levelsGained);
      }
    }
  }
  if (entity.health <= 0 && target?.kind === "dummy") {
    entity.respawnTimer = entity.respawnDelay ?? 0.45;
  }
  return resolvedDamage;
}

function recordDamageToDps(amount) {
  if (!state.game || !Number.isFinite(amount) || amount <= 0) {
    return;
  }
  if (!state.game.combatMetrics) {
    state.game.combatMetrics = { damageEvents: [], dps: 0, totalDamage: 0 };
  }
  state.game.combatMetrics.damageEvents.push({
    amount,
    at: performance.now(),
  });
  state.game.combatMetrics.totalDamage = (state.game.combatMetrics.totalDamage ?? 0) + amount;
}

function updateDpsMetric() {
  if (!state.game?.combatMetrics) {
    return;
  }

  const now = performance.now();
  const windowMs = DPS_SAMPLE_WINDOW_SECONDS * 1000;
  const events = state.game.combatMetrics.damageEvents;
  while (events.length && (now - events[0].at) > windowMs) {
    const expired = events.shift();
    state.game.combatMetrics.totalDamage = Math.max(
      0,
      (state.game.combatMetrics.totalDamage ?? 0) - (expired?.amount ?? 0),
    );
  }

  state.game.combatMetrics.dps = (state.game.combatMetrics.totalDamage ?? 0) / DPS_SAMPLE_WINDOW_SECONDS;
}

function swingDurationFromPlayer(player) {
  const actionSpeed = Math.max(1, player?.actionSpeed || player?.attackSpeed || 1);
  return clamp(0.36 / actionSpeed, 0.12, 0.24);
}

function swingCooldownFromPlayer(player) {
  const actionSpeed = Math.max(1, player?.actionSpeed || player?.attackSpeed || 1);
  return clamp(0.62 / actionSpeed, 0.18, 0.5);
}

function triggerTitanGrowthFinisher() {
  if (!state.game || hasOpenHudOverlay()) {
    return false;
  }

  const { player, scene } = state.game;
  const titanWeapon = getTitanGrowthPassiveWeapon(state.game);
  const titanGrowth = player?.titanGrowth;
  if (
    !player
    || !scene
    || !titanWeapon
    || !titanGrowth
    || titanGrowth.weaponId !== titanWeapon.id
    || !titanGrowth.active
  ) {
    return false;
  }

  const totalManaSpent = Math.max(0, Number(titanGrowth.totalManaSpent ?? 0) || 0);
  if (totalManaSpent <= 0) {
    return false;
  }

  const actionSpeed = Math.max(1, player.actionSpeed || player.attackSpeed || 1);
  const range = weaponRangeValue(scene, player, titanWeapon);
  const visualRange = weaponVisualRangeValue(scene, player, titanWeapon);
  const rangeFactor = Math.max(1, range / Math.max(1, scene.tileSize));
  const damage = Math.max(
    1,
    Math.round(
      weaponDamageValue(player, titanWeapon)
      * totalManaSpent
      * rangeFactor,
    ),
  );
  const duration = clamp(0.14 / actionSpeed, 0.05, 0.12);
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const targetKeysInRange = getCombatTargets()
    .filter((target) => (
      isCombatTargetAlive(target)
      && combatTargetDistanceFromPoint(target, combatAnchor.worldX, combatAnchor.worldY) <= range
    ))
    .map((target) => target.key);

  player.attackCooldown = Math.max(player.attackCooldown || 0, clamp(0.26 / actionSpeed, 0.08, 0.18));
  player.screenShake = {
    timer: clamp(0.18 + totalManaSpent * 0.01, 0.18, 0.34),
    duration: clamp(0.18 + totalManaSpent * 0.01, 0.18, 0.34),
    amplitude: clamp(6 + totalManaSpent * 0.9, 6, 18),
  };
  player.swing = {
    mode: "titan-burst",
    timer: duration,
    duration,
    halfArc: Math.PI,
    range,
    visualRange,
    damage,
    currentAngle: player.facing - Math.PI,
    targetKeysInRange,
    hitTargetKeys: [],
    weaponId: titanWeapon.id,
    titanFinisherManaSpent: totalManaSpent,
  };
  return true;
}

function triggerMeleeAttack() {
  if (!state.game || hasOpenHudOverlay()) {
    return;
  }

  const { player } = state.game;
  const combatAnchor = getPlayerCombatAnchor(player, state.game.scene);
  const profile = currentAttackProfile();
  if (!profile || player.attackCooldown > 0) {
    return;
  }

  const duration = swingDurationFromPlayer(player);
  player.attackCooldown = swingCooldownFromPlayer(player);
  const targetKeysInRange = collectTargetsInAttackArc({
    originX: combatAnchor.worldX,
    originY: combatAnchor.worldY,
    range: profile.range,
    facing: player.facing,
    halfArc: profile.halfArc,
  }).map((target) => target.key);
  if (profile.mode === "dual") {
    player.swing = {
      mode: "dual-cross",
      timer: duration,
      duration,
      halfArc: profile.halfArc,
      range: profile.range,
      visualRange: profile.visualRange ?? profile.range,
      damage: profile.damage,
      currentAngleA: player.facing - profile.halfArc,
      currentAngleB: player.facing + profile.halfArc,
      targetKeysInRange,
      hitTargetKeys: [],
      weaponIds: profile.weaponIds.slice(0, 2),
    };
    return;
  }

  const [weapon] = profile.weapons;
  player.swing = {
    mode: "single",
    timer: duration,
    duration,
    halfArc: profile.halfArc,
    range: profile.range,
    visualRange: profile.visualRange ?? profile.range,
    damage: profile.damage,
    currentAngle: player.facing - Math.PI * 0.5,
    targetKeysInRange,
    hitTargetKeys: [],
    weaponId: weapon.id,
  };
}

function applySwingHits() {
  if (!state.game?.player.swing) {
    return;
  }

  const { player } = state.game;
  const swing = player.swing;
  const scene = state.game.scene;
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const targetsByKey = new Map(
    getCombatTargets().map((target) => [target.key, target]),
  );

  (swing.targetKeysInRange || []).forEach((targetKey) => {
    if (swing.hitTargetKeys.includes(targetKey)) {
      return;
    }

    const target = targetsByKey.get(targetKey);
    if (!target || !isCombatTargetAlive(target)) {
      return;
    }

    swing.hitTargetKeys.push(targetKey);
    applyDamageToCombatTarget(target, swing.damage, {
      hitFlash: 0.15,
      damageFloatDuration: 0.58,
      attackMode: swing.mode === "dual-cross" ? "dual-cross" : "single",
    });
    const impactAngle = Math.atan2(
      Number(target.worldY ?? target.entity?.worldY ?? combatAnchor.worldY) - combatAnchor.worldY,
      Number(target.worldX ?? target.entity?.worldX ?? combatAnchor.worldX) - combatAnchor.worldX,
    );
    queuePlayerAttackImpactStreak(player, scene, target, impactAngle, {
      lengthScale: swing.mode === "dual-cross" ? 0.62 : 0.7,
      widthScale: 0.02,
      duration: 0.05,
    });
  });
}

function updateSpinState(dt) {
  if (!state.game) {
    return;
  }

  const { player } = state.game;
  if (state.input.attackHeld && state.input.attackHoldStartedAt > 0) {
    state.input.attackHoldTime = (performance.now() - state.input.attackHoldStartedAt) / 1000;
  } else {
    state.input.attackHoldTime = 0;
  }

  const canSpin = state.input.attackHeld && !hasOpenHudOverlay() && hasSpinPassiveLoadout();

  if (!canSpin || player.mana <= 0) {
    if (player.spin) {
      startPhysicalBoostDecay(player);
    }
    player.spin = null;
    return;
  }

  const profile = currentAttackProfile();
  if (!profile || profile.mode !== "dual" || !hasSpinPassiveLoadout()) {
    player.spin = null;
    return;
  }

  if (!player.spin && state.input.attackHoldTime < SPIN_CHARGE_DURATION) {
    return;
  }

  if (!player.spin) {
    const skillRangeScale = Math.max(
      0.25,
      Number(
        typeof playerSkillRangeMultiplier === "function"
          ? playerSkillRangeMultiplier(player, state.game?.chapter ?? 1)
        : 1,
      ) || 1,
    );
    const spinVisualRange = profile.range * skillRangeScale * ACTIVE_TWIN_SPIN_RANGE_MULTIPLIER;
    const spinWeapons = profile.weaponIds
      .slice(0, 2)
      .map((weaponId) => getWeaponById(weaponId))
      .filter(Boolean);
    const spinBladeMetrics = spinWeapons.length
      ? spinWeapons.map((weapon) => resolveSpinBladeMetrics(state.game.scene, spinVisualRange, weapon))
      : [{ swordSize: Math.max(state.game.scene.tileSize * 0.74, spinVisualRange * 0.54), swordDistance: spinVisualRange * 0.74, tipRadius: spinVisualRange }];
    player.spin = {
      angle: player.facing,
      weaponIds: profile.weaponIds.slice(0, 2),
      range: Math.max(...spinBladeMetrics.map((entry) => entry.tipRadius)),
      visualRange: spinVisualRange,
      visualDistance: Math.max(...spinBladeMetrics.map((entry) => entry.swordDistance)),
      bladeSize: Math.max(...spinBladeMetrics.map((entry) => entry.swordSize)),
      damage: profile.damage,
      hitTimers: {},
    };
    player.swing = null;
  } else {
    const skillRangeScale = Math.max(
      0.25,
      Number(
        typeof playerSkillRangeMultiplier === "function"
          ? playerSkillRangeMultiplier(player, state.game?.chapter ?? 1)
        : 1,
      ) || 1,
    );
    const spinVisualRange = profile.range * skillRangeScale * ACTIVE_TWIN_SPIN_RANGE_MULTIPLIER;
    const spinWeapons = profile.weaponIds
      .slice(0, 2)
      .map((weaponId) => getWeaponById(weaponId))
      .filter(Boolean);
    const spinBladeMetrics = spinWeapons.length
      ? spinWeapons.map((weapon) => resolveSpinBladeMetrics(state.game.scene, spinVisualRange, weapon))
      : [{ swordSize: Math.max(state.game.scene.tileSize * 0.74, spinVisualRange * 0.54), swordDistance: spinVisualRange * 0.74, tipRadius: spinVisualRange }];
    player.spin.weaponIds = profile.weaponIds.slice(0, 2);
    player.spin.range = Math.max(...spinBladeMetrics.map((entry) => entry.tipRadius));
    player.spin.visualRange = spinVisualRange;
    player.spin.visualDistance = Math.max(...spinBladeMetrics.map((entry) => entry.swordDistance));
    player.spin.bladeSize = Math.max(...spinBladeMetrics.map((entry) => entry.swordSize));
    player.spin.damage = profile.damage;
  }

  spendPlayerMana(player, SPIN_MANA_COST_PER_SECOND * dt);

  player.spin.angle += SPIN_BASE_RATE * Math.max(1, player.actionSpeed || player.attackSpeed || 1) * dt;
}

function updateTitanGrowthState(dt) {
  if (!state.game?.player) {
    return;
  }

  const { player } = state.game;
  const titanWeapon = getTitanGrowthPassiveWeapon(state.game);
  const canChannel = Boolean(
    state.input.attackHeld
    && !hasOpenHudOverlay()
    && titanWeapon
  );

  if (!canChannel) {
    player.titanGrowth = null;
    return;
  }

  const skill = titanWeapon.titanGrowthSkill;
  if (!skill?.enabled) {
    player.titanGrowth = null;
    return;
  }

  if (!player.titanGrowth || player.titanGrowth.weaponId !== titanWeapon.id) {
    player.titanGrowth = {
      weaponId: titanWeapon.id,
      active: true,
      totalManaSpent: 0,
      manaCostPerSecond: Math.max(0, Number(skill.manaCostPerSecond ?? 0) || 0),
      rangeSizeBonusPerMana: Math.max(0, Number(skill.rangeSizeBonusPerMana ?? 0) || 0),
      rangeMultiplier: 1,
    };
  }

  const manaCostPerSecond = Math.max(0, Number(skill.manaCostPerSecond ?? 0) || 0);
  const requestedMana = manaCostPerSecond * Math.max(0, Number(dt) || 0);
  const spentMana = spendPlayerMana(player, requestedMana);
  if (requestedMana > 0 && spentMana <= 0) {
    player.titanGrowth = null;
    return;
  }

  player.titanGrowth.active = true;
  player.titanGrowth.manaCostPerSecond = manaCostPerSecond;
  player.titanGrowth.rangeSizeBonusPerMana = Math.max(0, Number(skill.rangeSizeBonusPerMana ?? 0) || 0);
  player.titanGrowth.totalManaSpent = Math.max(
    0,
    Number(player.titanGrowth.totalManaSpent ?? 0) + spentMana,
  );
  player.titanGrowth.rangeMultiplier = Number((
    1 + player.titanGrowth.totalManaSpent * player.titanGrowth.rangeSizeBonusPerMana
  ).toFixed(3));
}

function updatePhysicalBoostDecay() {
  if (!state.game?.player) {
    return;
  }

  const { player } = state.game;
  if (player.spin || (player.physicalBoostStacks ?? 0) <= 0) {
    return;
  }

  if (!player.physicalBoostExpiresAt || player.physicalBoostExpiresAt <= 0) {
    startPhysicalBoostDecay(player);
    return;
  }

  if (performance.now() >= player.physicalBoostExpiresAt) {
    resetPhysicalBoostStacks(player);
  }
}

function applySpinHits(dt) {
  if (!state.game?.player.spin) {
    return;
  }

  const { player } = state.game;
  const scene = state.game.scene;
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const spin = player.spin;
  const hitInterval = clamp(0.24 / Math.max(1, player.actionSpeed || player.attackSpeed || 1), 0.08, 0.22);
  const bladeTolerance = Math.PI * 0.34;
  const targets = getCombatTargets();

  targets.forEach((target) => {
    if (!isCombatTargetAlive(target)) {
      return;
    }

    const targetKey = getCombatTargetKey(target);
    const timer = spin.hitTimers[targetKey] ?? 0;
    if (timer > 0) {
      spin.hitTimers[targetKey] = Math.max(0, timer - dt);
      return;
    }

    const dx = target.worldX - combatAnchor.worldX;
    const dy = target.worldY - combatAnchor.worldY;
    const distance = combatTargetDistanceFromPoint(target, combatAnchor.worldX, combatAnchor.worldY);
    if (distance > spin.range) {
      return;
    }

    const angleToTarget = Math.atan2(dy, dx);
    const deltaA = Math.abs(shortestAngleDelta(angleToTarget, spin.angle));
    const deltaB = Math.abs(shortestAngleDelta(angleToTarget, spin.angle + Math.PI));
    if (deltaA > bladeTolerance && deltaB > bladeTolerance) {
      return;
    }

    applyDamageToCombatTarget(target, spin.damage, {
      hitFlash: 0.16,
      damageFloatDuration: 0.56,
      attackMode: "spin",
    });
    queuePlayerAttackImpactStreak(player, scene, target, angleToTarget, {
      lengthScale: 0.6,
      widthScale: 0.018,
      duration: 0.045,
    });
    spin.hitTimers[targetKey] = hitInterval;
  });
}


function getVisibleDummies(player, dummies, width, height) {
  const cameraLeft = player.worldX - width * 0.5;
  const cameraTop = player.worldY - height * 0.5;
  return dummies
    .map((dummy) => ({
      ...dummy,
      screenX: dummy.worldX - cameraLeft,
      screenY: dummy.worldY - cameraTop,
      healthRatio: dummy.maxHealth > 0 ? dummy.health / dummy.maxHealth : 0,
    }))
    .filter((dummy) => (
      dummy.screenX > -80
      && dummy.screenX < width + 80
      && dummy.screenY > -120
      && dummy.screenY < height + 120
    ));
}

function drawSpinChargeDonut(player, drawHeight) {
  if (!state.input.attackHeld || player.spin || !hasSpinPassiveLoadout()) {
    return;
  }

  const progress = clamp((state.input.attackHoldTime || 0) / SPIN_CHARGE_DURATION, 0, 1);
  const centerX = player.screenX;
  const centerY = player.screenY - drawHeight * 0.62;
  const baseOuterRadius = Math.max(30, player.radius * 2.15);
  const outerRadius = Math.max(3.3, baseOuterRadius * 0.20);
  const innerRadius = outerRadius * 0.64;
  const ringRadius = (outerRadius + innerRadius) * 0.5;
  const ringWidth = outerRadius - innerRadius;
  const startAngle = -Math.PI * 0.5;
  const endAngle = startAngle + Math.PI * 2 * progress;
  const sweep = (state.time * 0.0024) % (Math.PI * 2);

  ctx.save();
  ctx.lineCap = "round";

  ctx.strokeStyle = "rgba(10, 16, 18, 0.78)";
  ctx.lineWidth = Math.max(0.8, ringWidth);
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    const chargeColor = progress >= 1 ? "rgba(122, 231, 176, 0.96)" : "rgba(117, 196, 255, 0.92)";
    ctx.strokeStyle = chargeColor;
    ctx.lineWidth = Math.max(0.8, ringWidth * 0.88);
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, startAngle, endAngle);
    ctx.stroke();

    const headSpread = 0.28;
    const headAngle = startAngle + Math.PI * 2 * progress;
    ctx.strokeStyle = progress >= 1 ? "rgba(211, 255, 235, 0.98)" : "rgba(205, 236, 255, 0.96)";
    ctx.lineWidth = Math.max(0.8, ringWidth * 0.34);
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, headAngle - headSpread, headAngle);
    ctx.stroke();
  }

  for (let i = 0; i < 5; i += 1) {
    const segLen = 0.2;
    const segStart = startAngle + sweep + i * 0.72;
    const alpha = progress >= 1 ? 0.48 : 0.28;
    ctx.strokeStyle = `rgba(242, 233, 215, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius + 0.5, segStart, segStart + segLen);
    ctx.stroke();
  }

  if (progress >= 1) {
    const pulse = 0.3 + (Math.sin(state.time * 0.015) * 0.5 + 0.5) * 0.28;
    ctx.strokeStyle = `rgba(139, 255, 193, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius + 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawVisibleDummies(visibleDummies, scene) {
  visibleDummies.forEach((dummy) => {
    const bodyHeight = scene.tileSize * 0.48;
    const bodyWidth = scene.tileSize * 0.18;
    const headSize = scene.tileSize * 0.26;
    const clothSize = scene.tileSize * 0.18;
    const barWidth = scene.tileSize * 0.52;
    const barHeight = 6;

    drawPropShadow(dummy.screenX, dummy.screenY + bodyHeight * 0.42, scene.tileSize * 0.2, scene.tileSize * 0.08, 0.26);

    const hitAlpha = dummy.hitFlash > 0 ? 0.22 + dummy.hitFlash * 2.4 : 0;
    ctx.fillStyle = hitAlpha > 0 ? `rgba(106, 44, 44, ${0.82 + hitAlpha * 0.18})` : "rgba(36, 23, 18, 0.95)";
    fillRoundRect(dummy.screenX - bodyWidth * 0.5, dummy.screenY - bodyHeight * 0.08, bodyWidth, bodyHeight, 6);

    ctx.fillStyle = hitAlpha > 0 ? `rgba(172, 82, 60, ${0.8 + hitAlpha * 0.14})` : "rgba(86, 57, 40, 0.95)";
    fillRoundRect(dummy.screenX - bodyWidth * 0.24, dummy.screenY + bodyHeight * 0.36, bodyWidth * 0.48, scene.tileSize * 0.16, 5);

    ctx.fillStyle = "rgba(63, 19, 24, 0.92)";
    fillRoundRect(dummy.screenX - clothSize * 1.25, dummy.screenY - bodyHeight * 0.14, clothSize, clothSize * 0.7, 6);
    fillRoundRect(dummy.screenX + clothSize * 0.25, dummy.screenY - bodyHeight * 0.14, clothSize, clothSize * 0.7, 6);

    const headGlow = ctx.createRadialGradient(
      dummy.screenX,
      dummy.screenY - bodyHeight * 0.32,
      headSize * 0.12,
      dummy.screenX,
      dummy.screenY - bodyHeight * 0.32,
      headSize * 0.8,
    );
    headGlow.addColorStop(0, "rgba(255, 160, 92, 0.2)");
    headGlow.addColorStop(1, "rgba(255, 160, 92, 0)");
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(dummy.screenX, dummy.screenY - bodyHeight * 0.32, headSize * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(188, 171, 146, 0.96)";
    fillRoundRect(dummy.screenX - headSize * 0.5, dummy.screenY - bodyHeight * 0.48, headSize, headSize, 10);

    ctx.fillStyle = "rgba(71, 59, 52, 0.95)";
    fillRoundRect(dummy.screenX - headSize * 0.26, dummy.screenY - bodyHeight * 0.23, headSize * 0.18, headSize * 0.18, 3);
    fillRoundRect(dummy.screenX + headSize * 0.08, dummy.screenY - bodyHeight * 0.23, headSize * 0.18, headSize * 0.18, 3);

    ctx.fillStyle = "rgba(22, 28, 24, 0.9)";
    fillRoundRect(dummy.screenX - barWidth * 0.5, dummy.screenY - bodyHeight * 0.88, barWidth, barHeight, 4);
    ctx.fillStyle = "rgba(201, 98, 85, 0.92)";
    fillRoundRect(
      dummy.screenX - barWidth * 0.5 + 1,
      dummy.screenY - bodyHeight * 0.88 + 1,
      (barWidth - 2) * dummy.healthRatio,
      barHeight - 2,
      3,
    );

    ctx.fillStyle = "#d0c5ad";
    ctx.font = '11px "Avenir Next", "Trebuchet MS", sans-serif';
    ctx.fillText(`Dummy ${dummy.id}`, dummy.screenX - barWidth * 0.5, dummy.screenY - bodyHeight);

    if (dummy.damageFloat?.timer > 0) {
      const rise = (1 - dummy.damageFloat.timer / dummy.damageFloat.duration) * scene.tileSize * 0.35;
      ctx.fillStyle = "rgba(255, 210, 180, 0.92)";
      ctx.font = 'bold 14px "Avenir Next", "Trebuchet MS", sans-serif';
      ctx.fillText(`-${dummy.damageFloat.value}`, dummy.screenX - 12, dummy.screenY - bodyHeight - 14 - rise);
    }
  });
}

function drawPlayerCombatVisuals(player, scene, drawHeight) {
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  drawSpinChargeDonut(player, drawHeight);
  drawBeamChargePreview(player, scene);
  drawPlayerBeamVisual(player, scene, drawHeight);

  const getTitanPulseForWeapon = (weapon) => {
    if (!weapon?.titanGrowthSkill?.enabled) {
      return 0;
    }
    let titanManaSpent = 0;
    if (player.titanGrowth && player.titanGrowth.weaponId === weapon.id) {
      titanManaSpent = Number(player.titanGrowth.totalManaSpent ?? 0);
    } else if (
      player.swing?.mode === "titan-burst"
      && player.swing.weaponId === weapon.id
    ) {
      titanManaSpent = Number(player.swing.titanFinisherManaSpent ?? 0);
    }
    if (titanManaSpent <= 0) {
      return 0;
    }
    return clamp(
      0.35 + Math.min(1.2, titanManaSpent * 0.08),
      0.35,
      1.4,
    );
  };

  const drawTitanAwareBladeSprite = (weapon, swordPose) => {
    if (!weapon?.image?.complete || !swordPose) {
      return;
    }

    const titanPulse = getTitanPulseForWeapon(weapon);
    const drawOffset = resolveWeaponSpriteDrawOffset(weapon, swordPose.swordSize);
    ctx.save();
    ctx.translate(swordPose.x, swordPose.y);
    ctx.rotate(swordPose.rotation);
    if (titanPulse > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "rgba(255, 236, 182, 0.95)";
      ctx.shadowBlur = Math.min(scene.tileSize * 1.3, swordPose.swordSize * (0.16 + titanPulse * 0.12));
    }
    drawWholePixelImage(
      weapon.image,
      drawOffset.x,
      drawOffset.y,
      swordPose.swordSize,
      swordPose.swordSize,
    );
    ctx.restore();
  };

  if (player.titanGrowth && !player.spin && !player.swing) {
    const titanWeapons = getTitanGrowthPassiveWeapons(state.game).slice(0, 2);
    titanWeapons.forEach((titanWeapon, index) => {
      if (!titanWeapon?.image?.complete) {
        return;
      }
      const titanVisualRange = weaponVisualRangeValue(scene, player, titanWeapon);
      const titanMetrics = resolveDisplayedMeleeBladeMetrics(
        scene,
        player,
        titanWeapon,
        titanVisualRange,
      );
      const titanAngle = player.facing + (index * Math.PI);
      const titanPose = resolveMeleeSwingBladePose(
        combatAnchor,
        titanWeapon,
        titanAngle,
        titanMetrics.swordDistance,
        titanMetrics.swordSize,
      );
      if (titanPose) {
        drawTitanAwareBladeSprite(titanWeapon, titanPose);
      }
    });
  }

  if (player.swing) {
    const liveSwingRanges = resolveCurrentSwingRanges(player, scene, player.swing);
    const slashRadius = liveSwingRanges.range;
    const swingVisualRange = liveSwingRanges.visualRange;
    const swingSwordSize = Math.max(scene.tileSize * 0.74, swingVisualRange * 0.54);
    const swingProgress = clamp(
      1 - Number(player.swing.timer ?? 0) / Math.max(0.001, Number(player.swing.duration ?? 0.18) || 0.18),
      0,
      1,
    );
    const slashThickness = Math.min(
      scene.tileSize * 0.34,
      Math.max(scene.tileSize * 0.065, swingSwordSize * 0.095),
    );
    const titanBurstIntensity = player.swing.mode === "titan-burst"
      ? clamp(Number(player.swing.titanFinisherManaSpent ?? 0) / 18, 0, 1.4)
      : 0;
    const resolveTitanBurstShake = (angle) => {
      if (player.swing.mode !== "titan-burst") {
        return { x: 0, y: 0, rotation: 0 };
      }
      const releaseFactor = Math.max(0, 1 - swingProgress);
      const amplitude = scene.tileSize * (0.028 + titanBurstIntensity * 0.018) * (0.58 + releaseFactor * 0.42);
      const phase = state.time * 0.07 + angle * 5.3;
      return {
        x: Math.cos(phase) * amplitude,
        y: Math.sin(phase * 1.37) * amplitude * 0.82,
        rotation: Math.sin(phase * 1.9) * (0.022 + titanBurstIntensity * 0.01) * (0.72 + releaseFactor * 0.28),
      };
    };
    const drawRangeEdgeSlashAtAngle = (angle, directionSign = 1) => {
      const fade = Math.sin(swingProgress * Math.PI);
      if (fade <= 0.02) {
        return;
      }

      const shake = resolveTitanBurstShake(angle);
      const centerX = combatAnchor.screenX + shake.x;
      const centerY = combatAnchor.screenY + shake.y;
      const safeDirectionSign = directionSign >= 0 ? 1 : -1;
      const halfArc = Math.max(0.14, Number(player.swing.halfArc ?? Math.PI * 0.36) * 0.22);
      const trailArc = halfArc * (0.86 - fade * 0.12);
      const leadArc = halfArc * (0.16 + fade * 0.06);
      const outerRadius = slashRadius * (0.885 + fade * 0.015);
      const midRadius = Math.max(outerRadius - slashThickness * 0.22, outerRadius * 0.92);
      const coreRadius = Math.max(midRadius - slashThickness * 0.12, outerRadius * 0.88);
      const startAngle = safeDirectionSign > 0
        ? angle - trailArc
        : angle - leadArc;
      const endAngle = safeDirectionSign > 0
        ? angle + leadArc
        : angle + trailArc;
      const tipAngle = safeDirectionSign > 0 ? endAngle : startAngle;
      const tipX = centerX + Math.cos(tipAngle) * outerRadius;
      const tipY = centerY + Math.sin(tipAngle) * outerRadius;
      const tailAngle = safeDirectionSign > 0 ? startAngle : endAngle;
      const tailX = centerX + Math.cos(tailAngle) * outerRadius;
      const tailY = centerY + Math.sin(tailAngle) * outerRadius;
      const drawSlashPoint = (pointAngle, tangentDirection, alphaScale = 1) => {
        const tangentX = -Math.sin(pointAngle) * tangentDirection;
        const tangentY = Math.cos(pointAngle) * tangentDirection;
        const radialX = Math.cos(pointAngle);
        const radialY = Math.sin(pointAngle);
        const baseX = centerX + Math.cos(pointAngle) * midRadius;
        const baseY = centerY + Math.sin(pointAngle) * midRadius;
        const pointLength = slashThickness * (0.82 + fade * 0.12) * alphaScale;
        const pointWidth = slashThickness * (0.16 + fade * 0.03) * alphaScale;
        const leftX = baseX - tangentX * pointLength * 0.18 + radialX * pointWidth;
        const leftY = baseY - tangentY * pointLength * 0.18 + radialY * pointWidth;
        const rightX = baseX - tangentX * pointLength * 0.18 - radialX * pointWidth;
        const rightY = baseY - tangentY * pointLength * 0.18 - radialY * pointWidth;
        const apexX = baseX + tangentX * pointLength;
        const apexY = baseY + tangentY * pointLength;

        ctx.beginPath();
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(apexX, apexY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + fade * 0.14})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo((leftX + baseX) * 0.5, (leftY + baseY) * 0.5);
        ctx.lineTo(apexX, apexY);
        ctx.lineTo((rightX + baseX) * 0.5, (rightY + baseY) * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 244, 228, ${0.36 + fade * 0.08})`;
        ctx.fill();
      };

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "butt";
      ctx.shadowColor = "rgba(255, 255, 255, 0.82)";
      ctx.shadowBlur = Math.min(scene.tileSize * 1.2, slashThickness * (0.9 + fade * 0.28));
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.strokeStyle = `rgba(255, 245, 236, ${0.12 + fade * 0.08})`;
      ctx.lineWidth = slashThickness * (1.18 + fade * 0.12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, midRadius, startAngle + 0.02, endAngle - 0.02);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.36 + fade * 0.12})`;
      ctx.lineWidth = slashThickness * (0.58 + fade * 0.1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, startAngle + 0.04, endAngle - 0.04);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.84 + fade * 0.1})`;
      ctx.lineWidth = Math.max(1, slashThickness * 0.24);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + fade * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      drawSlashPoint(
        tipAngle,
        safeDirectionSign > 0 ? 1 : -1,
        1,
      );
      drawSlashPoint(
        tailAngle,
        safeDirectionSign > 0 ? -0.72 : 0.72,
        0.82,
      );
      ctx.restore();
    };

    const drawBladeAtAngle = (weapon, angle) => {
      if (!weapon?.image?.complete) {
        return;
      }
      const bladeMetrics = resolveDisplayedMeleeBladeMetrics(
        scene,
        player,
        weapon,
        swingVisualRange,
      );
      const swordPose = resolveMeleeSwingBladePose(
        combatAnchor,
        weapon,
        angle,
        bladeMetrics.swordDistance,
        bladeMetrics.swordSize,
      );
      if (!swordPose) {
        return;
      }
      const shake = resolveTitanBurstShake(angle);
      swordPose.x += shake.x;
      swordPose.y += shake.y;
      swordPose.tipX += shake.x;
      swordPose.tipY += shake.y;
      swordPose.rotation += shake.rotation;
      drawTitanAwareBladeSprite(weapon, swordPose);
    };

    if (player.swing.mode === "dual-cross") {
      const firstWeapon = getWeaponById(player.swing.weaponIds?.[0]);
      const secondWeapon = getWeaponById(player.swing.weaponIds?.[1]);
      drawRangeEdgeSlashAtAngle(player.swing.currentAngleA ?? player.facing, 1);
      drawRangeEdgeSlashAtAngle(player.swing.currentAngleB ?? (player.facing + Math.PI), -1);
      drawBladeAtAngle(firstWeapon, player.swing.currentAngleA ?? player.facing);
      drawBladeAtAngle(secondWeapon, player.swing.currentAngleB ?? (player.facing + Math.PI));
    } else {
      const weapon = getWeaponById(player.swing.weaponId);
      drawRangeEdgeSlashAtAngle(player.swing.currentAngle ?? player.facing, 1);
      if (
        player.swing.mode === "titan-burst"
        && getTitanGrowthPassiveWeapons(state.game).length >= 2
      ) {
        drawRangeEdgeSlashAtAngle((player.swing.currentAngle ?? player.facing) + Math.PI, -1);
        drawBladeAtAngle(weapon, (player.swing.currentAngle ?? player.facing) + Math.PI);
      }
      drawBladeAtAngle(weapon, player.swing.currentAngle ?? player.facing);
    }
  }

  if (player.spin) {
    const firstWeapon = getWeaponById(player.spin.weaponIds?.[0]);
    const secondWeapon = getWeaponById(player.spin.weaponIds?.[1]);
    const spinRadius = Math.max(0, Number(player.spin.range ?? 0) || 0);
    const spinVisualRange = Math.max(0, Number(player.spin.visualRange ?? spinRadius) || spinRadius);
    const spinSize = Math.max(scene.tileSize * 0.74, Number(player.spin.bladeSize ?? 0) || spinVisualRange * 0.54);
    const spinDistance = Math.max(0, Number(player.spin.visualDistance ?? 0) || spinVisualRange * 0.74);
    const spinSlashThickness = Math.max(scene.tileSize * 0.075, spinSize * 0.11);
    const stackIntensity = clamp(Math.max(0, Number(player.physicalBoostStacks ?? 0)) / 18, 0, 1);
    const spinPulse = 0.55 + (Math.sin(state.time * 0.018) * 0.5 + 0.5) * 0.45;

    const resolveSpinBladePose = (weapon, angle) => resolveMeleeSwingBladePose(
      combatAnchor,
      weapon,
      angle,
      spinDistance,
      spinSize,
    );

    const drawSpinTrail = (weapon, angle) => {
      const bladePose = resolveSpinBladePose(weapon, angle);
      if (!bladePose) {
        return;
      }
      const tipX = bladePose.tipX;
      const tipY = bladePose.tipY;
      const previousBladePoseA = resolveSpinBladePose(weapon, angle - 0.09);
      const previousBladePoseB = resolveSpinBladePose(weapon, angle - 0.18);
      const previousBladePoseC = resolveSpinBladePose(weapon, angle - 0.27);
      if (!previousBladePoseA || !previousBladePoseB || !previousBladePoseC) {
        return;
      }
      const tailAX = previousBladePoseA.tipX;
      const tailAY = previousBladePoseA.tipY;
      const tailBX = previousBladePoseB.tipX;
      const tailBY = previousBladePoseB.tipY;
      const tailCX = previousBladePoseC.tipX;
      const tailCY = previousBladePoseC.tipY;
      const tipGlowRadius = spinSlashThickness * (0.15 + spinPulse * 0.05);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(255, 255, 255, 0.92)";
      ctx.shadowBlur = spinSlashThickness * (0.9 + stackIntensity * 0.28);

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.bezierCurveTo(tailAX, tailAY, tailBX, tailBY, tailCX, tailCY);
      ctx.strokeStyle = `rgba(255, 246, 238, ${0.16 + stackIntensity * 0.06})`;
      ctx.lineWidth = spinSlashThickness * (0.92 + stackIntensity * 0.12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.bezierCurveTo(
        tipX + (tailAX - tipX) * 0.92,
        tipY + (tailAY - tipY) * 0.92,
        tailAX + (tailBX - tailAX) * 0.72,
        tailAY + (tailBY - tailAY) * 0.72,
        tailBX + (tailCX - tailBX) * 0.5,
        tailBY + (tailCY - tailBY) * 0.5,
      );
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.44 + stackIntensity * 0.08})`;
      ctx.lineWidth = spinSlashThickness * (0.42 + stackIntensity * 0.05);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(tailAX, tailAY, tailBX, tailBY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = Math.max(1, spinSlashThickness * 0.14);
      ctx.stroke();

      ctx.shadowBlur = spinSlashThickness * (0.72 + stackIntensity * 0.2);
      ctx.beginPath();
      ctx.arc(tipX, tipY, tipGlowRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.26 + stackIntensity * 0.08})`;
      ctx.fill();
      ctx.restore();
    };

    const drawSpinBlade = (weapon, angle) => {
      if (!weapon?.image?.complete) {
        return;
      }
      const bladePose = resolveSpinBladePose(weapon, angle);
      if (!bladePose) {
        return;
      }
      const beamHighlightIntensity = player.beam?.weaponId === weapon.id
        ? 0.82 + spinPulse * 0.18
        : 0;
      if (beamHighlightIntensity > 0 && typeof drawBeamWeaponSprite === "function") {
        drawBeamWeaponSprite(weapon, bladePose, {
          filter: "brightness(1.08) saturate(1.12)",
          highlightIntensity: beamHighlightIntensity,
        });
        return;
      }
      ctx.save();
      ctx.translate(bladePose.x, bladePose.y);
      ctx.rotate(bladePose.rotation);
      const spinDrawOffset = resolveWeaponSpriteDrawOffset(weapon, spinSize);
      drawWholePixelImage(weapon.image, spinDrawOffset.x, spinDrawOffset.y, spinSize, spinSize);
      ctx.restore();
    };

    drawSpinTrail(firstWeapon, player.spin.angle);
    drawSpinTrail(secondWeapon, player.spin.angle + Math.PI);
    drawSpinBlade(firstWeapon, player.spin.angle);
    drawSpinBlade(secondWeapon, player.spin.angle + Math.PI);
  }
}
