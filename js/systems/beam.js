/* Beam system: profiles, runtime, hit sweep, and visuals for Sword 12 / Prism Beam. */

const BEAM_ANGLE_SMOOTH_SPEED = 20;
const BEAM_MAX_PARTICLE_DRAW_COUNT = 16;
const BEAM_UTILITY_MAX_PARTICLE_DRAW_COUNT = 10;
const BEAM_HIGH_PARTICLE_DENSITY_MULTIPLIER = 1.6;
const BEAM_HIGH_FILAMENT_OFFSETS = [-0.34, -0.18, 0.18, 0.34];
const BEAM_HIGH_ENERGY_CURRENT_LANES = [
  {
    offsetRatio: -0.24,
    widthScale: 0.18,
    speed: 0.00078,
    phase: 0.03,
    startColor: "rgba(255, 168, 62, 0)",
    edgeColor: "rgba(255, 178, 72, 0.5)",
    coreColor: "rgba(255, 222, 138, 0.98)",
  },
  {
    offsetRatio: -0.14,
    widthScale: 0.16,
    speed: 0.00062,
    phase: 0.29,
    startColor: "rgba(255, 198, 104, 0)",
    edgeColor: "rgba(255, 210, 118, 0.44)",
    coreColor: "rgba(255, 242, 176, 0.94)",
  },
  {
    offsetRatio: -0.03,
    widthScale: 0.14,
    speed: 0.00094,
    phase: 0.57,
    startColor: "rgba(255, 152, 78, 0)",
    edgeColor: "rgba(255, 168, 82, 0.38)",
    coreColor: "rgba(255, 214, 118, 0.92)",
  },
  {
    offsetRatio: 0.08,
    widthScale: 0.14,
    speed: 0.00116,
    phase: 0.71,
    startColor: "rgba(255, 220, 146, 0)",
    edgeColor: "rgba(255, 228, 162, 0.36)",
    coreColor: "rgba(255, 252, 224, 0.88)",
  },
  {
    offsetRatio: 0.18,
    widthScale: 0.12,
    speed: 0.00108,
    phase: 0.81,
    startColor: "rgba(255, 184, 88, 0)",
    edgeColor: "rgba(255, 198, 96, 0.34)",
    coreColor: "rgba(255, 230, 136, 0.86)",
  },
  {
    offsetRatio: 0.28,
    widthScale: 0.11,
    speed: 0.00134,
    phase: 0.93,
    startColor: "rgba(255, 232, 178, 0)",
    edgeColor: "rgba(255, 236, 188, 0.28)",
    coreColor: "rgba(255, 252, 236, 0.8)",
  },
];
const beamWeaponHighlightSpriteCache = new Map();
const beamGlowSpriteCache = new Map();

function beamUsesHighGraphicsQuality() {
  return typeof isHighGraphicsQuality === "function" ? isHighGraphicsQuality() : false;
}

function getBeamPassiveWeapon(game = state.game) {
  return getWieldedWeapons(game).find((weapon) => (
    weapon?.passive?.id === BEAM_PASSIVE_ID
    && weapon?.beamSkill?.enabled
    && Number(weapon.passive?.effects?.hand?.enablesNativeTrigger ?? 0) > 0
  )) || null;
}

function hasBeamPassiveLoadout(game = state.game) {
  return Boolean(getBeamPassiveWeapon(game));
}

function beamSkillProfile(weapon, player, scene) {
  if (!weapon?.beamSkill?.enabled || !player || !scene) {
    return null;
  }

  const beamSkill = weapon.beamSkill;
  const attackSpeedScale = Math.max(1, weaponActionSpeedScale(player));
  const weaponDamage = weaponDamageValue(player, weapon);
  const manaCostPerSecond = Math.max(0, Number(beamSkill.manaCostPerSecond ?? 6.5) || 0);
  const manaCompoundMultiplierPerSecond = Math.max(
    1,
    Number(beamSkill.manaCompoundMultiplierPerSecond ?? 1.18) || 1.18,
  );
  const originOffset = Math.max(
    scene.tileSize * 0.16,
    scene.tileSize * Number(beamSkill.originOffsetScale ?? 0.42),
  );
  const fixedRange = Math.max(
    0,
    scene.tileSize * Number(beamSkill.fixedRangeTileMultiplier ?? 0),
  );
  const width = Math.max(
    scene.tileSize * 0.18,
    scene.tileSize * Number(beamSkill.widthScale ?? 0.3),
  );
  const visualCoreWidth = Math.max(
    scene.tileSize * 0.06,
    scene.tileSize * Number(beamSkill.visualCoreWidthScale ?? 0.1),
  );
  const visualWhiteHotWidth = Math.max(
    scene.tileSize * 0.03,
    scene.tileSize * Number(beamSkill.visualWhiteHotWidthScale ?? 0.06),
  );
  const visualGlowWidth = Math.max(
    scene.tileSize * 0.22,
    scene.tileSize * Number(beamSkill.visualGlowWidthScale ?? 0.46),
  );
  const damageWidth = Math.max(
    width,
    visualCoreWidth * 1.28,
    visualWhiteHotWidth * 1.8,
    visualGlowWidth * 0.82,
  );
  const fallbackRange = weaponRangeValue(scene, player, weapon, {
    multiplier: Number(beamSkill.rangeScale ?? 2.65),
    skillLike: true,
    minimum: scene.tileSize * 2.2,
  });
  const arenaEdgeRange = resolveBeamArenaRange(
    player,
    scene,
    player.facing,
    originOffset,
    state.game,
  );
  return {
    weapon,
    weaponId: weapon.id,
    title: weapon.passive?.title ?? "Beam",
    chargeDuration: clamp(Number(beamSkill.chargeDurationSeconds ?? 0.48), 0.12, 1.4),
    weaponDamage,
    damage: weaponDamage,
    baseManaCostPerSecond: manaCostPerSecond,
    manaCompoundMultiplierPerSecond,
    startManaThreshold: Math.max(1, manaCostPerSecond * 0.22),
    hitInterval: clamp(Number(beamSkill.hitIntervalSeconds ?? 0.13) / attackSpeedScale, 0.05, 0.24),
    range: fixedRange > 0 ? fixedRange : (arenaEdgeRange > 0 ? arenaEdgeRange : fallbackRange),
    width: damageWidth,
    visualCoreWidth,
    visualWhiteHotWidth,
    visualGlowWidth,
    originOffset,
    endpointRadius: Math.max(
      scene.tileSize * 0.18,
      scene.tileSize * Number(beamSkill.endpointRadiusScale ?? 0.52),
    ),
    shimmerAmplitude: Math.max(
      0,
      scene.tileSize * Number(beamSkill.shimmerAmplitudeScale ?? 0.12),
    ),
    shimmerSpeed: Math.max(0.001, Number(beamSkill.shimmerSpeed ?? 0.018) || 0.018),
    particleCount: Math.max(6, Math.round(Number(beamSkill.particleCount ?? 26) || 26)),
    particleSpread: Math.max(
      scene.tileSize * 0.08,
      scene.tileSize * Number(beamSkill.particleSpreadScale ?? 0.24),
    ),
    particleSize: Math.max(
      scene.tileSize * 0.035,
      scene.tileSize * Number(beamSkill.particleSizeScale ?? 0.11),
    ),
    particleShakeAmplitude: Math.max(
      scene.tileSize * 0.04,
      scene.tileSize * Number(beamSkill.particleShakeAmplitudeScale ?? 0.2),
    ),
    particleShakeSpeed: Math.max(0.001, Number(beamSkill.particleShakeSpeed ?? 0.032) || 0.032),
    particleFlowSpeed: Math.max(0.0001, Number(beamSkill.particleFlowSpeed ?? 0.00095) || 0.00095),
    chargeParticleCount: Math.max(10, Math.round(Number(beamSkill.chargeParticleCount ?? 34) || 34)),
    chargeShellRadius: Math.max(
      scene.tileSize * 0.46,
      scene.tileSize * Number(beamSkill.chargeShellRadiusScale ?? 0.96),
    ),
    chargeOrbRadius: Math.max(
      scene.tileSize * 0.22,
      scene.tileSize * Number(beamSkill.chargeOrbRadiusScale ?? 0.62),
    ),
    chargeParticleJitter: Math.max(
      scene.tileSize * 0.05,
      scene.tileSize * Number(beamSkill.chargeParticleJitterScale ?? 0.18),
    ),
  };
}

function currentBeamProfile(game = state.game) {
  if (!game?.player || !game?.scene) {
    return null;
  }

  const weapon = getBeamPassiveWeapon(game);
  return beamSkillProfile(weapon, game.player, game.scene);
}

function resolveBeamArenaRange(player, scene, angle, originOffset = 0, game = state.game) {
  if (!game?.arena?.worldBounded) {
    return 0;
  }

  const arenaWidth = Number(game?.arena?.width ?? 0);
  const arenaHeight = Number(game?.arena?.height ?? 0);
  if (!player || !scene || arenaWidth <= 0 || arenaHeight <= 0) {
    return 0;
  }

  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const drawHeight = 32 * (player.spriteScale ?? 1);
  const swordPose = resolveActiveBeamSwordPose(player, scene, drawHeight, null, angle, beam);
  const startX = Number.isFinite(Number(swordPose.tipWorldX))
    ? swordPose.tipWorldX
    : (getPlayerCombatAnchor(player, scene).worldX + directionX * originOffset);
  const startY = Number.isFinite(Number(swordPose.tipWorldY))
    ? swordPose.tipWorldY
    : (getPlayerCombatAnchor(player, scene).worldY + directionY * originOffset);
  const left = Number(player.worldX ?? 0) - arenaWidth * 0.5;
  const right = left + arenaWidth;
  const top = Number(player.worldY ?? 0) - arenaHeight * 0.5;
  const bottom = top + arenaHeight;
  let nearestHitDistance = Infinity;

  if (Math.abs(directionX) > 0.000001) {
    const hitX = directionX > 0 ? right : left;
    const hitDistance = (hitX - startX) / directionX;
    if (hitDistance > 0) {
      nearestHitDistance = Math.min(nearestHitDistance, hitDistance);
    }
  }

  if (Math.abs(directionY) > 0.000001) {
    const hitY = directionY > 0 ? bottom : top;
    const hitDistance = (hitY - startY) / directionY;
    if (hitDistance > 0) {
      nearestHitDistance = Math.min(nearestHitDistance, hitDistance);
    }
  }

  if (!Number.isFinite(nearestHitDistance)) {
    return 0;
  }

  return Math.max(scene.tileSize * 0.4, nearestHitDistance);
}

