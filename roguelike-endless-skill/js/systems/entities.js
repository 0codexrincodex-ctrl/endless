/* Monster/entity data hub only. Boss profiles now live in js/systems/boss.js. */

const MONSTER_SPAWN_COUNT = 10;
const MONSTER_BASE_STAT_VALUE = 90;
const MONSTER_STAT_KEYS = ["vitality", "power", "guard", "agility", "instinct"];
const MONSTER_HITBOX_DEBUG_VISIBLE = false;
const MONSTER_TARGET_HOVER_VISIBLE = false;
const MONSTER_TARGET_BRACKETS_VISIBLE = false;
const MONSTER_PLAYER_STAT_TOTAL_MULTIPLIER = 2;
const MONSTER_SPAWN_MIN_DISTANCE_SCALE = 5.6;
const MONSTER_SPAWN_MAX_DISTANCE_SCALE = 8.8;
const MONSTER_SPAWN_VERTICAL_JITTER_SCALE = 1.05;
const DEFAULT_MONSTER_BALANCE_REFERENCE = {
  coreStats: createPlayerCoreStats(),
  coreTotal: 50,
  maxHealth: 100,
  attack: 21,
  defense: 13,
  moveSpeed: 360,
  tileSize: 80,
};
let generatedMonsterSequence = 0;

function clampMonsterStat(value) {
  return Math.max(1, Math.round(Number(value) || 0));
}

function createMonsterStatBlock(offsets = {}) {
  return {
    vitality: clampMonsterStat(MONSTER_BASE_STAT_VALUE + Number(offsets.vitality ?? 0)),
    power: clampMonsterStat(MONSTER_BASE_STAT_VALUE + Number(offsets.power ?? 0)),
    guard: clampMonsterStat(MONSTER_BASE_STAT_VALUE + Number(offsets.guard ?? 0)),
    agility: clampMonsterStat(MONSTER_BASE_STAT_VALUE + Number(offsets.agility ?? 0)),
    instinct: clampMonsterStat(MONSTER_BASE_STAT_VALUE + Number(offsets.instinct ?? 0)),
  };
}

function normalizeMonsterStatBlock(stats, fallbackStats = createMonsterStatBlock()) {
  if (!stats || typeof stats !== "object") {
    return { ...fallbackStats };
  }

  return MONSTER_STAT_KEYS.reduce((normalized, key) => {
    const nextValue = Number(stats[key]);
    normalized[key] = Number.isFinite(nextValue) ? clampMonsterStat(nextValue) : fallbackStats[key];
    return normalized;
  }, {});
}

function monsterStatScale(statValue) {
  return clampMonsterStat(statValue) / MONSTER_BASE_STAT_VALUE;
}

function monsterBalanceReference(context = {}) {
  const player = context.player ?? state.game?.player;
  const scene = context.scene ?? state.game?.scene;
  const chapter = Math.max(1, Math.round(Number(context.chapter ?? state.game?.chapter ?? 1) || 1));
  const playerCoreStats = normalizePlayerCoreStats(player?.coreStats, DEFAULT_MONSTER_BALANCE_REFERENCE.coreStats);
  const playerCoreTotal = MONSTER_STAT_KEYS.reduce((total, key) => total + clampMonsterStat(playerCoreStats[key]), 0);
  const playerBaselineRuntime = player
    ? derivePlayerRuntimeStats(player.level, chapter, playerCoreStats)
    : null;
  const playerMoveSpeed = playerBaselineRuntime
    ? currentMoveSpeed({
        baseSpeed: Math.max(
          DEFAULT_MONSTER_BALANCE_REFERENCE.moveSpeed,
          Number(player?.baseSpeed ?? player?.speed) || 0,
        ),
        agility: playerBaselineRuntime.baseAgility,
      })
    : DEFAULT_MONSTER_BALANCE_REFERENCE.moveSpeed;
  return {
    coreStats: playerCoreStats,
    coreTotal: Math.max(DEFAULT_MONSTER_BALANCE_REFERENCE.coreTotal, playerCoreTotal),
    maxHealth: Math.max(DEFAULT_MONSTER_BALANCE_REFERENCE.maxHealth, Number(playerBaselineRuntime?.maxHealth) || 0),
    attack: Math.max(DEFAULT_MONSTER_BALANCE_REFERENCE.attack, Number(playerBaselineRuntime?.attack) || 0),
    defense: Math.max(DEFAULT_MONSTER_BALANCE_REFERENCE.defense, Number(playerBaselineRuntime?.defense) || 0),
    moveSpeed: Math.max(DEFAULT_MONSTER_BALANCE_REFERENCE.moveSpeed, Number(playerMoveSpeed) || 0),
    tileSize: Math.max(DEFAULT_MONSTER_BALANCE_REFERENCE.tileSize, Number(scene?.tileSize) || 0),
  };
}

