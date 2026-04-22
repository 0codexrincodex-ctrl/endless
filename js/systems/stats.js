const PLAYER_LEVEL_START_EXP = 1n;
const PLAYER_STAT_POINTS_PER_LEVEL = 5;
const PLAYER_CORE_STAT_BASE = 10;
const PLAYER_CORE_STAT_KEYS = ["vitality", "power", "guard", "agility", "instinct"];
const PLAYER_MOVE_ACCELERATION_BASE_MULTIPLIER = 9.5;
const PLAYER_MOVE_DECELERATION_BASE_MULTIPLIER = 11.5;

function clampPlayerCoreStat(value) {
  return Math.max(1, Math.round(Number(value) || 0));
}

function createPlayerCoreStats(offsets = {}) {
  return {
    vitality: clampPlayerCoreStat(PLAYER_CORE_STAT_BASE + Number(offsets.vitality ?? 0)),
    power: clampPlayerCoreStat(PLAYER_CORE_STAT_BASE + Number(offsets.power ?? 0)),
    guard: clampPlayerCoreStat(PLAYER_CORE_STAT_BASE + Number(offsets.guard ?? 0)),
    agility: clampPlayerCoreStat(PLAYER_CORE_STAT_BASE + Number(offsets.agility ?? 0)),
    instinct: clampPlayerCoreStat(PLAYER_CORE_STAT_BASE + Number(offsets.instinct ?? 0)),
  };
}

function normalizePlayerCoreStats(stats, fallbackStats = createPlayerCoreStats()) {
  if (!stats || typeof stats !== "object") {
    return { ...fallbackStats };
  }

  return PLAYER_CORE_STAT_KEYS.reduce((normalized, key) => {
    const nextValue = Number(stats[key]);
    normalized[key] = Number.isFinite(nextValue) ? clampPlayerCoreStat(nextValue) : fallbackStats[key];
    return normalized;
  }, {});
}

function playerCoreStatScale(statValue) {
  return clampPlayerCoreStat(statValue) / PLAYER_CORE_STAT_BASE;
}

function averagePlayerCoreScale(ratios = [], fallback = 1) {
  const validRatios = ratios.filter((ratio) => Number.isFinite(ratio) && ratio > 0);
  if (!validRatios.length) {
    return fallback;
  }
  const total = validRatios.reduce((sum, ratio) => sum + ratio, 0);
  return total / validRatios.length;
}

function normalizeExperienceValue(value, fallback = 0n) {
  if (typeof value === "bigint") {
    return value >= 0n ? value : fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? BigInt(Math.floor(value)) : fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return BigInt(trimmed);
    }
  }

  return fallback;
}

function experienceToString(value) {
  return normalizeExperienceValue(value).toString();
}

function experienceRequiredForLevel(level) {
  const normalizedLevel = Math.max(1, Math.round(Number(level) || 1));
  return PLAYER_LEVEL_START_EXP << BigInt(normalizedLevel - 1);
}

function experienceProgressRatio(currentExperience, requiredExperience) {
  const required = normalizeExperienceValue(requiredExperience, 1n);
  if (required <= 0n) {
    return 0;
  }

  const current = normalizeExperienceValue(currentExperience);
  const clampedCurrent = current > required ? required : current;
  return Number((clampedCurrent * 10000n) / required) / 10000;
}

function formatExperienceCompact(value) {
  const normalized = normalizeExperienceValue(value);
  const digits = normalized.toString();
  if (digits.length <= 4) {
    return digits;
  }

  const mantissaTail = digits.slice(1, 3).replace(/0+$/, "");
  const mantissa = mantissaTail ? `${digits[0]}.${mantissaTail}` : digits[0];
  return `${mantissa}e${digits.length - 1}`;
}

function playerStatProgression(level, chapter) {
  const normalizedLevel = Math.max(1, Math.round(Number(level) || 1));
  const normalizedChapter = Math.max(1, Math.round(Number(chapter) || 1));
  const maxHealth = 100;
  const maxMana = 100;
  const baseAgility = Math.max(1, Math.round(28 + normalizedLevel * 2 + normalizedChapter));
  return {
    level: normalizedLevel,
    chapter: normalizedChapter,
    attack: Math.round(16 + normalizedLevel * 3 + normalizedChapter * 2),
    maxHealth,
    maxMana,
    defense: Math.round(10 + normalizedLevel * 2 + normalizedChapter),
    baseAgility,
    armor: 100,
    healthRegen: Number((maxHealth * 0.01).toFixed(1)),
    manaRegen: 5,
    skillRange: Number((4.2 + normalizedLevel * 0.14 + normalizedChapter * 0.16).toFixed(1)),
  };
}