function resolvePlayerBeamLine(player, scene, beam = player?.beam) {
  const angle = Number(beam?.angle ?? player?.facing ?? 0);
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const range = Math.max(0, Number(beam?.range ?? 0) || 0);
  const drawHeight = 32 * (player?.spriteScale ?? 1);
  const swordPose = resolveBeamSwordPose(player, scene, drawHeight, null, angle);
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const originOffset = Math.max(0, Number(beam?.originOffset ?? scene?.tileSize * 0.42) || 0);
  const startX = Number.isFinite(Number(swordPose.tipWorldX))
    ? swordPose.tipWorldX
    : combatAnchor.worldX + directionX * originOffset;
  const startY = Number.isFinite(Number(swordPose.tipWorldY))
    ? swordPose.tipWorldY
    : combatAnchor.worldY + directionY * originOffset;
  const endX = startX + directionX * range;
  const endY = startY + directionY * range;
  const startScreenX = Number.isFinite(Number(swordPose.tipX))
    ? swordPose.tipX
    : combatAnchor.screenX + directionX * originOffset;
  const startScreenY = Number.isFinite(Number(swordPose.tipY))
    ? swordPose.tipY
    : combatAnchor.screenY + directionY * originOffset;
  const endScreenX = startScreenX + directionX * range;
  const endScreenY = startScreenY + directionY * range;

  return {
    angle,
    directionX,
    directionY,
    originOffset,
    range,
    startX,
    startY,
    endX,
    endY,
    startScreenX,
    startScreenY,
    endScreenX,
    endScreenY,
    screenDx: endScreenX - startScreenX,
    screenDy: endScreenY - startScreenY,
    length: Math.hypot(endScreenX - startScreenX, endScreenY - startScreenY),
  };
}

function lineHitsCombatTarget(target, beamLine, padding = 0) {
  if (!target || !beamLine) {
    return false;
  }

  return segmentHitsCombatTarget(
    target,
    beamLine.startX,
    beamLine.startY,
    beamLine.endX,
    beamLine.endY,
    padding,
  );
}

function beamSweepFanHitsCombatTarget(target, previousLine, currentLine, padding = 0) {
  if (!target || !previousLine || !currentLine) {
    return false;
  }

  const sweepDelta = shortestAngleDelta(currentLine.angle, previousLine.angle);
  if (Math.abs(sweepDelta) < 0.0001) {
    return false;
  }

  const originX = (Number(previousLine.startX ?? 0) + Number(currentLine.startX ?? 0)) * 0.5;
  const originY = (Number(previousLine.startY ?? 0) + Number(currentLine.startY ?? 0)) * 0.5;
  const aimPoint = combatTargetAimPoint(target);
  const dx = aimPoint.x - originX;
  const dy = aimPoint.y - originY;
  const distance = Math.max(0.0001, Math.hypot(dx, dy));
  const targetRadius = Math.max(
    0,
    Number(target?.radius ?? 0),
    target?.hitbox ? Math.max(Number(target.hitbox.width ?? 0), Number(target.hitbox.height ?? 0)) * 0.5 : 0,
  );
  const maxRange = Math.max(
    Number(previousLine.range ?? 0),
    Number(currentLine.range ?? 0),
  ) + padding + targetRadius;
  if (distance > maxRange) {
    return false;
  }

  const targetAngle = Math.atan2(dy, dx);
  const targetDelta = shortestAngleDelta(targetAngle, previousLine.angle);
  const angularPadding = Math.asin(Math.min(0.999, (padding + targetRadius) / distance));
  if (sweepDelta > 0) {
    return targetDelta >= -angularPadding && targetDelta <= sweepDelta + angularPadding;
  }
  return targetDelta <= angularPadding && targetDelta >= sweepDelta - angularPadding;
}

function beamSweepHitsCombatTarget(target, currentLine, previousLine, padding = 0) {
  if (lineHitsCombatTarget(target, currentLine, padding) || lineHitsCombatTarget(target, previousLine, padding)) {
    return true;
  }

  if (!previousLine || !currentLine) {
    return false;
  }

  if (segmentHitsCombatTarget(
    target,
    previousLine.endX,
    previousLine.endY,
    currentLine.endX,
    currentLine.endY,
    padding,
  )) {
    return true;
  }

  if (segmentHitsCombatTarget(
    target,
    previousLine.startX,
    previousLine.startY,
    currentLine.startX,
    currentLine.startY,
    padding,
  )) {
    return true;
  }

  return beamSweepFanHitsCombatTarget(target, previousLine, currentLine, padding);
}

function createBeamLineFromWorldPoints(startX, startY, directionX, directionY, range, cameraLeft = 0, cameraTop = 0) {
  const safeRange = Math.max(0, Number(range ?? 0) || 0);
  const direction = normalizeDirection(directionX, directionY, 1, 0);
  const endX = Number(startX) + direction.x * safeRange;
  const endY = Number(startY) + direction.y * safeRange;
  const startScreenX = Number(startX) - cameraLeft;
  const startScreenY = Number(startY) - cameraTop;
  const endScreenX = endX - cameraLeft;
  const endScreenY = endY - cameraTop;
  return {
    angle: Math.atan2(direction.y, direction.x),
    directionX: direction.x,
    directionY: direction.y,
    originOffset: 0,
    range: safeRange,
    startX: Number(startX),
    startY: Number(startY),
    endX,
    endY,
    startScreenX,
    startScreenY,
    endScreenX,
    endScreenY,
    screenDx: endScreenX - startScreenX,
    screenDy: endScreenY - startScreenY,
    length: Math.hypot(endScreenX - startScreenX, endScreenY - startScreenY),
  };
}

function resolveBeamSwordPose(player, scene, drawHeight, profile, angle = player?.facing ?? 0) {
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const swordSize = Math.max(scene.tileSize * 0.84, drawHeight * 0.96);
  const poseWeapon = profile?.weapon ?? getBeamPassiveWeapon();
  const beamSkill = poseWeapon?.beamSkill ?? null;
  const slashRange = poseWeapon
    ? weaponRangeValue(scene, player, poseWeapon)
    : Math.max(scene.tileSize * 1.1, drawHeight * 0.8);
  const swordDistance = Math.max(scene.tileSize * 0.46, slashRange * 0.72);
  const handOffsetX = Math.cos(angle) * swordDistance;
  const handOffsetY = Math.sin(angle) * swordDistance;
  const handX = combatAnchor.screenX + handOffsetX;
  const handY = combatAnchor.screenY + handOffsetY;
  const handWorldX = combatAnchor.worldX + handOffsetX;
  const handWorldY = combatAnchor.worldY + handOffsetY;
  const rotation = angle + Number(
    beamSkill?.rotationOffsetRadians
    ?? poseWeapon?.melee?.rotationOffsetRadians
    ?? Math.PI * 0.25,
  );
  const tipOffset = rotateVector(
    swordSize * Number(beamSkill?.tipLocalXScale ?? 0.34),
    swordSize * Number(beamSkill?.tipLocalYScale ?? -0.46),
    rotation,
  );
  return {
    x: handX,
    y: handY,
    worldX: handWorldX,
    worldY: handWorldY,
    rotation,
    swordSize,
    swordDistance,
    tipX: handX + tipOffset.x,
    tipY: handY + tipOffset.y,
    tipWorldX: handWorldX + tipOffset.x,
    tipWorldY: handWorldY + tipOffset.y,
    profile,
  };
}

function resolveSpinBeamSwordPose(player, scene, beam = player?.beam) {
  if (!player?.spin || !scene || !beam?.weaponId) {
    return null;
  }

  const weaponIndex = (player.spin.weaponIds || []).findIndex((weaponId) => weaponId === beam.weaponId);
  if (weaponIndex < 0) {
    return null;
  }

  const weapon = getWeaponById(beam.weaponId);
  if (!weapon) {
    return null;
  }

  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const swordSize = Math.max(scene.tileSize * 0.74, Number(player.spin.bladeSize ?? 0) || scene.tileSize * 0.74);
  const swordDistance = Math.max(0, Number(player.spin.visualDistance ?? 0) || 0);
  const angle = Number(player.spin.angle ?? player.facing ?? 0) + weaponIndex * Math.PI;
  const meleePose = resolveMeleeSwingBladePose(
    combatAnchor,
    weapon,
    angle,
    swordDistance,
    swordSize,
  );
  if (!meleePose) {
    return null;
  }

  return {
    ...meleePose,
    worldX: combatAnchor.worldX + Math.cos(angle) * swordDistance,
    worldY: combatAnchor.worldY + Math.sin(angle) * swordDistance,
    tipWorldX: combatAnchor.worldX + (meleePose.tipX - combatAnchor.screenX),
    tipWorldY: combatAnchor.worldY + (meleePose.tipY - combatAnchor.screenY),
    swordDistance,
    profile: null,
    usingSpinSource: true,
  };
}

function resolveActiveBeamSwordPose(player, scene, drawHeight, profile, angle = player?.facing ?? 0, beam = player?.beam) {
  return resolveSpinBeamSwordPose(player, scene, beam)
    || resolveBeamSwordPose(player, scene, drawHeight, profile, angle);
}