function scaleMonsterStatBlockToPlayer(stats, context = {}) {
  const normalizedStats = normalizeMonsterStatBlock(stats);
  const currentTotal = MONSTER_STAT_KEYS.reduce((total, key) => total + normalizedStats[key], 0);
  if (currentTotal <= 0) {
    return normalizedStats;
  }

  const reference = monsterBalanceReference(context);
  const targetTotal = Math.max(
    MONSTER_STAT_KEYS.length,
    Math.round(reference.coreTotal * MONSTER_PLAYER_STAT_TOTAL_MULTIPLIER),
  );
  const scaledEntries = MONSTER_STAT_KEYS.map((key) => {
    const rawValue = (normalizedStats[key] / currentTotal) * targetTotal;
    return {
      key,
      rawValue,
      baseValue: Math.max(1, Math.floor(rawValue)),
      fraction: rawValue - Math.floor(rawValue),
    };
  });

  let assignedTotal = scaledEntries.reduce((total, entry) => total + entry.baseValue, 0);
  let remaining = targetTotal - assignedTotal;

  if (remaining > 0) {
    const ascendingFractionEntries = scaledEntries
      .slice()
      .sort((first, second) => second.fraction - first.fraction);
    while (remaining > 0) {
      const targetEntry = ascendingFractionEntries[(targetTotal - remaining) % ascendingFractionEntries.length];
      targetEntry.baseValue += 1;
      remaining -= 1;
    }
  } else if (remaining < 0) {
    const descendingValueEntries = scaledEntries
      .slice()
      .sort((first, second) => second.baseValue - first.baseValue);
    while (remaining < 0) {
      const targetEntry = descendingValueEntries[Math.abs(remaining) % descendingValueEntries.length];
      if (targetEntry.baseValue > 1) {
        targetEntry.baseValue -= 1;
        remaining += 1;
      } else {
        break;
      }
    }
  }

  return scaledEntries.reduce((scaled, entry) => {
    scaled[entry.key] = clampMonsterStat(entry.baseValue);
    return scaled;
  }, {});
}

function deriveMonsterRuntimeStats(stats, context = {}) {
  const reference = monsterBalanceReference(context);
  const playerCoreStats = normalizePlayerCoreStats(reference.coreStats, createPlayerCoreStats());
  const vitalityScale = Math.max(0.5, Number(stats.vitality) / Math.max(1, playerCoreStats.vitality));
  const powerScale = Math.max(0.5, Number(stats.power) / Math.max(1, playerCoreStats.power));
  const guardScale = Math.max(0.5, Number(stats.guard) / Math.max(1, playerCoreStats.guard));
  const agilityScale = Math.max(0.5, Number(stats.agility) / Math.max(1, playerCoreStats.agility));
  const instinctScale = Math.max(0.5, Number(stats.instinct) / Math.max(1, playerCoreStats.instinct));

  return {
    maxHealth: Math.max(1, Math.round(reference.maxHealth * vitalityScale * 0.5)),
    attack: Math.max(1, Math.round(reference.attack * powerScale)),
    defense: Math.max(1, Math.round(reference.defense * guardScale)),
    moveSpeed: Math.max(1, Math.round(reference.moveSpeed * (1 + (agilityScale - 1) * 0.28))),
    awarenessRadius: Math.max(reference.tileSize, Math.round(reference.tileSize * (2.45 + Math.max(0, instinctScale - 1) * 0.42))),
  };
}