function estimatePlayerCoreStats(savedStats, baseProgression) {
  const explicitCoreStats = savedStats?.coreStats ?? savedStats?.playerCoreStats;
  if (explicitCoreStats && typeof explicitCoreStats === "object") {
    return normalizePlayerCoreStats(explicitCoreStats);
  }

  return normalizePlayerCoreStats({
    vitality: Math.round(PLAYER_CORE_STAT_BASE * averagePlayerCoreScale([
      Number(savedStats?.maxHealth) / baseProgression.maxHealth,
      Number(savedStats?.healthRegen) / baseProgression.healthRegen,
    ])),
    power: Math.round(PLAYER_CORE_STAT_BASE * averagePlayerCoreScale([
      Number(savedStats?.attack) / baseProgression.attack,
    ])),
    guard: Math.round(PLAYER_CORE_STAT_BASE * averagePlayerCoreScale([
      Number(savedStats?.defense) / baseProgression.defense,
      Number(savedStats?.maxArmor ?? savedStats?.armor) / baseProgression.armor,
    ])),
    agility: Math.round(PLAYER_CORE_STAT_BASE * averagePlayerCoreScale([
      Number(savedStats?.baseAgility ?? savedStats?.agility) / baseProgression.baseAgility,
    ])),
    instinct: Math.round(PLAYER_CORE_STAT_BASE * averagePlayerCoreScale([
      Number(savedStats?.maxMana) / baseProgression.maxMana,
      Number(savedStats?.manaRegen) / baseProgression.manaRegen,
      Number(savedStats?.skillRange) / baseProgression.skillRange,
    ])),
  });
}

function derivePlayerRuntimeStats(level, chapter, coreStats = createPlayerCoreStats()) {
  const progression = playerStatProgression(level, chapter);
  const normalizedCoreStats = normalizePlayerCoreStats(coreStats);
  const vitalityScale = playerCoreStatScale(normalizedCoreStats.vitality);
  const powerScale = playerCoreStatScale(normalizedCoreStats.power);
  const guardScale = playerCoreStatScale(normalizedCoreStats.guard);
  const agilityScale = playerCoreStatScale(normalizedCoreStats.agility);
  const instinctScale = playerCoreStatScale(normalizedCoreStats.instinct);

  return {
    coreStats: normalizedCoreStats,
    attack: Math.max(1, Math.round(progression.attack * powerScale)),
    maxHealth: Math.max(1, Math.round(progression.maxHealth * vitalityScale)),
    maxMana: Math.max(1, Math.round(progression.maxMana * instinctScale)),
    defense: Math.max(1, Math.round(progression.defense * guardScale)),
    baseAgility: Math.max(1, Math.round(progression.baseAgility * agilityScale)),
    armor: Math.max(1, Math.round(progression.armor * guardScale)),
    healthRegen: Number((progression.healthRegen * vitalityScale).toFixed(1)),
    manaRegen: Number((progression.manaRegen * instinctScale).toFixed(1)),
    skillRange: Number((progression.skillRange * instinctScale).toFixed(1)),
  };
}

function playerSkillRangeMultiplier(player, chapter = state.game?.chapter ?? 1) {
  if (!player) {
    return 1;
  }

  const progression = playerStatProgression(player.level, chapter);
  const baseSkillRange = Math.max(0.1, Number(progression.skillRange) || 0.1);
  const fallbackSkillRange = derivePlayerRuntimeStats(
    player.level,
    chapter,
    player.coreStats,
  ).skillRange;
  const currentSkillRange = Number(player.skillRange ?? fallbackSkillRange);
  if (!Number.isFinite(currentSkillRange) || currentSkillRange <= 0) {
    return 1;
  }

  return Math.max(0.25, Number((currentSkillRange / baseSkillRange).toFixed(3)));
}