function resolveUtilityBeamSwordPose(entry) {
  if (!entry?.weapon?.beamSkill?.enabled) {
    return null;
  }

  const swordSize = Math.max(1, Number(entry.size ?? 0));
  const beamSkill = entry.weapon.beamSkill;
  const beamAngle = Number(entry.utilityBeamState?.angle);
  const rotation = Number.isFinite(beamAngle)
    ? beamAngle + Number(
      beamSkill?.rotationOffsetRadians
      ?? entry.weapon?.melee?.rotationOffsetRadians
      ?? Math.PI * 0.25
    )
    : Number(entry.rotation ?? UTILITY_WEAPON_ORBIT_ROTATION);
  const tipOffset = rotateVector(
    swordSize * Number(beamSkill.tipLocalXScale ?? 0.34),
    swordSize * Number(beamSkill.tipLocalYScale ?? -0.46),
    rotation,
  );
  const tipScreenX = Number.isFinite(Number(entry.tipScreenX))
    ? Number(entry.tipScreenX)
    : Number(entry.screenX ?? 0) + (Number(entry.tipWorldX ?? entry.worldX ?? 0) - Number(entry.worldX ?? 0));
  const tipScreenY = Number.isFinite(Number(entry.tipScreenY))
    ? Number(entry.tipScreenY)
    : Number(entry.screenY ?? 0) + (Number(entry.tipWorldY ?? entry.worldY ?? 0) - Number(entry.worldY ?? 0));
  const tipWorldX = Number.isFinite(Number(entry.tipWorldX))
    ? Number(entry.tipWorldX)
    : Number(entry.worldX ?? 0);
  const tipWorldY = Number.isFinite(Number(entry.tipWorldY))
    ? Number(entry.tipWorldY)
    : Number(entry.worldY ?? 0);
  const swordX = tipScreenX - tipOffset.x;
  const swordY = tipScreenY - tipOffset.y;

  return {
    x: swordX,
    y: swordY,
    worldX: tipWorldX - tipOffset.x,
    worldY: tipWorldY - tipOffset.y,
    rotation,
    swordSize,
    tipX: tipScreenX,
    tipY: tipScreenY,
    tipWorldX,
    tipWorldY,
  };
}

function beamWeaponHighlightConfig(weapon) {
  if (!weapon?.beamSkill?.enabled) {
    return null;
  }

  return {
    tintColor: weapon.beamSkill.weaponHighlightTintColor ?? "rgba(255, 247, 224, 1)",
    outerColor: weapon.beamSkill.weaponHighlightOuterColor ?? "rgba(255, 236, 194, 0.98)",
    coreColor: weapon.beamSkill.weaponHighlightCoreColor ?? "rgba(255, 255, 255, 1)",
    outlineScale: Math.max(0.01, Number(weapon.beamSkill.weaponHighlightOutlineScale ?? 0.036) || 0.036),
    outerBlurScale: Math.max(0.01, Number(weapon.beamSkill.weaponHighlightOuterBlurScale ?? 0.44) || 0.44),
    coreBlurScale: Math.max(0.01, Number(weapon.beamSkill.weaponHighlightCoreBlurScale ?? 0.18) || 0.18),
  };
}

function beamWeaponHighlightCacheKey(image, tintColor) {
  if (!image) {
    return "";
  }

  const imageKey = image.currentSrc || image.src || image.id || "beam-weapon";
  return `${imageKey}::${tintColor}`;
}

function getBeamWeaponHighlightSprite(image, tintColor) {
  if (!image?.complete) {
    return null;
  }

  const sourceWidth = Number(image.naturalWidth || image.videoWidth || image.width || 0);
  const sourceHeight = Number(image.naturalHeight || image.videoHeight || image.height || 0);
  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const cacheKey = beamWeaponHighlightCacheKey(image, tintColor);
  if (beamWeaponHighlightSpriteCache.has(cacheKey)) {
    return beamWeaponHighlightSpriteCache.get(cacheKey);
  }

  const tintCanvas = document.createElement("canvas");
  tintCanvas.width = sourceWidth;
  tintCanvas.height = sourceHeight;
  const tintCtx = tintCanvas.getContext("2d");
  if (!tintCtx) {
    return null;
  }

  tintCtx.imageSmoothingEnabled = false;
  tintCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  tintCtx.globalCompositeOperation = "source-in";
  tintCtx.fillStyle = tintColor;
  tintCtx.fillRect(0, 0, sourceWidth, sourceHeight);
  tintCtx.globalCompositeOperation = "source-over";
  beamWeaponHighlightSpriteCache.set(cacheKey, tintCanvas);
  return tintCanvas;
}

function beamGlowCacheKey(kind, radius) {
  const normalizedRadius = Math.max(1, Math.round(Math.max(1, Number(radius) || 1) * 2) / 2);
  return `${kind}:${normalizedRadius}`;
}

function beamGlowStops(kind) {
  if (kind === "particle") {
    return [
      [0, "rgba(255, 255, 255, 1)"],
      [0.42, "rgba(255, 246, 214, 0.82)"],
      [1, "rgba(255, 214, 136, 0)"],
    ];
  }
  if (kind === "impact") {
    return [
      [0, "rgba(255, 255, 255, 1)"],
      [0.22, "rgba(255, 255, 246, 0.9)"],
      [0.58, "rgba(255, 238, 198, 0.34)"],
      [1, "rgba(255, 255, 255, 0)"],
    ];
  }
  return [
    [0, "rgba(255, 255, 255, 1)"],
    [0.28, "rgba(255, 248, 226, 0.82)"],
    [0.62, "rgba(255, 236, 188, 0.28)"],
    [1, "rgba(255, 255, 255, 0)"],
  ];
}

function getBeamGlowSprite(kind, radius) {
  const cacheKey = beamGlowCacheKey(kind, radius);
  if (beamGlowSpriteCache.has(cacheKey)) {
    return beamGlowSpriteCache.get(cacheKey);
  }

  const normalizedRadius = Number(cacheKey.split(":")[1]) || Math.max(1, Number(radius) || 1);
  const size = Math.max(8, Math.ceil(normalizedRadius * 3.4));
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = size;
  glowCanvas.height = size;
  const glowCtx = glowCanvas.getContext("2d");
  if (!glowCtx) {
    return null;
  }

  const center = size * 0.5;
  const gradient = glowCtx.createRadialGradient(
    center,
    center,
    normalizedRadius * 0.08,
    center,
    center,
    normalizedRadius,
  );
  beamGlowStops(kind).forEach(([stop, color]) => {
    gradient.addColorStop(stop, color);
  });
  glowCtx.fillStyle = gradient;
  glowCtx.beginPath();
  glowCtx.arc(center, center, normalizedRadius, 0, Math.PI * 2);
  glowCtx.fill();
  beamGlowSpriteCache.set(cacheKey, glowCanvas);
  return glowCanvas;
}

function drawBeamGlowSprite(kind, x, y, radius, alpha = 1) {
  const sprite = getBeamGlowSprite(kind, radius);
  if (!sprite) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.drawImage(
    sprite,
    x - sprite.width * 0.5,
    y - sprite.height * 0.5,
  );
  ctx.restore();
}

function drawBeamWeaponSprite(weapon, swordPose, {
  filter = "none",
  highlightIntensity = 0,
  tintFillAlpha = 0,
} = {}) {
  if (!weapon?.image?.complete || !swordPose) {
    return;
  }

  const drawOffset = resolveWeaponSpriteDrawOffset(weapon, swordPose.swordSize);
  const drawX = drawOffset.x;
  const drawY = drawOffset.y;
  const safeHighlightIntensity = Math.max(0, Number(highlightIntensity ?? 0) || 0);
  const safeTintFillAlpha = clamp(Number(tintFillAlpha ?? 0) || 0, 0, 1);
  const highlight = safeHighlightIntensity > 0 ? beamWeaponHighlightConfig(weapon) : null;

  ctx.save();
  ctx.translate(swordPose.x, swordPose.y);
  ctx.rotate(swordPose.rotation);

  if (highlight) {
    const tintedSprite = getBeamWeaponHighlightSprite(weapon.image, highlight.tintColor);
    if (tintedSprite) {
      const outerBlur = swordPose.swordSize * highlight.outerBlurScale * (0.7 + safeHighlightIntensity * 0.3);
      const coreBlur = swordPose.swordSize * highlight.coreBlurScale * (0.7 + safeHighlightIntensity * 0.3);
      const edgeIntensity = Math.max(0.08, highlight.outlineScale * (0.95 + safeHighlightIntensity * 0.45));

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = highlight.outerColor;
      ctx.shadowBlur = outerBlur;
      ctx.globalAlpha = 0.28 + safeHighlightIntensity * 0.26;
      drawWholePixelImage(
        tintedSprite,
        drawX,
        drawY,
        swordPose.swordSize,
        swordPose.swordSize,
      );
      ctx.shadowColor = highlight.coreColor;
      ctx.shadowBlur = coreBlur;
      ctx.globalAlpha = edgeIntensity + safeHighlightIntensity * 0.18;
      drawWholePixelImage(
        tintedSprite,
        drawX,
        drawY,
        swordPose.swordSize,
        swordPose.swordSize,
      );
      ctx.restore();
    }
  }

  ctx.filter = filter;
  drawWholePixelImage(
    weapon.image,
    drawX,
    drawY,
    swordPose.swordSize,
    swordPose.swordSize,
  );

  if (highlight && safeTintFillAlpha > 0) {
    const tintedSprite = getBeamWeaponHighlightSprite(weapon.image, highlight.tintColor);
    if (tintedSprite) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = safeTintFillAlpha;
      drawWholePixelImage(
        tintedSprite,
        drawX,
        drawY,
        swordPose.swordSize,
        swordPose.swordSize,
      );
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = safeTintFillAlpha * 0.22;
      drawWholePixelImage(
        tintedSprite,
        drawX,
        drawY,
        swordPose.swordSize,
        swordPose.swordSize,
      );
      ctx.restore();
    }
  }

  ctx.filter = "none";
  ctx.restore();
}