function stripMonsterTargetBracketPixels(drawCtx, width, height) {
  if (!drawCtx || width < 2 || height < 2) {
    return;
  }

  drawCtx.clearRect(0, 0, 2, 1);
  drawCtx.clearRect(0, 1, 1, 1);
  drawCtx.clearRect(width - 2, 0, 2, 1);
  drawCtx.clearRect(width - 1, 1, 1, 1);
  drawCtx.clearRect(0, height - 2, 1, 1);
  drawCtx.clearRect(width - 1, height - 2, 1, 1);
  drawCtx.clearRect(0, height - 1, 2, 1);
  drawCtx.clearRect(width - 2, height - 1, 2, 1);
}

function sanitizedMonsterFrame(frame) {
  if (MONSTER_TARGET_BRACKETS_VISIBLE || !frame || frame.complete === false) {
    return frame;
  }

  if (frame._monsterFrameWithoutTargetBrackets) {
    return frame._monsterFrameWithoutTargetBrackets;
  }

  const width = Number(frame.naturalWidth || frame.width || 0);
  const height = Number(frame.naturalHeight || frame.height || 0);
  if (!width || !height) {
    return frame;
  }

  const cleanCanvas = document.createElement("canvas");
  cleanCanvas.width = width;
  cleanCanvas.height = height;
  const cleanCtx = cleanCanvas.getContext("2d");
  if (!cleanCtx) {
    return frame;
  }

  cleanCtx.imageSmoothingEnabled = false;
  cleanCtx.drawImage(frame, 0, 0, width, height);
  stripMonsterTargetBracketPixels(cleanCtx, width, height);

  frame._monsterFrameWithoutTargetBrackets = cleanCanvas;
  return cleanCanvas;
}

function loadIdleFrames(framePaths) {
  return framePaths.map((src) => loadImageAsset(src));
}

function createMonsterDefinition({
  id,
  label,
  frames,
  experienceReward = 1,
  spriteScale = 0.72,
  radiusScale = 0.18,
  hitboxWidthScale = 0.34,
  hitboxHeightScale = 0.28,
  hitboxOffsetYScale = 0.08,
  idleFps = 4,
  hoverAmplitude = 0.06,
  shadowScale = 0.2,
  filter = "none",
  statOffsets,
}) {
  const monsterStats = createMonsterStatBlock(statOffsets);
  return {
    id,
    label,
    frames: loadIdleFrames(frames),
    experienceReward,
    spriteScale,
    radiusScale,
    hitboxWidthScale,
    hitboxHeightScale,
    hitboxOffsetYScale,
    idleFps,
    hoverAmplitude,
    shadowScale,
    filter,
    stats: monsterStats,
    runtime: deriveMonsterRuntimeStats(monsterStats),
  };
}