function playerActionSpeedMultiplier(player) {
  if (!player) {
    return 1;
  }

  const baseActionSpeed = Math.max(0.1, Number(attackSpeedFromAgility(player.agility ?? player.baseAgility ?? 1)) || 0.1);
  const currentActionSpeed = Number(player.actionSpeed ?? player.attackSpeed ?? baseActionSpeed);
  if (!Number.isFinite(currentActionSpeed) || currentActionSpeed <= 0) {
    return 1;
  }

  return Math.max(0.25, Number((currentActionSpeed / baseActionSpeed).toFixed(3)));
}

function attackSpeedFromAgility(agility) {
  return Number((1 + agility * 0.015).toFixed(2));
}

function agilityGlobalMultiplier(agility) {
  return attackSpeedFromAgility(agility);
}

function currentMoveSpeed(player) {
  const baseSpeed = player.baseSpeed ?? player.speed ?? 0;
  const agilityScale = agilityGlobalMultiplier(player.agility ?? 1);
  return baseSpeed * agilityScale;
}

function playerForceScale(player, chapter = state.game?.chapter ?? 1) {
  if (!player) {
    return 1;
  }

  if (player.coreStats?.power != null) {
    return Math.max(0.35, playerCoreStatScale(player.coreStats.power));
  }

  const progression = playerStatProgression(player.level, chapter);
  const baseAttack = Math.max(1, Number(progression.attack) || 1);
  const currentAttack = Math.max(1, Number(player.attack ?? baseAttack) || baseAttack);
  return Math.max(0.35, Number((currentAttack / baseAttack).toFixed(3)));
}

function currentMoveAcceleration(player, chapter = state.game?.chapter ?? 1) {
  const moveSpeed = Math.max(0, Number(currentMoveSpeed(player) ?? 0));
  const forceScale = playerForceScale(player, chapter);
  return moveSpeed * (PLAYER_MOVE_ACCELERATION_BASE_MULTIPLIER * forceScale);
}

function currentMoveDeceleration(player, chapter = state.game?.chapter ?? 1) {
  const moveSpeed = Math.max(0, Number(currentMoveSpeed(player) ?? 0));
  const forceScale = playerForceScale(player, chapter);
  return moveSpeed * (PLAYER_MOVE_DECELERATION_BASE_MULTIPLIER * Math.max(0.9, forceScale));
}

function syncPhysicalEnhancementStats(player) {
  if (!player) {
    return;
  }

  player.physicalBoostStacks = Math.max(0, Math.floor(player.physicalBoostStacks ?? 0));
  player.baseAgility = Math.max(1, Math.round(player.baseAgility ?? player.agility ?? 1));
  player.agility = player.baseAgility + player.physicalBoostStacks;
  player.attackSpeed = agilityGlobalMultiplier(player.agility);
  const actionSpeedMultiplier = 1 + getEquippedArtifactPassiveEffectTotal("actionSpeedMultiplierBonus");
  player.actionSpeed = Number((player.attackSpeed * actionSpeedMultiplier).toFixed(2));
  player.speed = currentMoveSpeed(player);
}