function drawUtilityBeamWeaponAura(entry, swordPose, scene) {
  const weapon = entry?.weapon;
  const beamSkill = weapon?.beamSkill;
  const beamState = entry?.utilityBeamState;
  const isCharging = Boolean(beamState?.charging && !beamState?.active);
  if (!weapon?.beamSkill?.enabled || !(beamState?.active || isCharging) || !swordPose || !scene) {
    return;
  }

  const chargeProgress = clamp(
    Number(beamState?.chargeProgress ?? (beamState?.active ? 1 : 0)) || 0,
    0,
    1,
  );
  const pulse = Math.sin(
    state.time * Number(beamState.shimmerSpeed ?? 0.018) * (isCharging ? 1.28 : 1)
    + Number(beamState.phaseOffset ?? 0),
  ) * 0.5 + 0.5;
  const bladeCenterX = swordPose.x + (swordPose.tipX - swordPose.x) * 0.56;
  const bladeCenterY = swordPose.y + (swordPose.tipY - swordPose.y) * 0.56;
  const auraEnergy = isCharging
    ? (0.34 + chargeProgress * 1.04)
    : 1;
  const auraRadius = swordPose.swordSize
    * Math.max(0.1, Number(beamSkill.utilityWeaponAuraRadiusScale ?? 0.68) || 0.68)
    * (isCharging
      ? (0.68 + chargeProgress * 0.82 + pulse * 0.14)
      : (0.94 + pulse * 0.18));
  const auraCoreRadius = swordPose.swordSize
    * Math.max(0.08, Number(beamSkill.utilityWeaponAuraCoreRadiusScale ?? 0.32) || 0.32)
    * (isCharging
      ? (0.74 + chargeProgress * 0.72 + pulse * 0.1)
      : (0.92 + pulse * 0.14));
  const tipGlowRadius = swordPose.swordSize
    * Math.max(0.06, Number(beamSkill.utilityWeaponAuraTipRadiusScale ?? 0.28) || 0.28)
    * (isCharging
      ? (0.76 + chargeProgress * 1.08 + pulse * 0.14)
      : (1 + pulse * 0.12));
  const glowAlpha = clamp(
    (Number(beamSkill.utilityWeaponAuraGlowAlpha ?? 0.84) || 0.84)
      * (isCharging ? (0.9 + chargeProgress * 0.4) : 1),
    0,
    1,
  );
  const spriteAlpha = clamp(
    (Number(beamSkill.utilityWeaponAuraSpriteAlpha ?? 0.58) || 0.58)
      * (isCharging ? (0.96 + chargeProgress * 0.46) : 1),
    0,
    1,
  );
  const glowColor = beamSkill.utilityWeaponAuraGlowColor ?? "rgba(255, 244, 214, 0.96)";
  const tintColor = beamSkill.utilityWeaponAuraTintColor ?? "rgba(255, 255, 246, 1)";
  const drawOffset = resolveWeaponSpriteDrawOffset(weapon, swordPose.swordSize);
  const drawX = drawOffset.x;
  const drawY = drawOffset.y;
  const bladeCenterDrawX = bladeCenterX;
  const bladeCenterDrawY = bladeCenterY;
  const tipDrawX = swordPose.tipX;
  const tipDrawY = swordPose.tipY;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  drawBeamGlowSprite("origin", bladeCenterDrawX, bladeCenterDrawY, auraRadius * 1.12, glowAlpha * auraEnergy);
  drawBeamGlowSprite("impact", bladeCenterDrawX, bladeCenterDrawY, auraCoreRadius * (isCharging ? 1.92 : 1.48), glowAlpha * (isCharging ? 0.94 : 0.76));
  drawBeamGlowSprite("origin", tipDrawX, tipDrawY, tipGlowRadius, glowAlpha * (isCharging ? 1 : 0.98));
  if (isCharging) {
    drawBeamGlowSprite("impact", tipDrawX, tipDrawY, tipGlowRadius * 1.52, glowAlpha * (0.74 + chargeProgress * 0.22));
  }

  const tintedSprite = getBeamWeaponHighlightSprite(weapon.image, tintColor);
  if (tintedSprite) {
    ctx.save();
    ctx.translate(swordPose.x, swordPose.y);
    ctx.rotate(swordPose.rotation);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = swordPose.swordSize * (isCharging
      ? (0.88 + chargeProgress * 0.52 + pulse * 0.12)
      : (0.52 + pulse * 0.12));
    ctx.globalAlpha = spriteAlpha * (isCharging
      ? (1.08 + chargeProgress * 0.26)
      : (0.94 + pulse * 0.06));
    drawWholePixelImage(
      tintedSprite,
      drawX,
      drawY,
      swordPose.swordSize,
      swordPose.swordSize,
    );
    if (isCharging) {
      ctx.shadowColor = "rgba(255, 255, 255, 1)";
      ctx.shadowBlur = swordPose.swordSize * (0.42 + chargeProgress * 0.28);
      ctx.globalAlpha = 0.2 + chargeProgress * 0.26;
      drawWholePixelImage(
        tintedSprite,
        drawX,
        drawY,
        swordPose.swordSize,
        swordPose.swordSize,
      );
    }
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = "rgba(255, 234, 170, 1)";
    ctx.shadowBlur = swordPose.swordSize * (isCharging ? (0.24 + chargeProgress * 0.3) : 0.2);
    ctx.globalAlpha = isCharging
      ? (0.22 + chargeProgress * 0.28)
      : 0.18;
    drawWholePixelImage(
      tintedSprite,
      drawX,
      drawY,
      swordPose.swordSize,
      swordPose.swordSize,
    );
    ctx.restore();
  }

  ctx.restore();
}

function tickBeamHitTimers(beam, dt) {
  if (!beam?.hitTimers || typeof beam.hitTimers !== "object") {
    if (beam) {
      beam.hitTimers = {};
    }
    return;
  }

  Object.keys(beam.hitTimers).forEach((targetKey) => {
    const nextTimer = Math.max(0, Number(beam.hitTimers[targetKey] ?? 0) - dt);
    if (nextTimer <= 0) {
      delete beam.hitTimers[targetKey];
      return;
    }
    beam.hitTimers[targetKey] = nextTimer;
  });
}

function updateBeamState(dt) {
  if (!state.game?.player || !state.game?.scene) {
    return;
  }

  const { player, scene } = state.game;
  const profile = currentBeamProfile();
  const canBeam = Boolean(
    profile
    && state.input.attackHeld
    && !hasOpenHudOverlay()
  );

  if (!canBeam) {
    player.beam = null;
    player.beamScreenShake = null;
    return;
  }

  if (!player.beam && state.input.attackHoldTime < profile.chargeDuration) {
    const chargeDuration = Math.max(0.001, Number(profile.chargeDuration ?? 0) || 0.001);
    const chargeProgress = clamp((Number(state.input.attackHoldTime ?? 0) || 0) / chargeDuration, 0, 1);
    player.beamScreenShake = {
      amplitude: 5.2 + chargeProgress * 4.8,
      phaseSpeed: 0.34,
      verticalScale: 0.76,
    };
    return;
  }

  if (!player.beam && Number(player.mana ?? 0) < profile.startManaThreshold) {
    player.beamScreenShake = null;
    return;
  }

  const previousBeamLine = player.beam
    ? resolvePlayerBeamLine(player, scene, player.beam)
    : null;

  if (!player.beam) {
    player.beam = {
      weaponId: profile.weaponId,
      angle: player.facing,
      range: profile.range,
      width: profile.width,
      damage: profile.weaponDamage,
      weaponDamage: profile.weaponDamage,
      hitInterval: profile.hitInterval,
      manaCostPerSecond: profile.baseManaCostPerSecond,
      baseManaCostPerSecond: profile.baseManaCostPerSecond,
      manaCompoundMultiplierPerSecond: profile.manaCompoundMultiplierPerSecond,
      totalManaSpent: 0,
      elapsedSeconds: 0,
      originOffset: profile.originOffset,
      visualCoreWidth: profile.visualCoreWidth,
      visualWhiteHotWidth: profile.visualWhiteHotWidth,
      visualGlowWidth: profile.visualGlowWidth,
      endpointRadius: profile.endpointRadius,
      shimmerAmplitude: profile.shimmerAmplitude,
      shimmerSpeed: profile.shimmerSpeed,
      particleCount: profile.particleCount,
      particleSpread: profile.particleSpread,
      particleSize: profile.particleSize,
      particleShakeAmplitude: profile.particleShakeAmplitude,
      particleShakeSpeed: profile.particleShakeSpeed,
      particleFlowSpeed: profile.particleFlowSpeed,
      phaseOffset: Math.random() * Math.PI * 2,
      age: 0,
      previousLine: null,
      hitTimers: {},
    };
    player.swing = null;
  }

  const nextElapsedSeconds = Math.max(0, Number(player.beam.elapsedSeconds ?? player.beam.age ?? 0) + dt);
  const desiredAngle = Number(player.facing ?? 0);
  const currentAngle = Number(player.beam.angle ?? desiredAngle);
  const smoothedAngle = currentAngle + shortestAngleDelta(desiredAngle, currentAngle) * clamp(dt * BEAM_ANGLE_SMOOTH_SPEED, 0, 1);
  const currentManaCostPerSecond = Math.max(
    0,
    Number(profile.baseManaCostPerSecond ?? 0) * Math.pow(
      Math.max(1, Number(profile.manaCompoundMultiplierPerSecond ?? 1)),
      nextElapsedSeconds,
    ),
  );
  const manaRequiredThisTick = currentManaCostPerSecond * dt;
  const spentMana = spendPlayerMana(player, manaRequiredThisTick);
  if (manaRequiredThisTick > 0 && spentMana + 0.0001 < manaRequiredThisTick) {
    player.beam = null;
    player.beamScreenShake = null;
    return;
  }
  const totalManaSpent = Math.max(0, Number(player.beam.totalManaSpent ?? 0) + spentMana);
  const beamDamage = Math.max(
    1,
    Math.round(
      Number(profile.weaponDamage ?? 1)
      * totalManaSpent
      * Math.max(dt, nextElapsedSeconds),
    ),
  );

  player.beam.weaponId = profile.weaponId;
  player.beam.angle = smoothedAngle;
  player.beam.range = profile.range;
  player.beam.width = profile.width;
  player.beam.damage = beamDamage;
  player.beam.weaponDamage = profile.weaponDamage;
  player.beam.hitInterval = profile.hitInterval;
  player.beam.manaCostPerSecond = currentManaCostPerSecond;
  player.beam.baseManaCostPerSecond = profile.baseManaCostPerSecond;
  player.beam.manaCompoundMultiplierPerSecond = profile.manaCompoundMultiplierPerSecond;
  player.beam.totalManaSpent = totalManaSpent;
  player.beam.elapsedSeconds = nextElapsedSeconds;
  player.beam.originOffset = profile.originOffset;
  player.beam.visualCoreWidth = profile.visualCoreWidth;
  player.beam.visualWhiteHotWidth = profile.visualWhiteHotWidth;
  player.beam.visualGlowWidth = profile.visualGlowWidth;
  player.beam.endpointRadius = profile.endpointRadius;
  player.beam.shimmerAmplitude = profile.shimmerAmplitude;
  player.beam.shimmerSpeed = profile.shimmerSpeed;
  player.beam.particleCount = profile.particleCount;
  player.beam.particleSpread = profile.particleSpread;
  player.beam.particleSize = profile.particleSize;
  player.beam.particleShakeAmplitude = profile.particleShakeAmplitude;
  player.beam.particleShakeSpeed = profile.particleShakeSpeed;
  player.beam.particleFlowSpeed = profile.particleFlowSpeed;
  player.beam.previousLine = previousBeamLine;
  player.beam.age = nextElapsedSeconds;
  player.beamScreenShake = {
    amplitude: clamp(1.8 + nextElapsedSeconds * 1.4 + totalManaSpent * 0.015, 1.8, 6.4),
    phaseSpeed: 0.28,
    verticalScale: 0.72,
  };
}