const MONSTER_CATALOG = [
  createMonsterDefinition({
    id: "skeleton-scout",
    label: "Skeleton Scout",
    frames: [
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton1/v1/skeleton_v1_1.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton1/v1/skeleton_v1_2.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton1/v1/skeleton_v1_3.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton1/v1/skeleton_v1_4.png",
    ],
    spriteScale: 0.74,
    radiusScale: 0.16,
    hitboxWidthScale: 0.3,
    hitboxHeightScale: 0.26,
    hitboxOffsetYScale: 0.08,
    idleFps: 4,
    hoverAmplitude: 0.03,
    shadowScale: 0.18,
    statOffsets: {
      vitality: -8,
      power: -6,
      guard: -12,
      agility: 10,
      instinct: 4,
    },
  }),
  createMonsterDefinition({
    id: "skeleton-brute",
    label: "Skeleton Brute",
    frames: [
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton2/v1/skeleton2_v1_1.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton2/v1/skeleton2_v1_2.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton2/v1/skeleton2_v1_3.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skeleton2/v1/skeleton2_v1_4.png",
    ],
    spriteScale: 0.78,
    radiusScale: 0.18,
    hitboxWidthScale: 0.36,
    hitboxHeightScale: 0.3,
    hitboxOffsetYScale: 0.1,
    idleFps: 3.5,
    hoverAmplitude: 0.02,
    shadowScale: 0.2,
    filter: "brightness(0.92) saturate(0.92)",
    statOffsets: {
      vitality: 18,
      power: 14,
      guard: 10,
      agility: -8,
      instinct: -4,
    },
  }),
  createMonsterDefinition({
    id: "skull-wisp",
    label: "Skull Wisp",
    frames: [
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skull/v1/skull_v1_1.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skull/v1/skull_v1_2.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skull/v1/skull_v1_3.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/skull/v1/skull_v1_4.png",
    ],
    spriteScale: 0.62,
    radiusScale: 0.14,
    hitboxWidthScale: 0.26,
    hitboxHeightScale: 0.22,
    hitboxOffsetYScale: 0.02,
    idleFps: 5,
    hoverAmplitude: 0.09,
    shadowScale: 0.14,
    filter: "brightness(1.08) saturate(1.05)",
    statOffsets: {
      vitality: -18,
      power: -10,
      guard: -14,
      agility: 16,
      instinct: 12,
    },
  }),
  createMonsterDefinition({
    id: "vampire-adept",
    label: "Vampire Adept",
    frames: [
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/vampire/v1/vampire_v1_1.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/vampire/v1/vampire_v1_2.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/vampire/v1/vampire_v1_3.png",
      "assets/2D Pixel Dungeon Asset Pack/Character_animation/monsters_idle/vampire/v1/vampire_v1_4.png",
    ],
    spriteScale: 0.8,
    radiusScale: 0.18,
    hitboxWidthScale: 0.34,
    hitboxHeightScale: 0.32,
    hitboxOffsetYScale: 0.08,
    idleFps: 4.5,
    hoverAmplitude: 0.03,
    shadowScale: 0.2,
    filter: "brightness(0.94) sepia(0.18) saturate(1.08)",
    statOffsets: {
      vitality: 12,
      power: 16,
      guard: 4,
      agility: 8,
      instinct: 14,
    },
  }),
];

const MONSTER_BY_ID = new Map(MONSTER_CATALOG.map((monster) => [monster.id, monster]));

function monsterById(monsterId) {
  return MONSTER_BY_ID.get(monsterId) || null;
}

function nextGeneratedMonsterEntityId(monsterId = "monster") {
  generatedMonsterSequence += 1;
  return `${monsterId}-${Date.now().toString(36)}-${generatedMonsterSequence.toString(36)}`;
}

function randomMonsterCatalogId() {
  const monsterIds = MONSTER_CATALOG.map((monster) => monster.id);
  return monsterIds[Math.floor(Math.random() * monsterIds.length)] || monsterIds[0];
}