function formatPlayerHealFloatValue(value) {
  const rounded = Math.round(Math.max(0, Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}` : `${rounded.toFixed(1)}`;
}

function getPlayerCombatFloatStore(player) {
  if (!player) {
    return [];
  }

  if (!Array.isArray(player.combatFloats)) {
    player.combatFloats = Array.isArray(player.healFloats) ? player.healFloats : [];
  }
  player.healFloats = player.combatFloats;
  return player.combatFloats;
}

function queuePlayerCombatFloat(player, amount, options = {}) {
  if (!player) {
    return null;
  }

  const numericAmount = Math.max(0, Number(amount) || 0);
  if (numericAmount <= 0) {
    return null;
  }

  const combatFloats = getPlayerCombatFloatStore(player);
  const duration = clamp(Number(options.duration ?? 0.62), 0.24, 1.2);
  const mergeWindow = clamp(Number(options.mergeWindow ?? 0.14), 0, duration);
  const kind = options.kind === "damage" ? "damage" : "heal";
  const activeFloat = combatFloats[combatFloats.length - 1];
  if (activeFloat && activeFloat.kind === kind && activeFloat.timer > activeFloat.duration - mergeWindow) {
    activeFloat.value += numericAmount;
    activeFloat.label = formatPlayerHealFloatValue(activeFloat.value);
    activeFloat.timer = Math.max(activeFloat.timer, activeFloat.duration * 0.82);
    return activeFloat;
  }

  const combatFloat = {
    kind,
    value: numericAmount,
    label: formatPlayerHealFloatValue(numericAmount),
    timer: duration,
    duration,
    offsetX: Number(options.offsetX ?? ((combatFloats.length % 2 === 0 ? -1 : 1) * 14)),
  };
  combatFloats.push(combatFloat);
  if (combatFloats.length > 5) {
    combatFloats.splice(0, combatFloats.length - 5);
  }
  return combatFloat;
}

function queuePlayerHealFloat(player, amount, options = {}) {
  return queuePlayerCombatFloat(player, amount, {
    ...options,
    kind: "heal",
  });
}

function queuePlayerDamageFloat(player, amount, options = {}) {
  return queuePlayerCombatFloat(player, amount, {
    ...options,
    kind: "damage",
  });
}

function applyPlayerHealing(player, amount, options = {}) {
  if (!player) {
    return {
      requestedAmount: 0,
      recoveredAmount: 0,
    };
  }

  const requestedAmount = Math.max(0, Number(amount) || 0);
  if (requestedAmount <= 0) {
    return {
      requestedAmount: 0,
      recoveredAmount: 0,
    };
  }

  const previousHealth = Math.max(0, Number(player.health ?? 0));
  player.health = clamp(previousHealth + requestedAmount, 0, Number(player.maxHealth ?? previousHealth));
  const recoveredAmount = Math.max(0, Number(player.health) - previousHealth);
  if (options.showFloat !== false) {
    queuePlayerHealFloat(player, options.displayAmount ?? requestedAmount, options);
  }

  return {
    requestedAmount,
    recoveredAmount,
  };
}

function applyPlayerDamage(player, amount, options = {}) {
  if (!player) {
    return {
      requestedAmount: 0,
      armorDamage: 0,
      healthDamage: 0,
      finalDamage: 0,
    };
  }

  const requestedAmount = Math.max(0, Number(amount) || 0);
  if (requestedAmount <= 0) {
    return {
      requestedAmount: 0,
      armorDamage: 0,
      healthDamage: 0,
      finalDamage: 0,
    };
  }

  const previousArmor = Math.max(0, Number(player.armor ?? 0));
  const armorDamage = Math.min(previousArmor, requestedAmount);
  player.armor = clamp(
    previousArmor - armorDamage,
    0,
    Number(player.maxArmor ?? previousArmor),
  );
  const remainingDamage = Math.max(0, requestedAmount - armorDamage);
  const previousHealth = Math.max(0, Number(player.health ?? 0));
  player.health = clamp(previousHealth - remainingDamage, 0, Number(player.maxHealth ?? previousHealth));
  const healthDamage = Math.max(0, previousHealth - Number(player.health));
  const finalDamage = armorDamage + healthDamage;
  if (options.showFloat !== false) {
    queuePlayerDamageFloat(player, options.displayAmount ?? requestedAmount, options);
  }

  return {
    requestedAmount,
    armorDamage,
    healthDamage,
    finalDamage,
  };
}

function getEquippedArtifactPassiveEffectTotal(effectKey, game = state.game) {
  if (!game?.inventory?.utilitySlots?.length || !effectKey) {
    return 0;
  }

  return game.inventory.utilitySlots.reduce((total, itemId) => {
    const artifact = getArtifactById(itemId);
    if (!artifact?.passive?.effects?.equipped) {
      return total;
    }

    return total + Number(artifact.passive.effects.equipped[effectKey] ?? 0);
  }, 0);
}

function rebuildPlayerDerivedStats(player, context = {}) {
  if (!player) {
    return null;
  }

  const healthShare = clamp(
    Number(context.healthRatio ?? healthRatio(player)),
    0,
    1,
  );
  const manaShare = clamp(
    Number(context.manaRatio ?? manaRatio(player)),
    0,
    1,
  );
  const derived = derivePlayerRuntimeStats(
    player.level,
    context.chapter ?? state.game?.chapter ?? 1,
    player.coreStats,
  );

  player.coreStats = derived.coreStats;
  player.attack = derived.attack;
  player.maxHealth = derived.maxHealth;
  player.maxMana = derived.maxMana;
  player.defense = derived.defense;
  player.baseAgility = derived.baseAgility;
  player.maxArmor = derived.armor;
  const currentArmorValue = Number.isFinite(Number(context.armor))
    ? Number(context.armor)
    : Number(player.armor);
  player.armor = clamp(
    Number.isFinite(currentArmorValue) ? currentArmorValue : player.maxArmor,
    0,
    player.maxArmor,
  );
  player.healthRegen = derived.healthRegen;
  player.manaRegen = derived.manaRegen;
  const equippedSkillRangeMultiplier = 1 + getEquippedArtifactPassiveEffectTotal(
    "skillRangeMultiplierBonus",
    context.game ?? state.game,
  );
  player.skillRange = Number((derived.skillRange * equippedSkillRangeMultiplier).toFixed(1));
  player.health = clamp(
    Number.isFinite(Number(context.health))
      ? Number(context.health)
      : player.maxHealth * healthShare,
    0,
    player.maxHealth,
  );
  player.mana = clamp(
    Number.isFinite(Number(context.mana))
      ? Number(context.mana)
      : player.maxMana * manaShare,
    0,
    player.maxMana,
  );
  syncPhysicalEnhancementStats(player);
  return player;
}

function buildPlayerStats(slot, savedStats = null) {
  const level = Math.max(1, Math.round(savedStats?.level ?? slot.level ?? 1));
  const chapter = Math.max(1, Math.round(savedStats?.chapter ?? slot.chapter ?? 1));
  const progression = playerStatProgression(level, chapter);
  const coreStats = estimatePlayerCoreStats(savedStats, progression);
  const runtimeStats = derivePlayerRuntimeStats(level, chapter, coreStats);
  const maxHealth = runtimeStats.maxHealth;
  const maxMana = runtimeStats.maxMana;
  const savedBoostStacks = Math.max(0, Math.floor(Number(savedStats?.physicalBoostStacks ?? 0)));
  const savedDecayRemaining = Math.max(0, Number(savedStats?.physicalBoostDecayRemaining ?? 0));
  const baseAgility = runtimeStats.baseAgility;
  const agility = baseAgility + savedBoostStacks;
  const experience = normalizeExperienceValue(savedStats?.experience ?? savedStats?.exp ?? 0n);
  const statPoints = Math.max(
    0,
    Math.floor(Number(savedStats?.statPoints ?? savedStats?.unspentStatPoints ?? ((level - 1) * PLAYER_STAT_POINTS_PER_LEVEL))),
  );
  const healthValue = Number(savedStats?.health);
  const healthShare = Number(savedStats?.maxHealth) > 0
    ? Number(savedStats?.health ?? savedStats.maxHealth) / Number(savedStats.maxHealth)
    : null;
  const manaValue = Number(savedStats?.mana);
  const manaShare = Number(savedStats?.maxMana) > 0
    ? Number(savedStats?.mana ?? savedStats.maxMana) / Number(savedStats.maxMana)
    : null;
  const maxArmor = runtimeStats.armor;
  const armorValue = Number(savedStats?.armor);

  return {
    level,
    coreStats,
    experience,
    experienceToNextLevel: experienceRequiredForLevel(level),
    statPoints,
    attack: runtimeStats.attack,
    maxHealth,
    health: clamp(
      Number.isFinite(healthShare)
        ? maxHealth * clamp(healthShare, 0, 1)
        : (Number.isFinite(healthValue) ? healthValue : maxHealth),
      0,
      maxHealth,
    ),
    maxMana,
    mana: clamp(
      Number.isFinite(manaShare)
        ? maxMana * clamp(manaShare, 0, 1)
        : (Number.isFinite(manaValue) ? manaValue : maxMana),
      0,
      maxMana,
    ),
    defense: runtimeStats.defense,
    baseAgility,
    physicalBoostStacks: savedBoostStacks,
    spinManaProgress: clamp(Number(savedStats?.spinManaProgress ?? 0), 0, 0.9999),
    physicalBoostExpiresAt:
      savedBoostStacks > 0 && savedDecayRemaining > 0
        ? performance.now() + (savedDecayRemaining * 1000)
        : 0,
    agility,
    attackSpeed: attackSpeedFromAgility(agility),
    maxArmor,
    armor: clamp(
      Number.isFinite(armorValue) ? armorValue : maxArmor,
      0,
      maxArmor,
    ),
    healthRegen: runtimeStats.healthRegen,
    manaRegen: runtimeStats.manaRegen,
    skillRange: runtimeStats.skillRange,
  };
}

function applyPlayerLevelProgression(player, nextLevel, chapter = state.game?.chapter ?? 1) {
  if (!player) {
    return null;
  }

  player.level = Math.max(1, Math.round(Number(nextLevel) || 1));
  return rebuildPlayerDerivedStats(player, {
    chapter,
  });
}

function spendPlayerMana(player, amount, options = {}) {
  if (!player) {
    return 0;
  }

  const requestedAmount = Math.max(0, Number(amount) || 0);
  if (requestedAmount <= 0 || (player.mana ?? 0) <= 0) {
    return 0;
  }

  const spentAmount = Math.min(player.mana, requestedAmount);
  player.mana = clamp(player.mana - spentAmount, 0, player.maxMana);
  if (options.applyPassiveHooks !== false && typeof applyWeaponManaSpendPassives === "function") {
    applyWeaponManaSpendPassives(player, spentAmount, state.game);
  }
  return spentAmount;
}

function tickPlayerManaRecovery(player, dt) {
  if (!player) {
    return 0;
  }

  const elapsed = Math.max(0, Number(dt) || 0);
  const regenAmount = Math.max(0, Number(player.manaRegen ?? 0) * elapsed);
  if (regenAmount <= 0) return 0;

  const nextMana = clamp(player.mana + regenAmount, 0, player.maxMana);
  const recoveredAmount = Math.max(0, nextMana - player.mana);
  player.mana = nextMana;
  return recoveredAmount;
}

function spendPlayerStatPoint(player, statKey, context = {}) {
  if (!player || !PLAYER_CORE_STAT_KEYS.includes(statKey)) {
    return false;
  }

  const availablePoints = Math.max(0, Math.floor(Number(player.statPoints ?? 0)));
  if (availablePoints <= 0) {
    return false;
  }

  player.coreStats = normalizePlayerCoreStats(player.coreStats);
  player.coreStats[statKey] += 1;
  player.statPoints = availablePoints - 1;
  rebuildPlayerDerivedStats(player, {
    chapter: context.chapter ?? state.game?.chapter ?? 1,
  });
  return true;
}

function grantPlayerExperience(player, amount, context = {}) {
  if (!player) {
    return null;
  }

  const gainedExperience = normalizeExperienceValue(amount);
  if (gainedExperience <= 0n) {
    return {
      gainedExperience: 0n,
      currentExperience: normalizeExperienceValue(player.experience),
      nextLevelExperience: normalizeExperienceValue(player.experienceToNextLevel ?? experienceRequiredForLevel(player.level)),
      levelsGained: 0,
      statPointsGranted: 0,
    };
  }

  let nextLevel = Math.max(1, Math.round(Number(player.level) || 1));
  let currentExperience = normalizeExperienceValue(player.experience) + gainedExperience;
  let nextLevelExperience = normalizeExperienceValue(
    player.experienceToNextLevel ?? experienceRequiredForLevel(nextLevel),
    experienceRequiredForLevel(nextLevel),
  );
  let levelsGained = 0;

  while (currentExperience >= nextLevelExperience) {
    currentExperience -= nextLevelExperience;
    nextLevel += 1;
    levelsGained += 1;
    nextLevelExperience = experienceRequiredForLevel(nextLevel);
  }

  if (levelsGained > 0) {
    applyPlayerLevelProgression(player, nextLevel, context.chapter ?? state.game?.chapter ?? 1);
  }

  player.level = nextLevel;
  player.experience = currentExperience;
  player.experienceToNextLevel = nextLevelExperience;
  player.statPoints = Math.max(0, Math.floor(Number(player.statPoints ?? 0))) + (levelsGained * PLAYER_STAT_POINTS_PER_LEVEL);

  return {
    gainedExperience,
    currentExperience,
    nextLevelExperience,
    levelsGained,
    statPointsGranted: levelsGained * PLAYER_STAT_POINTS_PER_LEVEL,
  };
}

function healthRatio(player) {
  return player.maxHealth > 0 ? player.health / player.maxHealth : 0;
}

function manaRatio(player) {
  return player.maxMana > 0 ? player.mana / player.maxMana : 0;
}

function riskStateFromRatio(ratio) {
  if (ratio <= 0.34) {
    return { risk: "Critical", status: "critical" };
  }
  if (ratio <= 0.7) {
    return { risk: "Warning", status: "empty" };
  }
  return { risk: "Stable", status: "stable" };
}