function applyBeamHits(dt) {
  if (!state.game?.player?.beam || !state.game?.scene) {
    return;
  }

  const { player, scene } = state.game;
  const beam = player.beam;
  tickBeamHitTimers(beam, dt);
  const rawBeamLine = resolvePlayerBeamLine(player, scene, beam);
  const beamLine = typeof resolveTitanCentipedeBeamClashLine === "function"
    ? (resolveTitanCentipedeBeamClashLine(rawBeamLine, "player", state.game) || rawBeamLine)
    : rawBeamLine;
  const hitPadding = Math.max(scene.tileSize * 0.08, Number(beam.width ?? 0) * 0.5);
  const previousLine = beam.previousLine
    ? (
      typeof resolveTitanCentipedeBeamClashLine === "function"
        ? (resolveTitanCentipedeBeamClashLine(beam.previousLine, "player", state.game) || beam.previousLine)
        : beam.previousLine
    )
    : null;

  getCombatTargets().forEach((target) => {
    if (!isCombatTargetAlive(target)) {
      return;
    }

    const targetKey = getCombatTargetKey(target);
    const timer = beam.hitTimers?.[targetKey] ?? 0;
    if (timer > 0) {
      return;
    }

    if (!beamSweepHitsCombatTarget(target, beamLine, previousLine, hitPadding)) {
      return;
    }

    applyDamageToCombatTarget(target, beam.damage, {
      hitFlash: 0.16,
      damageFloatDuration: 0.5,
      attackMode: "beam",
    });
    beam.hitTimers[targetKey] = beam.hitInterval;
  });
}

function applyUtilityPrismBeamState({
  attackState,
  entry,
  profile,
  player,
  scene,
  dt,
  tipX,
  tipY,
  beamTarget = null,
  targets = getCombatTargets(state.game),
}) {
  if (!attackState || !entry || !profile?.utilityBeamEnabled || !player || !scene) {
    if (attackState) {
      attackState.utilityBeamState = null;
    }
    return;
  }

  if (!beamTarget || attackState.phase !== "attack") {
    attackState.utilityBeamState = null;
    return;
  }

  let utilityBeamState = attackState.utilityBeamState;
  if (!utilityBeamState || typeof utilityBeamState !== "object") {
    utilityBeamState = {
      weaponId: entry.weapon?.id ?? null,
      chargeElapsedSeconds: 0,
      chargeProgress: 0,
      totalManaSpent: 0,
      elapsedSeconds: 0,
      age: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      hitTimers: {},
      previousLine: null,
    };
    attackState.utilityBeamState = utilityBeamState;
  }

  const aimPoint = combatTargetAimPoint(beamTarget);
  const direction = normalizeDirection(
    aimPoint.x - tipX,
    aimPoint.y - tipY,
    attackState.directionX,
    attackState.directionY,
  );
  const previousLine = utilityBeamState.currentLine || null;
  const nextAge = Math.max(0, Number(utilityBeamState.age ?? 0) + dt);
  const chargeDuration = Math.max(0, Number(profile.utilityBeamChargeDuration ?? 0) || 0);
  const chargeElapsedSeconds = clamp(
    Number(utilityBeamState.chargeElapsedSeconds ?? 0) + dt,
    0,
    chargeDuration,
  );
  const chargeProgress = chargeDuration <= 0
    ? 1
    : clamp(chargeElapsedSeconds / chargeDuration, 0, 1);

  utilityBeamState.weaponId = entry.weapon?.id ?? utilityBeamState.weaponId;
  utilityBeamState.range = profile.utilityBeamRange;
  utilityBeamState.width = profile.utilityBeamWidth;
  utilityBeamState.visualCoreWidth = profile.utilityBeamVisualCoreWidth;
  utilityBeamState.visualWhiteHotWidth = profile.utilityBeamVisualWhiteHotWidth;
  utilityBeamState.visualGlowWidth = profile.utilityBeamVisualGlowWidth;
  utilityBeamState.endpointRadius = profile.utilityBeamEndpointRadius;
  utilityBeamState.shimmerSpeed = profile.utilityBeamShimmerSpeed;
  utilityBeamState.particleCount = profile.utilityBeamParticleCount;
  utilityBeamState.particleSpread = profile.utilityBeamParticleSpread;
  utilityBeamState.particleSize = profile.utilityBeamParticleSize;
  utilityBeamState.particleShakeAmplitude = profile.utilityBeamParticleShakeAmplitude;
  utilityBeamState.particleShakeSpeed = profile.utilityBeamParticleShakeSpeed;
  utilityBeamState.particleFlowSpeed = profile.utilityBeamParticleFlowSpeed;
  utilityBeamState.chargeDuration = chargeDuration;
  utilityBeamState.chargeElapsedSeconds = chargeElapsedSeconds;
  utilityBeamState.chargeProgress = chargeProgress;
  utilityBeamState.age = nextAge;
  utilityBeamState.isUtility = true;
  utilityBeamState.angle = Math.atan2(direction.y, direction.x);

  if (chargeProgress < 1) {
    utilityBeamState.active = false;
    utilityBeamState.charging = true;
    utilityBeamState.currentLine = null;
    utilityBeamState.previousLine = null;
    return;
  }

  utilityBeamState.charging = false;
  utilityBeamState.active = true;
  const nextElapsedSeconds = Math.max(0, Number(utilityBeamState.elapsedSeconds ?? 0) + dt);
  const currentManaCostPerSecond = Math.max(
    0,
    Number(profile.utilityBeamBaseManaCostPerSecond ?? 0) * Math.pow(
      Math.max(1, Number(profile.utilityBeamManaCompoundMultiplierPerSecond ?? 1)),
      nextElapsedSeconds,
    ),
  );
  const manaRequiredThisTick = currentManaCostPerSecond * dt;
  const spentMana = spendPlayerMana(player, manaRequiredThisTick);
  if (manaRequiredThisTick > 0 && spentMana + 0.0001 < manaRequiredThisTick) {
    attackState.utilityBeamState = null;
    return;
  }

  tickBeamHitTimers(utilityBeamState, dt);
  const totalManaSpent = Math.max(0, Number(utilityBeamState.totalManaSpent ?? 0) + spentMana);
  const beamDamage = Math.max(
    1,
    Math.round(
      Number(profile.utilityBeamWeaponDamage ?? 1)
      * totalManaSpent
      * Math.max(dt, nextElapsedSeconds),
    ),
  );
  const currentLine = createBeamLineFromWorldPoints(
    tipX,
    tipY,
    direction.x,
    direction.y,
    profile.utilityBeamRange,
  );
  const hitPadding = Math.max(scene.tileSize * 0.08, Number(profile.utilityBeamWidth ?? 0) * 0.5);

  targets.forEach((target) => {
    if (!isCombatTargetAlive(target)) {
      return;
    }

    const targetKey = getCombatTargetKey(target);
    const timer = utilityBeamState.hitTimers?.[targetKey] ?? 0;
    if (timer > 0) {
      return;
    }

    if (!beamSweepHitsCombatTarget(target, currentLine, previousLine, hitPadding)) {
      return;
    }

    applyDamageToCombatTarget(target, beamDamage, {
      hitFlash: 0.16,
      damageFloatDuration: 0.5,
      attackMode: "beam",
    });
    utilityBeamState.hitTimers[targetKey] = profile.utilityBeamHitInterval;
  });

  utilityBeamState.weaponId = entry.weapon?.id ?? utilityBeamState.weaponId;
  utilityBeamState.angle = currentLine.angle;
  utilityBeamState.range = profile.utilityBeamRange;
  utilityBeamState.width = profile.utilityBeamWidth;
  utilityBeamState.damage = beamDamage;
  utilityBeamState.weaponDamage = profile.utilityBeamWeaponDamage;
  utilityBeamState.hitInterval = profile.utilityBeamHitInterval;
  utilityBeamState.manaCostPerSecond = currentManaCostPerSecond;
  utilityBeamState.baseManaCostPerSecond = profile.utilityBeamBaseManaCostPerSecond;
  utilityBeamState.manaCompoundMultiplierPerSecond = profile.utilityBeamManaCompoundMultiplierPerSecond;
  utilityBeamState.totalManaSpent = totalManaSpent;
  utilityBeamState.elapsedSeconds = nextElapsedSeconds;
  utilityBeamState.previousLine = previousLine;
  utilityBeamState.currentLine = currentLine;
}

function traceBeamVisualPath(beamLine) {
  ctx.beginPath();
  ctx.moveTo(beamLine.startScreenX, beamLine.startScreenY);
  ctx.lineTo(beamLine.endScreenX, beamLine.endScreenY);
}

function drawBeamScreenPath(beamLine, width, style, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  traceBeamVisualPath(beamLine);
  ctx.stroke();
  ctx.restore();
}

function beamPointAtProgress(beamLine, progress) {
  const clampedProgress = clamp(Number(progress ?? 0) || 0, 0, 1);
  return {
    x: beamLine.startScreenX + beamLine.screenDx * clampedProgress,
    y: beamLine.startScreenY + beamLine.screenDy * clampedProgress,
  };
}