function createMonsterEntity(monsterId, worldX, worldY, overrides = {}, context = {}) {
  const definition = monsterById(monsterId);
  if (!definition) {
    return null;
  }

  const monsterStats = scaleMonsterStatBlockToPlayer(
    overrides.stats ?? definition.stats,
    context,
  );
  const runtimeStats = deriveMonsterRuntimeStats(monsterStats, context);
  const maxHealth = Number(runtimeStats.maxHealth);
  const previousHealthRatio = Number.isFinite(Number(overrides.healthRatio))
    ? Number(overrides.healthRatio)
    : Number(overrides.maxHealth) > 0
      ? Number(overrides.health ?? overrides.maxHealth) / Number(overrides.maxHealth)
      : 1;
  const health = clamp(Number(maxHealth * clamp(previousHealthRatio, 0, 1)), 0, maxHealth);

  return {
    id: overrides.id || nextGeneratedMonsterEntityId(monsterId),
    monsterId: definition.id,
    label: definition.label,
    worldX,
    worldY,
    stats: monsterStats,
    maxHealth,
    health,
    attack: Number(runtimeStats.attack),
    defense: Number(runtimeStats.defense),
    moveSpeed: Number(runtimeStats.moveSpeed),
    awarenessRadius: Number(runtimeStats.awarenessRadius),
    experienceReward: Math.max(0, Math.floor(Number(overrides.experienceReward ?? definition.experienceReward ?? 1))),
    radiusScale: Number(overrides.radiusScale ?? definition.radiusScale),
    spriteScale: Number(overrides.spriteScale ?? definition.spriteScale),
    hitboxWidthScale: Number(overrides.hitboxWidthScale ?? definition.hitboxWidthScale ?? 0.34),
    hitboxHeightScale: Number(overrides.hitboxHeightScale ?? definition.hitboxHeightScale ?? 0.28),
    hitboxOffsetYScale: Number(overrides.hitboxOffsetYScale ?? definition.hitboxOffsetYScale ?? 0.08),
    idleFps: Number(overrides.idleFps ?? definition.idleFps),
    hoverAmplitude: Number(overrides.hoverAmplitude ?? definition.hoverAmplitude),
    shadowScale: Number(overrides.shadowScale ?? definition.shadowScale),
    animationOffset: Number(overrides.animationOffset ?? 0),
    attackCooldown: Math.max(0, Number(overrides.attackCooldown ?? 0)),
    hitFlash: 0,
    damageFloat: null,
  };
}

function spawnGeneratedMonsterAroundPlayer(scene, player, overrides = {}, context = {}) {
  if (!scene || !player) {
    return null;
  }

  const monsterId = overrides.monsterId || randomMonsterCatalogId();
  const minDistanceScale = Math.max(1, Number(overrides.minDistanceScale ?? MONSTER_SPAWN_MIN_DISTANCE_SCALE));
  const maxDistanceScale = Math.max(minDistanceScale, Number(overrides.maxDistanceScale ?? MONSTER_SPAWN_MAX_DISTANCE_SCALE));
  const angle = Number.isFinite(Number(overrides.angle))
    ? Number(overrides.angle)
    : Math.random() * Math.PI * 2;
  const radialDistance = scene.tileSize * (minDistanceScale + Math.random() * (maxDistanceScale - minDistanceScale));
  const worldX = Number(overrides.originX ?? player.worldX) + Math.cos(angle) * radialDistance;
  const worldY = Number(overrides.originY ?? player.worldY)
    + Math.sin(angle) * radialDistance
    + ((Math.random() - 0.5) * scene.tileSize * Number(overrides.verticalJitterScale ?? MONSTER_SPAWN_VERTICAL_JITTER_SCALE));
  return createMonsterEntity(monsterId, worldX, worldY, {
    id: overrides.id,
    animationOffset: Number(overrides.animationOffset ?? generatedMonsterSequence * 0.37),
  }, {
    player,
    scene,
    ...context,
  });
}

function spawnGeneratedMonstersAroundPlayer(scene, player, count = MONSTER_SPAWN_COUNT) {
  if (!scene || !player) {
    return [];
  }

  const baseAngle = Math.random() * Math.PI * 2;
  return Array.from({ length: count }, (_, index) => (
    spawnGeneratedMonsterAroundPlayer(scene, player, {
      angle: baseAngle + ((Math.PI * 2 * index) / Math.max(1, count)) + ((Math.random() - 0.5) * 0.44),
      animationOffset: index * 0.63,
    })
  )).filter(Boolean);
}

function restoreMonsterEntities(savedMonsters, scene, player, count = MONSTER_SPAWN_COUNT) {
  const savedList = Array.isArray(savedMonsters) ? savedMonsters : [];
  if (!savedList.length) {
    return count > 0 ? spawnGeneratedMonstersAroundPlayer(scene, player, count) : [];
  }

  const restored = savedList
    .map((savedMonster, index) => {
      const generatedFallback = spawnGeneratedMonsterAroundPlayer(scene, player, {
        animationOffset: savedMonster?.animationOffset ?? index * 0.63,
      });
      return createMonsterEntity(
        savedMonster?.monsterId ?? generatedFallback?.monsterId,
        Number.isFinite(Number(savedMonster?.worldX)) ? Number(savedMonster.worldX) : Number(generatedFallback?.worldX ?? player.worldX),
        Number.isFinite(Number(savedMonster?.worldY)) ? Number(savedMonster.worldY) : Number(generatedFallback?.worldY ?? player.worldY),
        {
          id: typeof savedMonster?.id === "string" ? savedMonster.id : generatedFallback?.id,
          stats: savedMonster?.stats ?? generatedFallback?.stats,
          healthRatio: Number(savedMonster?.maxHealth) > 0
            ? Number(savedMonster?.health ?? savedMonster.maxHealth) / Number(savedMonster.maxHealth)
            : 1,
          radiusScale: savedMonster?.radiusScale,
          spriteScale: savedMonster?.spriteScale,
          hitboxWidthScale: savedMonster?.hitboxWidthScale,
          hitboxHeightScale: savedMonster?.hitboxHeightScale,
          hitboxOffsetYScale: savedMonster?.hitboxOffsetYScale,
          idleFps: savedMonster?.idleFps,
          hoverAmplitude: savedMonster?.hoverAmplitude,
          shadowScale: savedMonster?.shadowScale,
          animationOffset: savedMonster?.animationOffset ?? generatedFallback?.animationOffset ?? index * 0.63,
        },
        { player, scene },
      );
    })
    .filter(Boolean);

  return restored.length ? restored : (count > 0 ? spawnGeneratedMonstersAroundPlayer(scene, player, count) : []);
}

function monsterHitboxFromEntity(monster, scene) {
  const width = scene.tileSize * (monster.hitboxWidthScale ?? 0.34);
  const height = scene.tileSize * (monster.hitboxHeightScale ?? 0.28);
  const centerX = monster.worldX;
  const centerY = monster.worldY + scene.tileSize * (monster.hitboxOffsetYScale ?? 0.08);
  return {
    centerX,
    centerY,
    width,
    height,
    left: centerX - width * 0.5,
    top: centerY - height * 0.5,
    right: centerX + width * 0.5,
    bottom: centerY + height * 0.5,
  };
}

function getVisibleMonsters(player, monsters, width, height, scene = state.game?.scene) {
  const cameraLeft = player.worldX - width * 0.5;
  const cameraTop = player.worldY - height * 0.5;
  return (monsters || [])
    .map((monster) => {
      const definition = monsterById(monster.monsterId);
      const spriteScale = monster.spriteScale ?? definition?.spriteScale ?? 0.72;
      const radiusScale = monster.radiusScale ?? definition?.radiusScale ?? 0.18;
      const hoverAmplitude = MONSTER_TARGET_HOVER_VISIBLE
        ? (monster.hoverAmplitude ?? definition?.hoverAmplitude ?? 0.04)
        : 0;
      const hoverOffset = hoverAmplitude > 0
        ? Math.sin((state.time * 0.0034) + (monster.animationOffset ?? 0)) * scene.tileSize * hoverAmplitude
        : 0;
      const spriteSize = scene.tileSize * spriteScale;
      const worldHitbox = monsterHitboxFromEntity(monster, scene);
      const screenHitboxCenterX = worldHitbox.centerX - cameraLeft;
      const screenHitboxCenterY = worldHitbox.centerY - cameraTop + hoverOffset;
      return {
        ...monster,
        screenX: monster.worldX - cameraLeft,
        screenY: monster.worldY - cameraTop,
        spriteSize,
        radius: scene.tileSize * radiusScale,
        hoverOffset,
        healthRatio: monster.maxHealth > 0 ? monster.health / monster.maxHealth : 0,
        hitbox: {
          ...worldHitbox,
          screenCenterX: screenHitboxCenterX,
          screenCenterY: screenHitboxCenterY,
          screenLeft: screenHitboxCenterX - worldHitbox.width * 0.5,
          screenTop: screenHitboxCenterY - worldHitbox.height * 0.5,
          screenRight: screenHitboxCenterX + worldHitbox.width * 0.5,
          screenBottom: screenHitboxCenterY + worldHitbox.height * 0.5,
        },
      };
    })
    .filter((monster) => (
      monster.screenX > -monster.spriteSize
      && monster.screenX < width + monster.spriteSize
      && monster.screenY > -monster.spriteSize
      && monster.screenY < height + monster.spriteSize
    ));
}