function beamWorldPointAtProgress(beamLine, progress) {
  const clampedProgress = clamp(Number(progress ?? 0) || 0, 0, 1);
  return {
    x: beamLine.startX + (beamLine.endX - beamLine.startX) * clampedProgress,
    y: beamLine.startY + (beamLine.endY - beamLine.startY) * clampedProgress,
  };
}

function createBeamSegmentLine(beamLine, startProgress, endProgress, offset = 0) {
  const normalX = -beamLine.directionY;
  const normalY = beamLine.directionX;
  const startPoint = beamPointAtProgress(beamLine, startProgress);
  const endPoint = beamPointAtProgress(beamLine, endProgress);
  const startWorldPoint = beamWorldPointAtProgress(beamLine, startProgress);
  const endWorldPoint = beamWorldPointAtProgress(beamLine, endProgress);
  return {
    ...beamLine,
    startX: startWorldPoint.x + normalX * offset,
    startY: startWorldPoint.y + normalY * offset,
    endX: endWorldPoint.x + normalX * offset,
    endY: endWorldPoint.y + normalY * offset,
    startScreenX: startPoint.x + normalX * offset,
    startScreenY: startPoint.y + normalY * offset,
    endScreenX: endPoint.x + normalX * offset,
    endScreenY: endPoint.y + normalY * offset,
    screenDx: endPoint.x - startPoint.x,
    screenDy: endPoint.y - startPoint.y,
    range: Math.hypot(endWorldPoint.x - startWorldPoint.x, endWorldPoint.y - startWorldPoint.y),
    length: Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y),
  };
}

function createBeamScreenSegmentLine(beamLine, startProgress, endProgress, offset = 0) {
  return createBeamSegmentLine(beamLine, startProgress, endProgress, offset);
}

function offsetBeamScreenPath(beamLine, offset) {
  const normalX = -beamLine.directionY;
  const normalY = beamLine.directionX;
  return {
    ...beamLine,
    startScreenX: beamLine.startScreenX + normalX * offset,
    startScreenY: beamLine.startScreenY + normalY * offset,
    endScreenX: beamLine.endScreenX + normalX * offset,
    endScreenY: beamLine.endScreenY + normalY * offset,
  };
}

function drawBeamHighEndpointCorona(x, y, directionX, directionY, radius, alpha = 1) {
  const normalX = -directionY;
  const normalY = directionX;
  const rayLength = radius * 1.08;
  const coreLength = radius * 0.8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = clamp(alpha, 0, 1);

  const raySets = [
    { dx: directionX, dy: directionY, width: radius * 0.16, scale: 1 },
    { dx: normalX, dy: normalY, width: radius * 0.12, scale: 0.74 },
    { dx: (directionX + normalX) * 0.7071, dy: (directionY + normalY) * 0.7071, width: radius * 0.1, scale: 0.66 },
    { dx: (directionX - normalX) * 0.7071, dy: (directionY - normalY) * 0.7071, width: radius * 0.1, scale: 0.66 },
  ];

  raySets.forEach((ray) => {
    ctx.strokeStyle = "rgba(255, 252, 244, 0.9)";
    ctx.lineWidth = Math.max(1, ray.width);
    ctx.beginPath();
    ctx.moveTo(x - ray.dx * coreLength * 0.18, y - ray.dy * coreLength * 0.18);
    ctx.lineTo(x + ray.dx * rayLength * ray.scale, y + ray.dy * rayLength * ray.scale);
    ctx.stroke();
  });

  ctx.restore();
}

function drawBeamHighFilamentLayer(beamLine, glowWidth, coreWidth, pulse, alphaScale = 1) {
  const shellGradient = ctx.createLinearGradient(
    beamLine.startScreenX,
    beamLine.startScreenY,
    beamLine.endScreenX,
    beamLine.endScreenY,
  );
  shellGradient.addColorStop(0, "rgba(255, 224, 166, 0.08)");
  shellGradient.addColorStop(0.18, "rgba(255, 246, 224, 0.2)");
  shellGradient.addColorStop(0.52, "rgba(255, 255, 255, 0.26)");
  shellGradient.addColorStop(0.82, "rgba(255, 246, 222, 0.2)");
  shellGradient.addColorStop(1, "rgba(255, 222, 170, 0.08)");
  drawBeamScreenPath(beamLine, glowWidth * (2.18 + pulse * 0.16), shellGradient, 0.72 * alphaScale);

  BEAM_HIGH_FILAMENT_OFFSETS.forEach((offsetRatio, index) => {
    const filamentLine = offsetBeamScreenPath(beamLine, glowWidth * offsetRatio);
    const filamentGradient = ctx.createLinearGradient(
      filamentLine.startScreenX,
      filamentLine.startScreenY,
      filamentLine.endScreenX,
      filamentLine.endScreenY,
    );
    const warmAlpha = 0.1 + index * 0.02;
    filamentGradient.addColorStop(0, `rgba(255, 228, 170, ${warmAlpha})`);
    filamentGradient.addColorStop(0.34, "rgba(255, 248, 228, 0.42)");
    filamentGradient.addColorStop(0.58, "rgba(255, 255, 255, 0.58)");
    filamentGradient.addColorStop(1, `rgba(255, 236, 192, ${warmAlpha})`);
    drawBeamScreenPath(
      filamentLine,
      Math.max(1, coreWidth * (0.34 + (index % 2) * 0.08)),
      filamentGradient,
      0.64 * alphaScale,
    );
  });
}

function drawBeamHighEnergyCurrents(beamLine, glowWidth, coreWidth, pulse, alphaScale = 1) {
  const beamTime = Number(state.time ?? 0);
  const segmentCount = 5;

  BEAM_HIGH_ENERGY_CURRENT_LANES.forEach((lane, laneIndex) => {
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const travel = (
        beamTime * lane.speed
        + lane.phase
        + segmentIndex / segmentCount
      ) % 1;
      const segmentLength = 0.082 + pulse * 0.022 + laneIndex * 0.009;
      const startProgress = travel;
      const endProgress = Math.min(1, startProgress + segmentLength);
      const waveOffset = Math.sin(beamTime * 0.0032 + laneIndex * 1.4 + segmentIndex * 1.9)
        * coreWidth * 0.06;
      const filamentOffset = glowWidth * lane.offsetRatio + waveOffset;
      const segmentLine = createBeamScreenSegmentLine(
        beamLine,
        startProgress,
        endProgress,
        filamentOffset,
      );
      if (segmentLine.length <= 0.5) {
        continue;
      }
      const segmentGradient = ctx.createLinearGradient(
        segmentLine.startScreenX,
        segmentLine.startScreenY,
        segmentLine.endScreenX,
        segmentLine.endScreenY,
      );
      segmentGradient.addColorStop(0, lane.startColor);
      segmentGradient.addColorStop(0.18, lane.edgeColor);
      segmentGradient.addColorStop(0.52, lane.coreColor);
      segmentGradient.addColorStop(0.82, lane.edgeColor);
      segmentGradient.addColorStop(1, lane.startColor);
      drawBeamScreenPath(
        segmentLine,
        Math.max(1, coreWidth * lane.widthScale),
        segmentGradient,
        0.9 * alphaScale,
      );
    }
  });
}

function drawBeamHighGoldenOverlay(beamLine, glowWidth, coreWidth, pulse, phaseOffset = 0, alphaScale = 1) {
  const beamTime = Number(state.time ?? 0);
  const overlayPulse = Math.sin(beamTime * 0.0052 + phaseOffset) * 0.5 + 0.5;
  const overlayOffset = Math.sin(beamTime * 0.0044 + phaseOffset) * coreWidth * 0.2;
  const overlayLine = offsetBeamScreenPath(beamLine, overlayOffset);
  const overlayGradient = ctx.createLinearGradient(
    overlayLine.startScreenX,
    overlayLine.startScreenY,
    overlayLine.endScreenX,
    overlayLine.endScreenY,
  );
  overlayGradient.addColorStop(0, "rgba(255, 178, 58, 0.12)");
  overlayGradient.addColorStop(0.14, "rgba(255, 198, 82, 0.48)");
  overlayGradient.addColorStop(0.38, "rgba(255, 224, 132, 0.96)");
  overlayGradient.addColorStop(0.62, "rgba(255, 244, 186, 0.92)");
  overlayGradient.addColorStop(0.86, "rgba(255, 208, 94, 0.48)");
  overlayGradient.addColorStop(1, "rgba(255, 176, 58, 0.12)");
  drawBeamScreenPath(
    overlayLine,
    glowWidth * (0.74 + overlayPulse * 0.12),
    "rgba(255, 184, 76, 0.18)",
    0.44 * alphaScale,
  );
  drawBeamScreenPath(
    overlayLine,
    coreWidth * (0.9 + pulse * 0.12),
    overlayGradient,
    0.92 * alphaScale,
  );
  drawBeamScreenPath(
    overlayLine,
    Math.max(1, coreWidth * 0.34),
    "rgba(255, 248, 212, 0.76)",
    0.74 * alphaScale,
  );
}