function drawVisibleMonsters(visibleMonsters, scene) {
  visibleMonsters
    .slice()
    .sort((first, second) => (first.worldY + first.radius) - (second.worldY + second.radius))
    .forEach((monster) => {
      const definition = monsterById(monster.monsterId);
      if (!definition) {
        return;
      }

      const frames = definition.frames || [];
      const frameIndex = frames.length
        ? Math.floor(((state.time / 1000) * (monster.idleFps ?? definition.idleFps)) + (monster.animationOffset ?? 0)) % frames.length
        : 0;
      const frame = frames[frameIndex];
      const spriteSize = monster.spriteSize;
      const shadowScale = monster.shadowScale ?? definition.shadowScale ?? 0.2;
      const hoverY = monster.hoverOffset ?? 0;
      const hitbox = monster.hitbox;
      const barWidth = Math.max(spriteSize * 0.78, 40);
      const barHeight = Math.max(5, scene.tileSize * 0.06);
      const barX = monster.screenX - barWidth * 0.5;
      const barY = monster.screenY - spriteSize * 0.82 + hoverY;
      const hitAlpha = monster.hitFlash > 0 ? 0.18 + monster.hitFlash * 1.8 : 0;

      drawPropShadow(
        monster.screenX,
        monster.screenY + spriteSize * 0.24,
        spriteSize * shadowScale,
        spriteSize * shadowScale * 0.42,
        0.22,
      );

      ctx.save();
      ctx.translate(monster.screenX, monster.screenY + hoverY);
      if (definition.filter && definition.filter !== "none") {
        ctx.filter = hitAlpha > 0
          ? `${definition.filter} brightness(${1 + hitAlpha * 0.35})`
          : definition.filter;
      } else if (hitAlpha > 0) {
        ctx.filter = `brightness(${1 + hitAlpha * 0.35})`;
      }
      const renderedFrame = sanitizedMonsterFrame(frame);
      drawWholePixelImage(
        renderedFrame,
        -spriteSize * 0.5,
        -spriteSize * 0.68,
        spriteSize,
        spriteSize,
      );
      ctx.filter = "none";
      ctx.restore();

      if (hitbox && MONSTER_HITBOX_DEBUG_VISIBLE) {
        ctx.save();
        ctx.strokeStyle = "rgba(109, 227, 214, 0.42)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(
          hitbox.screenLeft,
          hitbox.screenTop,
          hitbox.width,
          hitbox.height,
        );
        ctx.setLineDash([]);
        ctx.restore();
      }

      fillRoundRect(barX, barY, barWidth, barHeight, barHeight * 0.5, "rgba(12, 17, 19, 0.78)");
      fillRoundRect(
        barX + 1,
        barY + 1,
        Math.max(0, (barWidth - 2) * clamp(monster.healthRatio, 0, 1)),
        Math.max(0, barHeight - 2),
        Math.max(1, (barHeight - 2) * 0.5),
        "rgba(198, 78, 74, 0.92)",
      );

      ctx.save();
      ctx.fillStyle = "rgba(227, 220, 204, 0.82)";
      ctx.font = '11px "Avenir Next", "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(monster.label, monster.screenX, barY - 7);
      if (monster.damageFloat?.timer > 0) {
        const rise = (1 - monster.damageFloat.timer / monster.damageFloat.duration) * scene.tileSize * 0.35;
        ctx.fillStyle = "rgba(255, 210, 180, 0.92)";
        ctx.font = 'bold 14px "Avenir Next", "Trebuchet MS", sans-serif';
        ctx.fillText(`-${monster.damageFloat.value}`, monster.screenX, barY - 18 - rise);
      }
      ctx.restore();
    });
}