function drawBeamHighChargeCorona(x, y, orbRadius, angle, progress) {
  const ringBaseAlpha = 0.16 + progress * 0.22;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
    const ringRadius = orbRadius * (1.18 + ringIndex * 0.18);
    ctx.strokeStyle = `rgba(255, 248, 226, ${ringBaseAlpha - ringIndex * 0.04})`;
    ctx.lineWidth = Math.max(1, orbRadius * (0.09 - ringIndex * 0.016));
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let spokeIndex = 0; spokeIndex < 6; spokeIndex += 1) {
    const spokeAngle = angle + spokeIndex * (Math.PI / 3);
    const innerRadius = orbRadius * 0.82;
    const outerRadius = orbRadius * 1.58;
    ctx.strokeStyle = `rgba(255, 251, 238, ${0.08 + progress * 0.18})`;
    ctx.lineWidth = Math.max(1, orbRadius * 0.06);
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(spokeAngle) * innerRadius,
      y + Math.sin(spokeAngle) * innerRadius,
    );
    ctx.lineTo(
      x + Math.cos(spokeAngle) * outerRadius,
      y + Math.sin(spokeAngle) * outerRadius,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawBeamParticleField(beamLine, beam, scene, intensity = 1) {
  const particleCount = Math.max(0, Math.floor(Number(beam?.particleCount ?? 0)));
  if (!particleCount) {
    return;
  }
  const highGraphics = beamUsesHighGraphicsQuality();

  const drawCount = Math.max(
    4,
    Math.min(
      highGraphics ? Math.round(particleCount * BEAM_HIGH_PARTICLE_DENSITY_MULTIPLIER) : particleCount,
      highGraphics
        ? Math.round(particleCount * BEAM_HIGH_PARTICLE_DENSITY_MULTIPLIER)
        : (beam?.isUtility ? BEAM_UTILITY_MAX_PARTICLE_DRAW_COUNT : BEAM_MAX_PARTICLE_DRAW_COUNT),
    ),
  );

  const beamAge = Number(beam?.age ?? 0);
  const phaseOffset = Number(beam?.phaseOffset ?? 0);
  const spread = Math.max(0, Number(beam?.particleSpread ?? scene.tileSize * 0.24));
  const particleSize = Math.max(1, Number(beam?.particleSize ?? scene.tileSize * 0.11));
  const shakeAmplitude = Math.max(0, Number(beam?.particleShakeAmplitude ?? scene.tileSize * 0.2));
  const shakeSpeed = Number(beam?.particleShakeSpeed ?? 0.032);
  const flowSpeed = Number(beam?.particleFlowSpeed ?? 0.00095);
  const normalX = -beamLine.directionY;
  const normalY = beamLine.directionX;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let index = 0; index < drawCount; index += 1) {
    const seed = index * 1.713 + phaseOffset;
    const stream = (beamAge * flowSpeed + index / drawCount + Math.sin(seed * 0.31) * 0.08) % 1;
    const progress = stream < 0 ? stream + 1 : stream;
    const baseX = beamLine.startScreenX + beamLine.screenDx * progress;
    const baseY = beamLine.startScreenY + beamLine.screenDy * progress;
    const shakePhase = state.time * shakeSpeed + seed * 6.4;
    const jitterNormal = Math.sin(shakePhase) * shakeAmplitude * (0.55 + (index % 5) * 0.12);
    const jitterTangent = Math.cos(shakePhase * 1.33) * shakeAmplitude * 0.18;
    const spreadBias = (Math.sin(seed * 2.17) * 0.5 + 0.5) * spread;
    const drawX = baseX + normalX * (jitterNormal + spreadBias * (index % 2 === 0 ? -0.42 : 0.42)) + beamLine.directionX * jitterTangent;
    const drawY = baseY + normalY * (jitterNormal + spreadBias * (index % 2 === 0 ? -0.42 : 0.42)) + beamLine.directionY * jitterTangent;
    const radius = particleSize * (0.44 + (Math.sin(shakePhase * 1.7) * 0.5 + 0.5) * 0.92);
    const alpha = intensity * (0.18 + (Math.sin(shakePhase * 1.12) * 0.5 + 0.5) * 0.34);
    if (highGraphics) {
      const particleGlow = ctx.createRadialGradient(
        drawX,
        drawY,
        radius * 0.12,
        drawX,
        drawY,
        radius,
      );
      particleGlow.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, alpha * 1.6)})`);
      particleGlow.addColorStop(0.4, `rgba(255, 246, 214, ${Math.min(1, alpha * 0.92)})`);
      particleGlow.addColorStop(1, "rgba(255, 214, 136, 0)");
      ctx.fillStyle = particleGlow;
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawBeamGlowSprite("particle", drawX, drawY, radius, alpha);
    }
  }

  ctx.restore();
}

function drawUtilityBeamVisual(beamState, player, scene) {
  const currentLine = beamState?.currentLine;
  if (!beamState?.active || !currentLine || !player || !scene) {
    return;
  }
  const highGraphics = beamUsesHighGraphicsQuality();

  const cameraLeft = Number(player.worldX ?? 0) - Number(player.screenX ?? 0);
  const cameraTop = Number(player.worldY ?? 0) - Number(player.screenY ?? 0);
  const beamLine = createBeamLineFromWorldPoints(
    currentLine.startX,
    currentLine.startY,
    currentLine.directionX,
    currentLine.directionY,
    currentLine.range,
    cameraLeft,
    cameraTop,
  );
  const pulse = Math.sin(state.time * Number(beamState.shimmerSpeed ?? 0.018) + Number(beamState.phaseOffset ?? 0)) * 0.5 + 0.5;
  const glowWidth = Number(beamState.visualGlowWidth ?? scene.tileSize * 0.72) * (1.12 + pulse * 0.22);
  const coreWidth = Number(beamState.visualCoreWidth ?? scene.tileSize * 0.14) * (1 + pulse * 0.16);
  const whiteHotWidth = Number(beamState.visualWhiteHotWidth ?? scene.tileSize * 0.06) * (1.08 + pulse * 0.1);
  const endpointRadius = Number(beamState.endpointRadius ?? scene.tileSize * 0.8) * (1.04 + pulse * 0.14);
  const primaryGradient = ctx.createLinearGradient(
    beamLine.startScreenX,
    beamLine.startScreenY,
    beamLine.endScreenX,
    beamLine.endScreenY,
  );
  primaryGradient.addColorStop(0, "rgba(255, 232, 204, 0.22)");
  primaryGradient.addColorStop(0.24, "rgba(255, 248, 228, 0.42)");
  primaryGradient.addColorStop(0.62, "rgba(255, 255, 246, 0.34)");
  primaryGradient.addColorStop(1, "rgba(255, 255, 255, 0.14)");
  const coreGradient = ctx.createLinearGradient(
    beamLine.startScreenX,
    beamLine.startScreenY,
    beamLine.endScreenX,
    beamLine.endScreenY,
  );
  coreGradient.addColorStop(0, "rgba(255, 248, 230, 0.9)");
  coreGradient.addColorStop(0.45, "rgba(255, 255, 252, 0.98)");
  coreGradient.addColorStop(1, "rgba(255, 248, 224, 0.88)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = "rgba(255, 255, 255, 0.86)";
  ctx.shadowBlur = glowWidth * 1.18;
  if (highGraphics) {
    drawBeamHighFilamentLayer(beamLine, glowWidth, coreWidth, pulse, 0.88);
    drawBeamHighEnergyCurrents(beamLine, glowWidth, coreWidth, pulse, 0.84);
  }
  drawBeamScreenPath(beamLine, glowWidth * 1.5, primaryGradient, 0.9);
  drawBeamScreenPath(beamLine, glowWidth, "rgba(255, 255, 246, 0.38)", 0.9);
  drawBeamScreenPath(beamLine, coreWidth * 1.24, "rgba(255, 255, 244, 0.74)", 0.92);
  drawBeamScreenPath(beamLine, coreWidth, coreGradient, 0.96);
  drawBeamScreenPath(beamLine, whiteHotWidth, "rgba(255, 255, 255, 0.96)", 0.94);
  if (highGraphics) {
    drawBeamHighGoldenOverlay(beamLine, glowWidth, coreWidth, pulse, beamState.phaseOffset ?? 0.37, 0.88);
  }
  drawBeamParticleField(beamLine, beamState, scene, 0.84);
  if (highGraphics) {
    const originGlow = ctx.createRadialGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      endpointRadius * 0.12,
      beamLine.startScreenX,
      beamLine.startScreenY,
      endpointRadius,
    );
    originGlow.addColorStop(0, "rgba(255, 255, 255, 0.94)");
    originGlow.addColorStop(0.28, "rgba(255, 248, 226, 0.68)");
    originGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = originGlow;
    ctx.beginPath();
    ctx.arc(beamLine.startScreenX, beamLine.startScreenY, endpointRadius, 0, Math.PI * 2);
    ctx.fill();
    drawBeamHighEndpointCorona(
      beamLine.startScreenX,
      beamLine.startScreenY,
      -beamLine.directionX,
      -beamLine.directionY,
      endpointRadius * 0.94,
      0.74,
    );
    drawBeamHighEndpointCorona(
      beamLine.endScreenX,
      beamLine.endScreenY,
      beamLine.directionX,
      beamLine.directionY,
      endpointRadius * 1.08,
      0.82,
    );
  } else {
    drawBeamGlowSprite("origin", beamLine.startScreenX, beamLine.startScreenY, endpointRadius, 0.88);
  }
  ctx.restore();
}

function drawBeamChargePreview(player, scene) {
  const profile = currentBeamProfile();
  if (
    !profile
    || player.beam
    || !state.input.attackHeld
    || hasOpenHudOverlay()
  ) {
    return;
  }

  const progress = clamp((state.input.attackHoldTime || 0) / profile.chargeDuration, 0, 1);
  if (progress <= 0) {
    return;
  }

  const beamWeapon = getWeaponById(profile.weaponId);
  const drawHeight = 32 * (player.spriteScale ?? 1);
  const combatAnchor = getPlayerCombatAnchor(player, scene);
  const swordPose = resolveBeamSwordPose(player, scene, drawHeight, profile, player.facing);
  const chargeTargetX = swordPose.tipX;
  const chargeTargetY = swordPose.tipY;
  const pull = Math.pow(progress, 1.85);
  const shellRadius = profile.chargeShellRadius * (1.08 - pull * 0.46);
  const orbRadius = profile.chargeOrbRadius * (0.36 + progress * 0.92);
  const particleJitter = profile.chargeParticleJitter * (1.18 - progress * 0.52);
  const highGraphics = beamUsesHighGraphicsQuality();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  drawBeamWeaponSprite(beamWeapon, swordPose, {
    filter: "brightness(1.22) saturate(1.28)",
    highlightIntensity: 0.86 + progress * 0.54,
    tintFillAlpha: 0.78 + progress * 0.2,
  });

  for (let index = 0; index < profile.chargeParticleCount; index += 1) {
    const seed = index * 1.417 + player.facing * 0.73;
    const spinAngle = state.time * 0.0028 + seed * 2.4;
    const sourceRadius = shellRadius * (0.72 + (Math.sin(seed * 1.93) * 0.5 + 0.5) * 0.46);
    const sourceX = combatAnchor.screenX
      + Math.cos(spinAngle) * sourceRadius
      + Math.cos(state.time * 0.009 + seed * 4.2) * particleJitter * 0.32;
    const sourceY = combatAnchor.screenY
      + Math.sin(spinAngle * 1.08) * sourceRadius * 0.74
      + Math.sin(state.time * 0.011 + seed * 3.1) * particleJitter * 0.24;
    const swirlAngle = state.time * 0.016 + seed * 5.4;
    const targetOrbitRadius = orbRadius * (1 - pull) * (0.16 + (index % 4) * 0.05);
    const targetX = chargeTargetX + Math.cos(swirlAngle) * targetOrbitRadius;
    const targetY = chargeTargetY + Math.sin(swirlAngle * 1.2) * targetOrbitRadius;
    const drawX = sourceX + (targetX - sourceX) * pull;
    const drawY = sourceY + (targetY - sourceY) * pull;
    const particleRadius = profile.particleSize * (0.38 + (Math.sin(swirlAngle * 1.7) * 0.5 + 0.5) * 0.82);
    const alpha = 0.16 + progress * 0.22 + (Math.sin(swirlAngle * 1.13) * 0.5 + 0.5) * 0.2;
    const particleGlow = ctx.createRadialGradient(
      drawX,
      drawY,
      particleRadius * 0.12,
      drawX,
      drawY,
      particleRadius,
    );
    particleGlow.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, alpha * 1.65)})`);
    particleGlow.addColorStop(0.48, `rgba(255, 246, 220, ${Math.min(1, alpha)})`);
    particleGlow.addColorStop(1, "rgba(255, 220, 156, 0)");
    ctx.fillStyle = particleGlow;
    ctx.beginPath();
    ctx.arc(drawX, drawY, particleRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  const chargeGlowFill = ctx.createRadialGradient(
    chargeTargetX,
    chargeTargetY,
    orbRadius * 0.08,
    chargeTargetX,
    chargeTargetY,
    orbRadius * 1.36,
  );
  chargeGlowFill.addColorStop(0, `rgba(255, 255, 255, ${0.42 + progress * 0.42})`);
  chargeGlowFill.addColorStop(0.26, `rgba(255, 250, 236, ${0.34 + progress * 0.24})`);
  chargeGlowFill.addColorStop(0.62, `rgba(255, 234, 190, ${0.16 + progress * 0.16})`);
  chargeGlowFill.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = chargeGlowFill;
  ctx.beginPath();
  ctx.arc(chargeTargetX, chargeTargetY, orbRadius * 1.36, 0, Math.PI * 2);
  ctx.fill();

  const chargeCoreFill = ctx.createRadialGradient(
    chargeTargetX,
    chargeTargetY,
    orbRadius * 0.04,
    chargeTargetX,
    chargeTargetY,
    orbRadius,
  );
  chargeCoreFill.addColorStop(0, "rgba(255, 255, 255, 1)");
  chargeCoreFill.addColorStop(0.34, "rgba(255, 255, 250, 0.98)");
  chargeCoreFill.addColorStop(0.76, `rgba(255, 244, 216, ${0.46 + progress * 0.2})`);
  chargeCoreFill.addColorStop(1, "rgba(255, 230, 184, 0)");
  ctx.fillStyle = chargeCoreFill;
  ctx.beginPath();
  ctx.arc(chargeTargetX, chargeTargetY, orbRadius, 0, Math.PI * 2);
  ctx.fill();

  if (highGraphics) {
    drawBeamHighChargeCorona(chargeTargetX, chargeTargetY, orbRadius, player.facing, progress);
  }

  if (progress > 0.68) {
    const ringRadius = orbRadius * (1.14 + Math.sin(state.time * 0.018) * 0.06);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 + (progress - 0.68) * 1.7})`;
    ctx.lineWidth = Math.max(1, profile.visualWhiteHotWidth * 0.32);
    ctx.beginPath();
    ctx.arc(chargeTargetX, chargeTargetY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerBeamVisual(player, scene, drawHeight) {
  if (!player?.beam) {
    return;
  }

  const beam = player.beam;
  const highGraphics = beamUsesHighGraphicsQuality();
  const beamWeapon = getWeaponById(beam.weaponId);
  const rawBeamLine = resolvePlayerBeamLine(player, scene, beam);
  const beamLine = typeof resolveTitanCentipedeBeamClashLine === "function"
    ? (resolveTitanCentipedeBeamClashLine(rawBeamLine, "player", state.game) || rawBeamLine)
    : rawBeamLine;
  const beamProfile = currentBeamProfile();
  const swordPose = resolveActiveBeamSwordPose(
    player,
    scene,
    drawHeight,
    beamProfile,
    beam.angle,
    beam,
  );
  const pulse = Math.sin(state.time * Number(beam.shimmerSpeed ?? 0.018) + Number(beam.phaseOffset ?? 0)) * 0.5 + 0.5;
  const glowWidth = Number(beam.visualGlowWidth ?? scene.tileSize * 0.72) * (1.14 + pulse * 0.28);
  const coreWidth = Number(beam.visualCoreWidth ?? scene.tileSize * 0.14) * (1 + pulse * 0.18);
  const whiteHotWidth = Number(beam.visualWhiteHotWidth ?? scene.tileSize * 0.06) * (1.08 + pulse * 0.12);
  const endpointRadius = Number(beam.endpointRadius ?? scene.tileSize * 0.8) * (1.08 + pulse * 0.22);
  const primaryGradient = ctx.createLinearGradient(
    beamLine.startScreenX,
    beamLine.startScreenY,
    beamLine.endScreenX,
    beamLine.endScreenY,
  );
  primaryGradient.addColorStop(0, "rgba(255, 232, 204, 0.28)");
  primaryGradient.addColorStop(0.24, "rgba(255, 248, 228, 0.46)");
  primaryGradient.addColorStop(0.62, "rgba(255, 255, 246, 0.4)");
  primaryGradient.addColorStop(1, "rgba(255, 255, 255, 0.18)");
  const coreGradient = ctx.createLinearGradient(
    beamLine.startScreenX,
    beamLine.startScreenY,
    beamLine.endScreenX,
    beamLine.endScreenY,
  );
  coreGradient.addColorStop(0, "rgba(255, 248, 230, 0.96)");
  coreGradient.addColorStop(0.45, "rgba(255, 255, 252, 1)");
  coreGradient.addColorStop(1, "rgba(255, 248, 224, 0.94)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = "rgba(255, 255, 255, 0.92)";
  ctx.shadowBlur = glowWidth * 1.35;
  if (highGraphics) {
    drawBeamHighFilamentLayer(beamLine, glowWidth, coreWidth, pulse, 1);
    drawBeamHighEnergyCurrents(beamLine, glowWidth, coreWidth, pulse, 0.94);
  }
  drawBeamScreenPath(beamLine, glowWidth * 1.6, primaryGradient, 0.98);
  drawBeamScreenPath(beamLine, glowWidth, "rgba(255, 255, 246, 0.44)", 0.96);
  drawBeamScreenPath(beamLine, coreWidth * 1.32, "rgba(255, 255, 244, 0.82)", 0.96);
  drawBeamScreenPath(beamLine, coreWidth, coreGradient, 1);
  drawBeamScreenPath(beamLine, whiteHotWidth, "rgba(255, 255, 255, 1)", 0.98);
  drawBeamScreenPath(beamLine, Math.max(1, whiteHotWidth * 0.46), "rgba(255, 255, 255, 1)", 0.96);
  if (highGraphics) {
    drawBeamHighGoldenOverlay(beamLine, glowWidth, coreWidth, pulse, beam.phaseOffset ?? 0.61, 1);
  }
  drawBeamParticleField(beamLine, beam, scene, 1);
  if (highGraphics) {
    const originGlow = ctx.createRadialGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      endpointRadius * 0.14,
      beamLine.startScreenX,
      beamLine.startScreenY,
      endpointRadius * 1.18,
    );
    originGlow.addColorStop(0, "rgba(255, 255, 255, 1)");
    originGlow.addColorStop(0.28, "rgba(255, 248, 226, 0.82)");
    originGlow.addColorStop(0.62, "rgba(255, 236, 188, 0.28)");
    originGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = originGlow;
    ctx.beginPath();
    ctx.arc(beamLine.startScreenX, beamLine.startScreenY, endpointRadius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    const impactGlow = ctx.createRadialGradient(
      beamLine.endScreenX,
      beamLine.endScreenY,
      endpointRadius * 0.12,
      beamLine.endScreenX,
      beamLine.endScreenY,
      endpointRadius * 1.5,
    );
    impactGlow.addColorStop(0, "rgba(255, 255, 255, 1)");
    impactGlow.addColorStop(0.22, "rgba(255, 255, 246, 0.9)");
    impactGlow.addColorStop(0.58, "rgba(255, 238, 198, 0.34)");
    impactGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = impactGlow;
    ctx.beginPath();
    ctx.arc(beamLine.endScreenX, beamLine.endScreenY, endpointRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    drawBeamHighEndpointCorona(
      beamLine.startScreenX,
      beamLine.startScreenY,
      -beamLine.directionX,
      -beamLine.directionY,
      endpointRadius,
      0.78,
    );
    drawBeamHighEndpointCorona(
      beamLine.endScreenX,
      beamLine.endScreenY,
      beamLine.directionX,
      beamLine.directionY,
      endpointRadius * 1.12,
      0.9,
    );
  } else {
    drawBeamGlowSprite("origin", beamLine.startScreenX, beamLine.startScreenY, endpointRadius * 1.18, 1);
    drawBeamGlowSprite("impact", beamLine.endScreenX, beamLine.endScreenY, endpointRadius * 1.5, 1);
  }
  ctx.restore();

  if (!swordPose?.usingSpinSource) {
    drawBeamWeaponSprite(beamWeapon, swordPose, {
      filter: "brightness(1.18) saturate(1.32)",
      highlightIntensity: 1.08 + pulse * 0.22,
      tintFillAlpha: 0.88 + pulse * 0.08,
    });
  }
}
