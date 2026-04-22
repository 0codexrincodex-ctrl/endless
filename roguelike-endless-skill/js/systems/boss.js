/* Boss system: boss profiles, summon/control flow, and Titan Centipede visuals. */

const BOSS_SUMMON_TRIGGER_RADIUS_SCALE = 1.08;
const BOSS_SUMMON_TRIGGER_OFFSET_FROM_START_ZONE_SCALE = 3.8;
const TITAN_CENTIPEDE_BOSS_ID = "titan-centipede";
const TITAN_CENTIPEDE_BASE_PART_SIZE_PX = 32;
const TITAN_CENTIPEDE_MAIN_SHEET_PATH = "boss-asset-handmed/body - Titan centipede .png";
const TITAN_CENTIPEDE_LEFT_FANG_SHEET_PATH = "boss-asset-handmed/Left fang - Titan centipede - 20fps.png";
const TITAN_CENTIPEDE_RIGHT_FANG_SHEET_PATH = "boss-asset-handmed/Right fang - Titan centipede - 20fps.png";
const TITAN_CENTIPEDE_HEAD_PHASE_FRAME_INDICES = Object.freeze([0, 1, 2]);
const TITAN_CENTIPEDE_BODY_FRAME_INDEX = 3;
const TITAN_CENTIPEDE_TAIL_FRAME_INDEX = 4;
const TITAN_CENTIPEDE_BODY_SEGMENT_LENGTH_METERS = 1;
const TITAN_CENTIPEDE_BODY_LENGTH_METERS = 150;
const TITAN_CENTIPEDE_BODY_SEGMENT_COUNT = Math.max(
  1,
  Math.round(TITAN_CENTIPEDE_BODY_LENGTH_METERS / TITAN_CENTIPEDE_BODY_SEGMENT_LENGTH_METERS),
);
const TITAN_CENTIPEDE_BEAM_CHARGE_SECONDS = 0.58;
const TITAN_CENTIPEDE_PHASE_THREE_BEAM_CHARGE_SECONDS = 7;
const TITAN_CENTIPEDE_BEAM_HIT_INTERVAL_SECONDS = 0.09;
const TITAN_CENTIPEDE_FANG_OPEN_SECONDS = 0.12;
const TITAN_CENTIPEDE_PHASE_THREE_FANG_OPEN_SECONDS = 0.08;
const TITAN_CENTIPEDE_FANG_OPEN_BASE_ANGLE = Math.PI * 0.11;
const TITAN_CENTIPEDE_PHASE_RETREAT_SECONDS = 0.16;
const TITAN_CENTIPEDE_PHASE_COVER_SECONDS = 0.14;
const TITAN_CENTIPEDE_PHASE_HOLD_SECONDS = 0.05;
const TITAN_CENTIPEDE_BASE_SPEED_MULTIPLIER = 1.5;
const TITAN_CENTIPEDE_PHASE_TWO_SPEED_MULTIPLIER = 2;
const TITAN_CENTIPEDE_PHASE_THREE_BEAM_WIDTH_MULTIPLIER = 16;
const TITAN_CENTIPEDE_PHASE_THREE_FANG_FIRE_SPREAD_MULTIPLIER = 1.7;
const TITAN_CENTIPEDE_PHASE_THREE_FANG_OPEN_MAX_ANGLE = Math.PI * 0.5;
const TITAN_CENTIPEDE_RAM_HIT_INTERVAL_SECONDS = 0.18;
const TITAN_CENTIPEDE_FANG_OFFSET_X_SCALE = 1.8;
const TITAN_CENTIPEDE_FANG_OFFSET_Y_SCALE = 0.7018;
const TITAN_CENTIPEDE_FANG_SIZE_SCALE = 9;
const TITAN_CENTIPEDE_BEAM_CLASH_MIN_OPPOSING_DOT = -0.72;
const TITAN_CENTIPEDE_BEAM_CLASH_PUSH_SPEED_SCALE = 2.8;
const TITAN_CENTIPEDE_BEAM_CLASH_MIN_PROGRESS = 0.04;
const TITAN_CENTIPEDE_BEAM_CLASH_MAX_PROGRESS = 0.97;
const TITAN_CENTIPEDE_BEAM_CLASH_ENABLED = true;
const TITAN_CENTIPEDE_BEAM_CLASH_SPLIT_BRANCH_LENGTH_SCALE = 50;
const TITAN_CENTIPEDE_MAIN_SHEET_IMAGE = loadImageAsset(TITAN_CENTIPEDE_MAIN_SHEET_PATH);
const TITAN_CENTIPEDE_LEFT_FANG_SHEET_IMAGE = loadImageAsset(TITAN_CENTIPEDE_LEFT_FANG_SHEET_PATH);
const TITAN_CENTIPEDE_RIGHT_FANG_SHEET_IMAGE = loadImageAsset(TITAN_CENTIPEDE_RIGHT_FANG_SHEET_PATH);

function createTitanCentipedeBossProfile() {
  return {
    id: TITAN_CENTIPEDE_BOSS_ID,
    label: "Titan Centipede",
    mainSheet: {
      src: TITAN_CENTIPEDE_MAIN_SHEET_PATH,
      image: TITAN_CENTIPEDE_MAIN_SHEET_IMAGE,
      partSize: TITAN_CENTIPEDE_BASE_PART_SIZE_PX,
      frameCount: 5,
      headPhaseFrameIndices: TITAN_CENTIPEDE_HEAD_PHASE_FRAME_INDICES.slice(),
      bodyFrameIndex: TITAN_CENTIPEDE_BODY_FRAME_INDEX,
      tailFrameIndex: TITAN_CENTIPEDE_TAIL_FRAME_INDEX,
    },
    fangs: {
      leftSrc: TITAN_CENTIPEDE_LEFT_FANG_SHEET_PATH,
      rightSrc: TITAN_CENTIPEDE_RIGHT_FANG_SHEET_PATH,
      leftImage: TITAN_CENTIPEDE_LEFT_FANG_SHEET_IMAGE,
      rightImage: TITAN_CENTIPEDE_RIGHT_FANG_SHEET_IMAGE,
      frameCount: 4,
      partSize: TITAN_CENTIPEDE_BASE_PART_SIZE_PX,
    },
    body: {
      metersPerSegment: TITAN_CENTIPEDE_BODY_SEGMENT_LENGTH_METERS,
      lengthMeters: TITAN_CENTIPEDE_BODY_LENGTH_METERS,
      segmentCount: TITAN_CENTIPEDE_BODY_SEGMENT_COUNT,
      totalParts: TITAN_CENTIPEDE_BODY_SEGMENT_COUNT + 2,
    },
    renderScale: 1,
  };
}

function createBossSummonTrigger(scene, startZone) {
  if (!scene || !startZone) {
    return null;
  }

  const radius = Math.max(32, scene.tileSize * BOSS_SUMMON_TRIGGER_RADIUS_SCALE);
  const offset = Math.max(
    scene.tileSize * 6.5,
    Number(startZone.radius ?? 0) + scene.tileSize * BOSS_SUMMON_TRIGGER_OFFSET_FROM_START_ZONE_SCALE + radius,
  );
  return {
    originX: Number(startZone.originX ?? 0) + offset,
    originY: Number(startZone.originY ?? 0),
    radius,
    activated: false,
    activatedAtElapsed: null,
  };
}

function createBossSummonTestState() {
  const titanCentipedeProfile = typeof createTitanCentipedeBossProfile === "function"
    ? createTitanCentipedeBossProfile()
    : null;
  return {
    armed: false,
    summonRequested: false,
    triggeredAtElapsed: null,
    triggerCount: 0,
    pendingBossId: titanCentipedeProfile?.id ?? TITAN_CENTIPEDE_BOSS_ID,
    pendingBossProfile: titanCentipedeProfile,
    activeBoss: null,
    controlPressCount: 0,
    controlPressTarget: 3,
    controllingBoss: false,
  };
}

function activeControlledBoss(game = state.game) {
  if (!game?.bossSummonTest?.controllingBoss) {
    return null;
  }
  return game.bossSummonTest.activeBoss || null;
}

function currentCameraAnchor(game = state.game) {
  return activeControlledBoss(game) || game?.player || null;
}

function activeTitanCentipedeBeamClash(game = state.game) {
  if (!TITAN_CENTIPEDE_BEAM_CLASH_ENABLED) {
    return null;
  }
  return game?.titanBeamClash?.active ? game.titanBeamClash : null;
}

function clearTitanCentipedeBeamClash(game = state.game) {
  if (game) {
    game.titanBeamClash = null;
  }
}

function resolveBeamSegmentIntersection(lineA, lineB) {
  if (!lineA || !lineB) {
    return null;
  }

  const ax = Number(lineA.endX ?? 0) - Number(lineA.startX ?? 0);
  const ay = Number(lineA.endY ?? 0) - Number(lineA.startY ?? 0);
  const bx = Number(lineB.endX ?? 0) - Number(lineB.startX ?? 0);
  const by = Number(lineB.endY ?? 0) - Number(lineB.startY ?? 0);
  const startDeltaX = Number(lineB.startX ?? 0) - Number(lineA.startX ?? 0);
  const startDeltaY = Number(lineB.startY ?? 0) - Number(lineA.startY ?? 0);
  const denominator = ax * by - ay * bx;
  if (Math.abs(denominator) <= 0.000001) {
    const rangeA = Math.max(0.0001, Number(lineA.range ?? Math.hypot(ax, ay)) || Math.hypot(ax, ay) || 0.0001);
    const rangeB = Math.max(0.0001, Number(lineB.range ?? Math.hypot(bx, by)) || Math.hypot(bx, by) || 0.0001);
    const projectedStartB = resolveBeamLineProjectedDistance(lineA, lineB.startX, lineB.startY);
    const projectedEndB = resolveBeamLineProjectedDistance(lineA, lineB.endX, lineB.endY);
    const overlapStart = Math.max(0, Math.min(projectedStartB, projectedEndB));
    const overlapEnd = Math.min(rangeA, Math.max(projectedStartB, projectedEndB));
    if (overlapEnd < overlapStart) {
      return null;
    }

    const distanceA = (overlapStart + overlapEnd) * 0.5;
    const pointX = Number(lineA.startX ?? 0) + Number(lineA.directionX ?? 1) * distanceA;
    const pointY = Number(lineA.startY ?? 0) + Number(lineA.directionY ?? 0) * distanceA;
    const distanceB = clamp(resolveBeamLineProjectedDistance(lineB, pointX, pointY), 0, rangeB);
    return {
      x: pointX,
      y: pointY,
      tA: distanceA / rangeA,
      tB: distanceB / rangeB,
      collinear: true,
    };
  }

  const tA = (startDeltaX * by - startDeltaY * bx) / denominator;
  const tB = (startDeltaX * ay - startDeltaY * ax) / denominator;
  if (tA < 0 || tA > 1 || tB < 0 || tB > 1) {
    return null;
  }

  return {
    x: Number(lineA.startX ?? 0) + ax * tA,
    y: Number(lineA.startY ?? 0) + ay * tA,
    tA,
    tB,
  };
}

function resolveNearParallelBeamIntersection(lineA, lineB, maxCrossDistance = 0) {
  if (!lineA || !lineB) {
    return null;
  }

  const alignment = Math.abs(
    Number(lineA.directionX ?? 1) * Number(lineB.directionY ?? 0)
    - Number(lineA.directionY ?? 0) * Number(lineB.directionX ?? 1),
  );
  if (alignment > 0.2) {
    return null;
  }

  const normalX = -Number(lineA.directionY ?? 0);
  const normalY = Number(lineA.directionX ?? 1);
  const crossDistanceStart = Math.abs(
    (Number(lineB.startX ?? 0) - Number(lineA.startX ?? 0)) * normalX
    + (Number(lineB.startY ?? 0) - Number(lineA.startY ?? 0)) * normalY,
  );
  const crossDistanceEnd = Math.abs(
    (Number(lineB.endX ?? 0) - Number(lineA.startX ?? 0)) * normalX
    + (Number(lineB.endY ?? 0) - Number(lineA.startY ?? 0)) * normalY,
  );
  const nearestCrossDistance = Math.min(crossDistanceStart, crossDistanceEnd);
  if (nearestCrossDistance > Math.max(1, Number(maxCrossDistance ?? 0))) {
    return null;
  }

  const rangeA = Math.max(0.0001, Number(lineA.range ?? 0) || 0.0001);
  const rangeB = Math.max(0.0001, Number(lineB.range ?? 0) || 0.0001);
  const projectedStartB = resolveBeamLineProjectedDistance(lineA, lineB.startX, lineB.startY);
  const projectedEndB = resolveBeamLineProjectedDistance(lineA, lineB.endX, lineB.endY);
  const overlapStart = Math.max(0, Math.min(projectedStartB, projectedEndB));
  const overlapEnd = Math.min(rangeA, Math.max(projectedStartB, projectedEndB));
  if (overlapEnd < overlapStart) {
    return null;
  }

  const distanceA = (overlapStart + overlapEnd) * 0.5;
  const pointX = Number(lineA.startX ?? 0) + Number(lineA.directionX ?? 1) * distanceA;
  const pointY = Number(lineA.startY ?? 0) + Number(lineA.directionY ?? 0) * distanceA;
  const distanceB = clamp(resolveBeamLineProjectedDistance(lineB, pointX, pointY), 0, rangeB);
  return {
    x: pointX,
    y: pointY,
    tA: distanceA / rangeA,
    tB: distanceB / rangeB,
    nearParallel: true,
  };
}

function resolveBeamLineProjectedDistance(beamLine, pointX, pointY) {
  if (!beamLine) {
    return 0;
  }

  const dx = Number(pointX ?? 0) - Number(beamLine.startX ?? 0);
  const dy = Number(pointY ?? 0) - Number(beamLine.startY ?? 0);
  return dx * Number(beamLine.directionX ?? 1) + dy * Number(beamLine.directionY ?? 0);
}

function resolveTitanCentipedeBeamClashLine(beamLine, owner = "boss", game = state.game) {
  const clash = activeTitanCentipedeBeamClash(game);
  if (!clash || !beamLine || typeof createBeamSegmentLine !== "function") {
    return beamLine;
  }

  const endProgress = owner === "player"
    ? clamp(Number(clash.playerEndProgress ?? 1) || 0, 0, 1)
    : clamp(Number(clash.bossEndProgress ?? 1) || 0, 0, 1);
  return createBeamSegmentLine(beamLine, 0, endProgress);
}

function resolveTitanCentipedeBossClashLines(beamLine, game = state.game) {
  if (!beamLine || typeof createBeamSegmentLine !== "function") {
    return [];
  }

  const clash = activeTitanCentipedeBeamClash(game);
  if (!clash) {
    return [beamLine];
  }

  const safeEndProgress = clamp(Number(clash.bossEndProgress ?? 1) || 0, 0, 1);
  const splitEndProgress = clamp(
    Number(clash.bossSplitEndDistance ?? 0) / Math.max(0.0001, Number(beamLine.range ?? 0)),
    safeEndProgress,
    1,
  );
  const mainLine = createBeamSegmentLine(beamLine, 0, safeEndProgress);
  const splitOffset = Number(clash.splitOffset ?? 0);
  const upperLine = createTitanCentipedeClashBranchLine(beamLine, safeEndProgress, splitEndProgress, splitOffset);
  const lowerLine = createTitanCentipedeClashBranchLine(beamLine, safeEndProgress, splitEndProgress, -splitOffset);
  return [mainLine, upperLine, lowerLine].filter(Boolean);
}

function createTitanCentipedeClashBranchLine(beamLine, impactProgress, branchProgress, endOffset = 0) {
  if (!beamLine || typeof createBeamLineFromWorldPoints !== "function") {
    return null;
  }

  const safeImpactProgress = clamp(Number(impactProgress ?? 0) || 0, 0, 1);
  const safeBranchProgress = clamp(Number(branchProgress ?? 0) || 0, 0, 1);
  if (safeBranchProgress <= safeImpactProgress) {
    return null;
  }

  const impactWorldPoint = beamWorldPointAtProgress(beamLine, safeImpactProgress);
  const branchBaseWorldPoint = beamWorldPointAtProgress(beamLine, safeBranchProgress);
  const normalX = -Number(beamLine.directionY ?? 0);
  const normalY = Number(beamLine.directionX ?? 1);
  const branchStartX = branchBaseWorldPoint.x + normalX * Number(endOffset ?? 0);
  const branchStartY = branchBaseWorldPoint.y + normalY * Number(endOffset ?? 0);
  const branchDx = impactWorldPoint.x - branchStartX;
  const branchDy = impactWorldPoint.y - branchStartY;
  const branchLength = Math.hypot(branchDx, branchDy);
  if (branchLength <= 0.0001) {
    return null;
  }

  const cameraLeft = Number(beamLine.startX ?? 0) - Number(beamLine.startScreenX ?? 0);
  const cameraTop = Number(beamLine.startY ?? 0) - Number(beamLine.startScreenY ?? 0);
  return createBeamLineFromWorldPoints(
    branchStartX,
    branchStartY,
    branchDx,
    branchDy,
    branchLength,
    cameraLeft,
    cameraTop,
  );
}

function updateTitanCentipedeBeamClash(dt, game = state.game) {
  if (!TITAN_CENTIPEDE_BEAM_CLASH_ENABLED) {
    clearTitanCentipedeBeamClash(game);
    return null;
  }
  const boss = game?.bossSummonTest?.activeBoss;
  const player = game?.player;
  const scene = game?.scene;
  const playerBeam = player?.beam;
  const bossBeam = boss?.beamAttack;
  if (!boss || !player || !scene || !playerBeam || !bossBeam?.active || !bossBeam.currentLine) {
    clearTitanCentipedeBeamClash(game);
    return null;
  }

  const playerLine = resolvePlayerBeamLine(player, scene, playerBeam);
  const bossLine = bossBeam.currentLine;
  const opposingDot = playerLine.directionX * bossLine.directionX + playerLine.directionY * bossLine.directionY;
  if (opposingDot > TITAN_CENTIPEDE_BEAM_CLASH_MIN_OPPOSING_DOT) {
    clearTitanCentipedeBeamClash(game);
    return null;
  }

  const maxParallelCrossDistance = Math.max(
    scene.tileSize * 0.65,
    Math.max(
      Number(playerBeam.width ?? scene.tileSize * 0.3),
      Number(bossBeam.width ?? scene.tileSize * 0.34),
    ) * 0.58,
  );
  const intersection = resolveBeamSegmentIntersection(playerLine, bossLine)
    || resolveNearParallelBeamIntersection(playerLine, bossLine, maxParallelCrossDistance);
  if (!intersection) {
    clearTitanCentipedeBeamClash(game);
    return null;
  }

  const playerPower = Math.max(1, Number(playerBeam.damage ?? 1) || 1);
  const bossPower = Math.max(1, Number(bossBeam.damage ?? 1) || 1);
  const phaseIndex = titanCentipedeResolvedPhaseIndex(boss);
  const standardBeamClashSpreadMultiplier = phaseIndex === 2 ? 1 : 2.35;
  const dominance = clamp(
    (playerPower - bossPower) / Math.max(playerPower, bossPower),
    -1,
    1,
  );
  const minBossDistance = Math.max(scene.tileSize * 0.9, Number(bossLine.range ?? 0) * TITAN_CENTIPEDE_BEAM_CLASH_MIN_PROGRESS);
  const maxBossDistance = Math.max(
    minBossDistance + scene.tileSize * 0.8,
    Number(bossLine.range ?? 0) * TITAN_CENTIPEDE_BEAM_CLASH_MAX_PROGRESS,
  );
  const previousClash = activeTitanCentipedeBeamClash(game);
  const baseBossDistance = clamp(
    intersection.tB * Math.max(0.0001, Number(bossLine.range ?? 0)),
    minBossDistance,
    maxBossDistance,
  );
  const nextDuration = previousClash ? Math.max(0, Number(previousClash.duration ?? 0) + dt) : 0;
  let bossDistance = previousClash
    ? Number(previousClash.bossDistance ?? baseBossDistance)
    : baseBossDistance;
  bossDistance = clamp(
    bossDistance - dominance * scene.tileSize * (TITAN_CENTIPEDE_BEAM_CLASH_PUSH_SPEED_SCALE + Math.abs(dominance) * 1.8) * dt,
    minBossDistance,
    maxBossDistance,
  );

  const pointX = bossLine.startX + bossLine.directionX * bossDistance;
  const pointY = bossLine.startY + bossLine.directionY * bossDistance;
  const projectedPlayerDistance = resolveBeamLineProjectedDistance(playerLine, pointX, pointY);
  const playerDistance = clamp(
    projectedPlayerDistance,
    Math.max(scene.tileSize * 0.6, Number(playerLine.range ?? 0) * 0.03),
    Math.max(scene.tileSize * 0.6, Number(playerLine.range ?? 0)),
  );
  const playerPointX = playerLine.startX + playerLine.directionX * playerDistance;
  const playerPointY = playerLine.startY + playerLine.directionY * playerDistance;
  const lineSeparation = Math.hypot(pointX - playerPointX, pointY - playerPointY);
  const maxSeparation = Math.max(scene.tileSize * 1.2, Number(bossBeam.width ?? scene.tileSize) * 0.32);
  if (lineSeparation > maxSeparation) {
    clearTitanCentipedeBeamClash(game);
    return null;
  }

  const playerEndProgress = clamp(
    playerDistance / Math.max(0.0001, Number(playerLine.range ?? 0)),
    0,
    1,
  );
  const bossEndProgress = clamp(
    bossDistance / Math.max(0.0001, Number(bossLine.range ?? 0)),
    0,
    1,
  );
  const splitBranchDistance = scene.tileSize * TITAN_CENTIPEDE_BEAM_CLASH_SPLIT_BRANCH_LENGTH_SCALE;
  const bossSplitEndDistance = clamp(
    bossDistance + splitBranchDistance,
    bossDistance,
    Math.max(bossDistance, Number(bossLine.range ?? bossDistance)),
  );
  const gapWidth = Math.max(
    Number(playerBeam.visualGlowWidth ?? playerBeam.width ?? scene.tileSize * 0.6) * 1.24,
    Number(bossBeam.visualGlowWidth ?? bossBeam.width ?? scene.tileSize * 0.6) * (phaseIndex === 2 ? 0.42 : 0.9),
    scene.tileSize * (phaseIndex === 2 ? 0.9 : 1.38),
  ) * (1.04 + nextDuration * 0.04) * standardBeamClashSpreadMultiplier;
  const splitOffset = Math.max(
    gapWidth * (phaseIndex === 2 ? 0.56 : 0.9),
    Number(bossBeam.visualCoreWidth ?? scene.tileSize * 0.9) * (phaseIndex === 2 ? 0.18 : 0.42),
  );
  const seamRadius = Math.max(scene.tileSize * (phaseIndex === 2 ? 0.9 : 1.18), gapWidth * 0.92) * (1 + nextDuration * 0.05);

  game.titanBeamClash = {
    active: true,
    duration: nextDuration,
    phaseIndex,
    dominance,
    playerPower,
    bossPower,
    opposingDot,
    pointX,
    pointY,
    playerDistance,
    playerDirectionX: Number(playerLine.directionX ?? 0),
    playerDirectionY: Number(playerLine.directionY ?? 0),
    bossDistance,
    playerEndProgress,
    bossEndProgress,
    bossSplitEndDistance,
    gapWidth,
    splitOffset,
    seamRadius,
  };
  return game.titanBeamClash;
}

function bossControlInteractionRadius(game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  const scene = game?.scene;
  if (!boss || !scene) {
    return 0;
  }

  return Math.max(
    scene.tileSize * 2.4,
    Number(boss.drawPartSize ?? scene.tileSize * 2.7) * 0.8,
  );
}

function bossControlMouseVector(game = state.game) {
  const arena = game?.arena;
  const scene = game?.scene;
  if (!arena || !scene) {
    return { x: 0, y: 0 };
  }

  const centerX = Number(arena.width ?? 0) * 0.5;
  const centerY = Number(arena.height ?? 0) * 0.5;
  const offsetX = Number(state.input.mouseX ?? centerX) - centerX;
  const offsetY = Number(state.input.mouseY ?? centerY) - centerY;
  const distance = Math.hypot(offsetX, offsetY);
  const deadzone = Math.max(18, scene.tileSize * 0.8);
  if (distance <= deadzone) {
    return { x: 0, y: 0 };
  }

  const maxDistance = Math.max(
    deadzone + 1,
    Math.min(Number(arena.width ?? 0), Number(arena.height ?? 0)) * 0.32,
  );
  const strength = clamp((distance - deadzone) / Math.max(1, maxDistance - deadzone), 0, 1);
  return {
    x: (offsetX / distance) * strength,
    y: (offsetY / distance) * strength,
  };
}

function bossControlMoveVector(game = state.game) {
  const keyboardMove = movementVector();
  const mouseMove = state.input.bossBeamHeld ? { x: 0, y: 0 } : bossControlMouseVector(game);
  const combinedX = keyboardMove.x + mouseMove.x;
  const combinedY = keyboardMove.y + mouseMove.y;
  const combinedLength = Math.hypot(combinedX, combinedY);
  if (combinedLength <= 0.001) {
    return { x: 0, y: 0 };
  }

  if (combinedLength <= 1) {
    return { x: combinedX, y: combinedY };
  }

  return {
    x: combinedX / combinedLength,
    y: combinedY / combinedLength,
  };
}

function bossBeamControlKey(event) {
  return event?.code === "ShiftLeft" || event?.code === "ShiftRight";
}

function titanCentipedePhaseStageDuration(stage) {
  if (stage === "retreat" || stage === "return") {
    return TITAN_CENTIPEDE_PHASE_RETREAT_SECONDS;
  }
  if (stage === "cover-in" || stage === "cover-out") {
    return TITAN_CENTIPEDE_PHASE_COVER_SECONDS;
  }
  return TITAN_CENTIPEDE_PHASE_HOLD_SECONDS;
}

function titanCentipedePhaseTransitionEase(progress = 0) {
  const t = clamp(progress, 0, 1);
  return t * t * (3 - 2 * t);
}

function bossPhaseHotkeyIndex(event) {
  const code = String(event?.code || "");
  if (code === "Digit1" || code === "Numpad1") {
    return 0;
  }
  if (code === "Digit2" || code === "Numpad2") {
    return 1;
  }
  if (code === "Digit3" || code === "Numpad3") {
    return 2;
  }
  return null;
}

function requestBossPhaseChange(targetPhaseIndex, game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  if (!boss) {
    return false;
  }

  const headPhaseCount = Math.max(
    1,
    Array.isArray(boss.profile?.mainSheet?.headPhaseFrameIndices)
      ? boss.profile.mainSheet.headPhaseFrameIndices.length
      : 1,
  );
  const nextPhaseIndex = clamp(targetPhaseIndex, 0, headPhaseCount - 1);
  if (boss.phaseTransition) {
    setHudSaveMessage("Boss phase change in progress");
    return true;
  }
  if (nextPhaseIndex === Number(boss.phaseIndex ?? 0)) {
    setHudSaveMessage(`Boss phase ${nextPhaseIndex + 1}`);
    return true;
  }

  boss.phaseTransition = {
    targetPhaseIndex: nextPhaseIndex,
    fromPhaseIndex: Number(boss.phaseIndex ?? 0),
    maxPhaseIndex: headPhaseCount - 1,
    stage: "retreat",
    stageElapsed: 0,
    phaseApplied: false,
  };
  setHudSaveMessage(`Boss phase ${nextPhaseIndex + 1} queued`);
  return true;
}

function handleBossPhaseHotkey(event, game = state.game) {
  const targetPhaseIndex = bossPhaseHotkeyIndex(event);
  if (targetPhaseIndex == null) {
    return false;
  }
  return requestBossPhaseChange(targetPhaseIndex, game);
}

function updateTitanCentipedePhaseTransition(dt, boss) {
  const transition = boss?.phaseTransition;
  if (!transition) {
    return false;
  }

  transition.stageElapsed = Math.max(0, Number(transition.stageElapsed ?? 0) + dt);
  const currentStage = String(transition.stage || "retreat");
  const currentDuration = titanCentipedePhaseStageDuration(currentStage);
  if (transition.stageElapsed < currentDuration) {
    return true;
  }

  if (currentStage === "retreat") {
    transition.stage = "cover-in";
    transition.stageElapsed = 0;
    return true;
  }
  if (currentStage === "cover-in") {
    boss.phaseIndex = clamp(
      Number(transition.targetPhaseIndex ?? 0),
      0,
      Math.max(0, Number(transition.maxPhaseIndex ?? 0) || 0),
    );
    transition.phaseApplied = true;
    transition.stage = "cover-hold";
    transition.stageElapsed = 0;
    return true;
  }
  if (currentStage === "cover-hold") {
    transition.stage = "cover-out";
    transition.stageElapsed = 0;
    return true;
  }
  if (currentStage === "cover-out") {
    transition.stage = "return";
    transition.stageElapsed = 0;
    return true;
  }

  boss.phaseTransition = null;
  return true;
}

function titanCentipedeHornBaseRenderState(boss, scene, headDrawWidth, bodyDrawSize) {
  const defaultState = {
    designOffsetX: Math.max(0, Number(boss?.hornBaseOffsetX ?? scene.tileSize * 1.35) || 0),
    designOffsetY: Number(boss?.hornBaseOffsetY ?? (-scene.tileSize * 0.16))
      + Number(boss?.hornBasePixelNudgeY ?? 0),
    scale: Math.max(0.2, Number(boss?.hornBaseScale ?? 1) || 1),
    drawAboveHead: false,
  };
  const retreatState = {
    designOffsetX: defaultState.designOffsetX + bodyDrawSize * 0.78,
    designOffsetY: defaultState.designOffsetY + scene.tileSize * 0.08,
    scale: defaultState.scale * 0.96,
    drawAboveHead: false,
  };
  const coverState = {
    designOffsetX: -headDrawWidth * 0.06,
    designOffsetY: scene.tileSize * 0.02,
    scale: defaultState.scale * 1.08,
    drawAboveHead: true,
  };
  const transition = boss?.phaseTransition;
  if (!transition) {
    return defaultState;
  }

  const stage = String(transition.stage || "retreat");
  const duration = Math.max(0.001, titanCentipedePhaseStageDuration(stage));
  const progress = titanCentipedePhaseTransitionEase(
    Number(transition.stageElapsed ?? 0) / duration,
  );
  const lerpState = (fromState, toState, drawAboveHead) => ({
    designOffsetX: fromState.designOffsetX + (toState.designOffsetX - fromState.designOffsetX) * progress,
    designOffsetY: fromState.designOffsetY + (toState.designOffsetY - fromState.designOffsetY) * progress,
    scale: fromState.scale + (toState.scale - fromState.scale) * progress,
    drawAboveHead,
  });

  if (stage === "retreat") {
    return lerpState(defaultState, retreatState, false);
  }
  if (stage === "cover-in") {
    return lerpState(retreatState, coverState, true);
  }
  if (stage === "cover-hold") {
    return coverState;
  }
  if (stage === "cover-out") {
    return lerpState(coverState, retreatState, true);
  }
  if (stage === "return") {
    return lerpState(retreatState, defaultState, false);
  }
  return defaultState;
}

function titanCentipedeResolvedPhaseIndex(boss) {
  const headPhaseCount = Math.max(
    1,
    Array.isArray(boss?.profile?.mainSheet?.headPhaseFrameIndices)
      ? boss.profile.mainSheet.headPhaseFrameIndices.length
      : 1,
  );
  return clamp(Number(boss?.phaseIndex ?? 0), 0, headPhaseCount - 1);
}

function titanCentipedePhaseRuntimeProfile(boss, scene, arena = state.game?.arena) {
  const phaseIndex = titanCentipedeResolvedPhaseIndex(boss);
  const drawPartSize = Math.max(
    scene.tileSize * 1.8,
    Number(boss?.drawPartSize ?? scene.tileSize * 2.7) || scene.tileSize * 2.7,
  );
  const baseMoveSpeed = Math.max(1, Number(boss?.baseMoveSpeed ?? scene.tileSize * 4.6) || scene.tileSize * 4.6);
  const baseMoveAcceleration = Math.max(1, Number(boss?.baseMoveAcceleration ?? scene.tileSize * 12) || scene.tileSize * 12);
  const baseMoveDeceleration = Math.max(1, Number(boss?.baseMoveDeceleration ?? scene.tileSize * 14) || scene.tileSize * 14);
  const baseSpeedScale = TITAN_CENTIPEDE_BASE_SPEED_MULTIPLIER;
  const phaseSpeedScale = phaseIndex === 1
    ? baseSpeedScale * TITAN_CENTIPEDE_PHASE_TWO_SPEED_MULTIPLIER
    : baseSpeedScale;
  const speedRatio = phaseSpeedScale / baseSpeedScale;
  const arenaSpan = Math.max(
    Number(arena?.width ?? 0),
    Number(arena?.height ?? 0),
    scene.tileSize * 14,
  );

  return {
    phaseIndex,
    moveSpeed: baseMoveSpeed * phaseSpeedScale,
    moveAcceleration: baseMoveAcceleration * (1 + (speedRatio - 1) * 0.8),
    moveDeceleration: baseMoveDeceleration * (1 + (speedRatio - 1) * 0.9),
    maxTurnRate: 3.9 + speedRatio * 1.1,
    turnAcceleration: 11 + speedRatio * 8,
    lateralDamping: 7.4 + speedRatio * 2.2,
    aiAcquireRange: Math.max(scene.tileSize * 14, drawPartSize * 5.6),
    ramAcquireRange: Math.max(scene.tileSize * 12, arenaSpan * 0.28),
    ramHitRadius: Math.max(scene.tileSize * 0.24, drawPartSize * 0.24),
    ramBaseDamage: Math.max(1, Math.round(drawPartSize * (phaseIndex === 1 ? 0.96 : 0.78))),
    ramWeaponDamageBase: Math.max(1, Math.round(drawPartSize * 1.26)),
    ramHitInterval: phaseIndex === 1
      ? Math.max(0.06, TITAN_CENTIPEDE_RAM_HIT_INTERVAL_SECONDS * 0.85)
      : TITAN_CENTIPEDE_RAM_HIT_INTERVAL_SECONDS,
    fangBiteMultiplier: phaseIndex === 1 ? 2 : 1,
    beamWidthMultiplier: phaseIndex === 2 ? TITAN_CENTIPEDE_PHASE_THREE_BEAM_WIDTH_MULTIPLIER : 1,
  };
}

function titanCentipedeCombatTargets(game = state.game, boss = null, acquireRange = 0) {
  if (typeof getCombatTargets !== "function") {
    return [];
  }

  const aliveTargets = getCombatTargets(game).filter((target) => isCombatTargetAlive(target));
  const hostileTargets = aliveTargets.filter((target) => isHostileCombatTarget(target));
  const candidateTargets = hostileTargets.length ? hostileTargets : aliveTargets;
  if (!boss || acquireRange <= 0) {
    return candidateTargets;
  }

  return candidateTargets.filter((target) => (
    combatTargetDistanceFromPoint(
      target,
      Number(boss.worldX ?? 0),
      Number(boss.worldY ?? 0),
    ) <= acquireRange
  ));
}

function findTitanCentipedeRamTarget(game = state.game, boss = null, phaseProfile = null, desiredHeadingAngle = Math.PI) {
  if (!boss || !phaseProfile) {
    return null;
  }

  const candidateTargets = titanCentipedeCombatTargets(game, boss, phaseProfile.aiAcquireRange);
  if (!candidateTargets.length) {
    return null;
  }

  let bestTarget = null;
  let bestScore = Infinity;
  candidateTargets.forEach((target) => {
    const aimPoint = combatTargetAimPoint(target);
    const angleToTarget = Math.atan2(
      aimPoint.y - Number(boss.worldY ?? 0),
      aimPoint.x - Number(boss.worldX ?? 0),
    );
    const distance = combatTargetDistanceFromPoint(
      target,
      Number(boss.worldX ?? 0),
      Number(boss.worldY ?? 0),
    );
    const anglePenalty = Math.abs(shortestAngleDelta(angleToTarget, desiredHeadingAngle));
    const score = distance + anglePenalty * phaseProfile.aiAcquireRange * 0.2;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  });
  return bestTarget;
}

function updateTitanCentipedeMovement(dt, game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  const scene = game?.scene;
  if (!boss || !scene) {
    return false;
  }

  const phaseProfile = titanCentipedePhaseRuntimeProfile(boss, scene, game?.arena);
  const controllingBoss = Boolean(game?.bossSummonTest?.controllingBoss);
  const previousWorldX = Number(boss.worldX ?? 0);
  const previousWorldY = Number(boss.worldY ?? 0);
  let desiredHeadingAngle = Number(boss.headingAngle ?? Math.PI);
  let throttle = 0;
  let preferredTarget = null;
  const movementLockedAfterRelease = Boolean(!controllingBoss && boss.controlMovementLocked);

  if (movementLockedAfterRelease) {
    const keepMovementLocked = Boolean(
      state.input.bossBeamHeld
      || boss.beamAttack?.active
      || Number(boss.beamAttack?.chargeElapsed ?? 0) > 0
    );
    if (!keepMovementLocked) {
      boss.controlMovementLocked = false;
    }
  } else if (controllingBoss) {
    const moveVector = hasOpenHudOverlay() ? { x: 0, y: 0 } : bossControlMoveVector(game);
    const moveStrength = clamp(Math.hypot(moveVector.x, moveVector.y), 0, 1);
    const beamHeld = Boolean(state.input.bossBeamHeld);
    if (beamHeld) {
      desiredHeadingAngle = bossControlAimAngle(game, desiredHeadingAngle);
      throttle = moveStrength;
    } else if (moveStrength > 0.001) {
      desiredHeadingAngle = Math.atan2(moveVector.y, moveVector.x);
      throttle = moveStrength;
    }
    preferredTarget = findTitanCentipedeRamTarget(game, boss, phaseProfile, desiredHeadingAngle);
  } else {
    preferredTarget = findTitanCentipedeRamTarget(game, boss, phaseProfile, desiredHeadingAngle);
    if (preferredTarget) {
      const aimPoint = combatTargetAimPoint(preferredTarget);
      const dx = aimPoint.x - previousWorldX;
      const dy = aimPoint.y - previousWorldY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const livelyBias = Math.sin((state.time + Number(boss.spawnedAtElapsed ?? 0) * 1000) * 0.0032)
        * clamp(distance / phaseProfile.aiAcquireRange, 0, 1)
        * 0.15;
      desiredHeadingAngle = Math.atan2(dy, dx) + livelyBias;
      throttle = clamp(0.52 + (distance / phaseProfile.aiAcquireRange) * 0.58, 0.52, 1);
    }
  }

  const headingAngle = Number.isFinite(Number(boss.headingAngle)) ? Number(boss.headingAngle) : Math.PI;
  const angleDelta = shortestAngleDelta(desiredHeadingAngle, headingAngle);
  const desiredTurnVelocity = clamp(angleDelta * 10, -phaseProfile.maxTurnRate, phaseProfile.maxTurnRate);
  boss.turnVelocity = approachScalar(
    Number(boss.turnVelocity ?? 0),
    desiredTurnVelocity,
    phaseProfile.turnAcceleration * dt,
  );
  const appliedTurn = clamp(
    Number(boss.turnVelocity ?? 0) * dt,
    -Math.abs(angleDelta),
    Math.abs(angleDelta),
  );
  boss.headingAngle = Math.atan2(
    Math.sin(headingAngle + appliedTurn),
    Math.cos(headingAngle + appliedTurn),
  );

  const forwardX = Math.cos(boss.headingAngle);
  const forwardY = Math.sin(boss.headingAngle);
  const currentVelocityX = Number(boss.velocityX ?? 0);
  const currentVelocityY = Number(boss.velocityY ?? 0);
  const currentForwardSpeed = currentVelocityX * forwardX + currentVelocityY * forwardY;
  const targetForwardSpeed = throttle * phaseProfile.moveSpeed;
  const responseRate = throttle > 0.001 ? phaseProfile.moveAcceleration : phaseProfile.moveDeceleration;
  const nextForwardSpeed = approachScalar(
    currentForwardSpeed,
    targetForwardSpeed,
    responseRate * dt,
  );
  const lateralX = currentVelocityX - forwardX * currentForwardSpeed;
  const lateralY = currentVelocityY - forwardY * currentForwardSpeed;
  const lateralDamping = clamp(phaseProfile.lateralDamping * dt, 0, 1);

  boss.velocityX = forwardX * nextForwardSpeed + lateralX * (1 - lateralDamping);
  boss.velocityY = forwardY * nextForwardSpeed + lateralY * (1 - lateralDamping);
  if (throttle <= 0.001 && Math.hypot(boss.velocityX, boss.velocityY) <= 2) {
    boss.velocityX = 0;
    boss.velocityY = 0;
  }

  const velocityLength = Math.hypot(boss.velocityX, boss.velocityY);
  boss.moveX = velocityLength > 0.001 ? boss.velocityX / velocityLength : forwardX;
  boss.moveY = velocityLength > 0.001 ? boss.velocityY / velocityLength : forwardY;
  boss.isMoving = velocityLength > 6;
  boss.speed = phaseProfile.moveSpeed;
  boss.moveSpeed = phaseProfile.moveSpeed;
  boss.moveAcceleration = phaseProfile.moveAcceleration;
  boss.moveDeceleration = phaseProfile.moveDeceleration;
  boss.worldX = previousWorldX + boss.velocityX * dt;
  boss.worldY = previousWorldY + boss.velocityY * dt;
  boss.animationTime = boss.isMoving
    ? Number(boss.animationTime ?? 0) + dt
    : 0;
  boss.previousWorldX = previousWorldX;
  boss.previousWorldY = previousWorldY;
  boss.forwardSpeedRatio = clamp(Math.abs(nextForwardSpeed) / Math.max(1, phaseProfile.moveSpeed), 0, 1.35);
  boss.ramAccelerationStrength = clamp(
    Math.abs(nextForwardSpeed - currentForwardSpeed) / Math.max(1, phaseProfile.moveAcceleration * dt),
    0,
    1.5,
  );
  boss.ramTargetKey = preferredTarget ? getCombatTargetKey(preferredTarget) : "";

  return true;
}

function tickTitanCentipedeRamHitTimers(ramAttack, dt) {
  if (!ramAttack || typeof ramAttack !== "object") {
    return;
  }

  ramAttack.biteTimer = Math.max(0, Number(ramAttack.biteTimer ?? 0) - dt);
  if (!ramAttack.hitTimers || typeof ramAttack.hitTimers !== "object") {
    return;
  }

  Object.keys(ramAttack.hitTimers).forEach((targetKey) => {
    ramAttack.hitTimers[targetKey] = Math.max(0, Number(ramAttack.hitTimers[targetKey] ?? 0) - dt);
    if (ramAttack.hitTimers[targetKey] <= 0) {
      delete ramAttack.hitTimers[targetKey];
    }
  });
}

function titanCentipedeFangBiteHitsTarget(boss, target, scene) {
  const mouthAnchor = resolveTitanCentipedeMouthAnchor(boss, scene);
  const aimPoint = combatTargetAimPoint(target);
  const angleToTarget = Math.atan2(
    aimPoint.y - mouthAnchor.worldY,
    aimPoint.x - mouthAnchor.worldX,
  );
  const angleDelta = Math.abs(shortestAngleDelta(angleToTarget, Number(boss.headingAngle ?? Math.PI)));
  const biteRange = Math.max(scene.tileSize * 1.05, Number(boss.fangOffsetX ?? scene.tileSize * 1.8) * 0.56);
  return (
    combatTargetDistanceFromPoint(target, mouthAnchor.worldX, mouthAnchor.worldY) <= biteRange
    && angleDelta <= 0.58
  );
}

function resolveTitanCentipedeRamDamage(boss, ramAttack, phaseProfile, target, useFangBite = false) {
  const targetKey = getCombatTargetKey(target);
  const previousWorldX = Number(boss.previousWorldX ?? boss.worldX ?? 0);
  const previousWorldY = Number(boss.previousWorldY ?? boss.worldY ?? 0);
  const lockDistance = targetKey === ramAttack.lockedTargetKey
    ? Math.max(0, Number(ramAttack.lockDistanceAtAcquire ?? 0))
    : Math.max(0, combatTargetDistanceFromPoint(target, previousWorldX, previousWorldY));
  const lockDistanceFactor = clamp(lockDistance / Math.max(1, phaseProfile.ramAcquireRange), 0, 1);
  const accelerationRate = clamp(
    Math.max(
      Number(boss.ramAccelerationStrength ?? 0),
      Number(boss.forwardSpeedRatio ?? 0) * 0.9,
    ),
    0,
    1.6,
  );
  const bonusDamage = accelerationRate * phaseProfile.ramWeaponDamageBase * lockDistanceFactor;
  let damage = Math.max(
    phaseProfile.ramBaseDamage,
    Math.round(phaseProfile.ramBaseDamage + bonusDamage),
  );
  if (useFangBite) {
    damage = Math.max(damage, Math.round(damage * phaseProfile.fangBiteMultiplier));
  }
  return damage;
}

function updateTitanCentipedeRamAttack(dt, game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  const scene = game?.scene;
  if (!boss || !scene) {
    return false;
  }

  const phaseProfile = titanCentipedePhaseRuntimeProfile(boss, scene, game?.arena);
  if (!boss.ramAttack || typeof boss.ramAttack !== "object") {
    boss.ramAttack = {
      hitTimers: {},
      lockedTargetKey: "",
      lockDistanceAtAcquire: 0,
      biteTimer: 0,
    };
  }
  const ramAttack = boss.ramAttack;
  tickTitanCentipedeRamHitTimers(ramAttack, dt);

  const lockedTarget = findTitanCentipedeRamTarget(
    game,
    boss,
    phaseProfile,
    Number(boss.headingAngle ?? Math.PI),
  );
  const lockedTargetKey = lockedTarget ? getCombatTargetKey(lockedTarget) : "";
  if (lockedTargetKey !== ramAttack.lockedTargetKey) {
    ramAttack.lockedTargetKey = lockedTargetKey;
    ramAttack.lockDistanceAtAcquire = lockedTarget
      ? Math.max(
          0,
          combatTargetDistanceFromPoint(
            lockedTarget,
            Number(boss.previousWorldX ?? boss.worldX ?? 0),
            Number(boss.previousWorldY ?? boss.worldY ?? 0),
          ),
        )
      : 0;
  }

  const startX = Number(boss.previousWorldX ?? boss.worldX ?? 0);
  const startY = Number(boss.previousWorldY ?? boss.worldY ?? 0);
  const endX = Number(boss.worldX ?? 0);
  const endY = Number(boss.worldY ?? 0);
  if (Math.hypot(endX - startX, endY - startY) <= 0.001) {
    return false;
  }

  const targets = titanCentipedeCombatTargets(game, boss, phaseProfile.aiAcquireRange);
  if (!targets.length) {
    return false;
  }

  targets.forEach((target) => {
    const targetKey = getCombatTargetKey(target);
    if ((ramAttack.hitTimers[targetKey] ?? 0) > 0) {
      return;
    }
    if (!segmentHitsCombatTarget(
      target,
      startX,
      startY,
      endX,
      endY,
      phaseProfile.ramHitRadius,
    )) {
      return;
    }

    const useFangBite = phaseProfile.fangBiteMultiplier > 1
      && titanCentipedeFangBiteHitsTarget(boss, target, scene);
    applyDamageToCombatTarget(
      target,
      resolveTitanCentipedeRamDamage(boss, ramAttack, phaseProfile, target, useFangBite),
      {
        hitFlash: useFangBite ? 0.18 : 0.14,
        damageFloatDuration: 0.48,
        attackMode: useFangBite ? "boss-fang-bite" : "boss-ram",
      },
    );
    if (useFangBite) {
      ramAttack.biteTimer = TITAN_CENTIPEDE_FANG_OPEN_SECONDS;
    }
    ramAttack.hitTimers[targetKey] = phaseProfile.ramHitInterval;
  });

  return true;
}

function bossControlAimAngle(game = state.game, fallbackAngle = Math.PI) {
  const arena = game?.arena;
  if (!arena) {
    return fallbackAngle;
  }

  const centerX = Number(arena.width ?? 0) * 0.5;
  const centerY = Number(arena.height ?? 0) * 0.5;
  const aimX = Number(state.input.mouseX ?? centerX) - centerX;
  const aimY = Number(state.input.mouseY ?? centerY) - centerY;
  if (Math.hypot(aimX, aimY) <= 6) {
    return fallbackAngle;
  }

  return Math.atan2(aimY, aimX);
}

function titanCentipedeRenderRotation(headingAngle = Math.PI) {
  const delta = typeof shortestAngleDelta === "function"
    ? shortestAngleDelta(headingAngle, Math.PI)
    : (headingAngle - Math.PI);
  return Math.PI * 0.5 + delta;
}

function rotateTitanCentipedeOffset(offsetX, offsetY, headingAngle = Math.PI) {
  const delta = typeof shortestAngleDelta === "function"
    ? shortestAngleDelta(headingAngle, Math.PI)
    : (headingAngle - Math.PI);
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return {
    x: offsetX * cos - offsetY * sin,
    y: offsetX * sin + offsetY * cos,
  };
}

function createTitanCentipedeTrailPoints(headWorldX, headWorldY, headingAngle, segmentSpacing, segmentCount) {
  const totalPoints = Math.max(12, Math.ceil(segmentCount) + 8);
  return Array.from({ length: totalPoints }, (_, index) => {
    const offset = rotateTitanCentipedeOffset(segmentSpacing * index, 0, headingAngle);
    return {
      x: headWorldX + offset.x,
      y: headWorldY + offset.y,
    };
  });
}

function syncTitanCentipedeHeading(boss) {
  if (!boss) {
    return;
  }

  const velocityX = Number(boss.velocityX ?? 0);
  const velocityY = Number(boss.velocityY ?? 0);
  const velocityLength = Math.hypot(velocityX, velocityY);
  if (velocityLength > 0.001) {
    boss.headingAngle = Math.atan2(velocityY, velocityX);
    return;
  }

  const moveX = Number(boss.moveX ?? 0);
  const moveY = Number(boss.moveY ?? 0);
  if (Math.hypot(moveX, moveY) > 0.001) {
    boss.headingAngle = Math.atan2(moveY, moveX);
  }
}

function syncTitanCentipedeTrail(boss) {
  if (!boss) {
    return;
  }

  const segmentSpacing = Math.max(8, Number(boss.segmentSpacing ?? 0) || 8);
  const segmentCount = Math.max(1, Number(boss.profile?.body?.segmentCount ?? 1) || 1);
  const maxDistance = segmentSpacing * (segmentCount + 8);
  const headingAngle = Number.isFinite(Number(boss.headingAngle)) ? Number(boss.headingAngle) : Math.PI;
  const headPoint = {
    x: Number(boss.worldX ?? 0),
    y: Number(boss.worldY ?? 0),
  };

  if (!Array.isArray(boss.trailPoints) || !boss.trailPoints.length) {
    boss.trailPoints = createTitanCentipedeTrailPoints(
      headPoint.x,
      headPoint.y,
      headingAngle,
      segmentSpacing,
      segmentCount,
    );
    return;
  }

  const trailPoints = boss.trailPoints.slice();
  const firstPoint = trailPoints[0];
  const headTravelDistance = Math.hypot(headPoint.x - firstPoint.x, headPoint.y - firstPoint.y);
  if (headTravelDistance > 0.01) {
    trailPoints.unshift(headPoint);
  } else {
    trailPoints[0] = headPoint;
  }

  let travelled = 0;
  const trimmedTrail = [trailPoints[0]];
  for (let index = 1; index < trailPoints.length; index += 1) {
    const previousPoint = trailPoints[index - 1];
    const point = trailPoints[index];
    travelled += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    trimmedTrail.push(point);
    if (travelled >= maxDistance) {
      break;
    }
  }

  while (travelled < maxDistance) {
    const lastPoint = trimmedTrail[trimmedTrail.length - 1];
    const extension = rotateTitanCentipedeOffset(segmentSpacing, 0, headingAngle);
    const nextPoint = {
      x: lastPoint.x + extension.x,
      y: lastPoint.y + extension.y,
    };
    trimmedTrail.push(nextPoint);
    travelled += segmentSpacing;
  }

  boss.trailPoints = trimmedTrail;
}

function sampleTitanCentipedeTrailPose(boss, distance = 0) {
  if (!boss) {
    return {
      x: 0,
      y: 0,
      headingAngle: Math.PI,
    };
  }

  const trailPoints = Array.isArray(boss.trailPoints) ? boss.trailPoints : [];
  if (!trailPoints.length) {
    return {
      x: Number(boss.worldX ?? 0),
      y: Number(boss.worldY ?? 0),
      headingAngle: Number.isFinite(Number(boss.headingAngle)) ? Number(boss.headingAngle) : Math.PI,
    };
  }

  let remaining = Math.max(0, Number(distance ?? 0) || 0);
  for (let index = 1; index < trailPoints.length; index += 1) {
    const previousPoint = trailPoints[index - 1];
    const point = trailPoints[index];
    const segmentLength = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    if (remaining <= segmentLength || index === trailPoints.length - 1) {
      const ratio = segmentLength > 0 ? clamp(remaining / segmentLength, 0, 1) : 0;
      const headingAngle = segmentLength > 0
        ? Math.atan2(previousPoint.y - point.y, previousPoint.x - point.x)
        : (Number.isFinite(Number(boss.headingAngle)) ? Number(boss.headingAngle) : Math.PI);
      return {
        x: previousPoint.x + (point.x - previousPoint.x) * ratio,
        y: previousPoint.y + (point.y - previousPoint.y) * ratio,
        headingAngle,
      };
    }
    remaining -= segmentLength;
  }

  const lastPoint = trailPoints[trailPoints.length - 1];
  return {
    x: lastPoint.x,
    y: lastPoint.y,
    headingAngle: Number.isFinite(Number(boss.headingAngle)) ? Number(boss.headingAngle) : Math.PI,
  };
}

function titanCentipedeBossBeamProfile(boss, scene, arena = state.game?.arena) {
  const phaseProfile = titanCentipedePhaseRuntimeProfile(boss, scene, arena);
  const phaseIndex = titanCentipedeResolvedPhaseIndex(boss);
  const arenaSpan = Math.max(
    Number(arena?.width ?? 0),
    Number(arena?.height ?? 0),
    scene?.tileSize * 14,
  );
  const drawPartSize = Math.max(
    scene.tileSize * 1.8,
    Number(boss?.drawPartSize ?? scene.tileSize * 2.7) || scene.tileSize * 2.7,
  );
  return {
    chargeDuration: phaseIndex === 2
      ? TITAN_CENTIPEDE_PHASE_THREE_BEAM_CHARGE_SECONDS
      : TITAN_CENTIPEDE_BEAM_CHARGE_SECONDS,
    hitInterval: TITAN_CENTIPEDE_BEAM_HIT_INTERVAL_SECONDS,
    damage: Math.max(1, Math.round(drawPartSize * 1.6)),
    range: Math.max(scene.tileSize * 14, arenaSpan * 1.12),
    width: Math.max(scene.tileSize * 0.34, drawPartSize * 0.32) * phaseProfile.beamWidthMultiplier,
    visualCoreWidth: Math.max(scene.tileSize * 0.16, drawPartSize * 0.11) * phaseProfile.beamWidthMultiplier,
    visualWhiteHotWidth: Math.max(scene.tileSize * 0.08, drawPartSize * 0.05) * phaseProfile.beamWidthMultiplier,
    visualGlowWidth: Math.max(scene.tileSize * 0.54, drawPartSize * 0.34) * phaseProfile.beamWidthMultiplier,
    endpointRadius: Math.max(scene.tileSize * 0.52, drawPartSize * 0.36) * Math.sqrt(phaseProfile.beamWidthMultiplier),
    shimmerSpeed: 0.022,
    particleCount: 28,
    particleSpread: Math.max(scene.tileSize * 0.18, drawPartSize * 0.16) * Math.sqrt(phaseProfile.beamWidthMultiplier),
    particleSize: Math.max(scene.tileSize * 0.06, drawPartSize * 0.05),
    particleShakeAmplitude: Math.max(scene.tileSize * 0.08, drawPartSize * 0.1),
    particleShakeSpeed: 0.041,
    particleFlowSpeed: 0.00122,
    chargeParticleCount: 32,
    chargeShellRadius: Math.max(scene.tileSize * 1.2, drawPartSize * 0.72),
    chargeOrbRadius: Math.max(scene.tileSize * 0.54, drawPartSize * 0.34),
    chargeParticleJitter: Math.max(scene.tileSize * 0.12, drawPartSize * 0.16),
  };
}

function titanCentipedeFangOpenProgress(boss) {
  const beamAttack = boss?.beamAttack;
  const phaseIndex = titanCentipedeResolvedPhaseIndex(boss);
  const fangOpenSeconds = phaseIndex === 2
    ? TITAN_CENTIPEDE_PHASE_THREE_FANG_OPEN_SECONDS
    : TITAN_CENTIPEDE_FANG_OPEN_SECONDS;
  const beamOpenProgress = beamAttack?.active
    ? clamp(
        Number(beamAttack.age ?? 0) / fangOpenSeconds,
        0,
        1,
      )
    : 0;
  const biteOpenProgress = clamp(
    Number(boss?.ramAttack?.biteTimer ?? 0) / fangOpenSeconds,
    0,
    1,
  );
  return Math.max(beamOpenProgress, biteOpenProgress);
}

function titanCentipedeFangLayout(scene) {
  return {
    offsetX: scene.tileSize * TITAN_CENTIPEDE_FANG_OFFSET_X_SCALE,
    offsetY: scene.tileSize * TITAN_CENTIPEDE_FANG_OFFSET_Y_SCALE,
    size: scene.tileSize * TITAN_CENTIPEDE_FANG_SIZE_SCALE,
  };
}

function resolveTitanCentipedeHeadPose(boss) {
  const trailHeadPose = sampleTitanCentipedeTrailPose(boss, 0);
  return {
    x: Number.isFinite(Number(boss?.worldX)) ? Number(boss.worldX) : trailHeadPose.x,
    y: Number.isFinite(Number(boss?.worldY)) ? Number(boss.worldY) : trailHeadPose.y,
    headingAngle: Number.isFinite(Number(boss?.headingAngle))
      ? Number(boss.headingAngle)
      : trailHeadPose.headingAngle,
  };
}

function resolveTitanCentipedeMouthAnchor(boss, scene, cameraLeft = 0, cameraTop = 0) {
  const headPose = resolveTitanCentipedeHeadPose(boss);
  const fangLayout = titanCentipedeFangLayout(scene);
  const mouthOffset = rotateTitanCentipedeOffset(
    -Math.max(scene.tileSize * 1.4, fangLayout.offsetX * 0.88),
    0,
    headPose.headingAngle,
  );
  const mouthWorldX = headPose.x + mouthOffset.x;
  const mouthWorldY = headPose.y + mouthOffset.y;
  return {
    headPose,
    worldX: mouthWorldX,
    worldY: mouthWorldY,
    screenX: mouthWorldX - cameraLeft,
    screenY: mouthWorldY - cameraTop,
  };
}

function updateBossSummonTrigger(game = state.game) {
  if (!game?.player || !game?.scene || !game?.bossSummonTrigger || game.bossSummonTrigger.activated) {
    return false;
  }

  const trigger = game.bossSummonTrigger;
  const playerRadius = Math.max(8, Number(game.player.radius ?? 0) || game.scene.tileSize * 0.2);
  const distanceToTrigger = Math.hypot(
    Number(game.player.worldX ?? 0) - Number(trigger.originX ?? 0),
    Number(game.player.worldY ?? 0) - Number(trigger.originY ?? 0),
  );
  if (distanceToTrigger > Number(trigger.radius ?? 0) + playerRadius) {
    return false;
  }

  trigger.activated = true;
  trigger.activatedAtElapsed = Math.max(0, Number(game.elapsed ?? 0));
  if (game.bossSummonTest) {
    game.bossSummonTest.armed = true;
    game.bossSummonTest.summonRequested = true;
    game.bossSummonTest.triggeredAtElapsed = trigger.activatedAtElapsed;
    game.bossSummonTest.triggerCount = Math.max(0, Number(game.bossSummonTest.triggerCount ?? 0)) + 1;
  }
  setHudSaveMessage("Boss summon test armed");
  return true;
}

function createTitanCentipedeBossEntity(game = state.game) {
  const profile = game?.bossSummonTest?.pendingBossProfile;
  const scene = game?.scene;
  if (!profile || !scene) {
    return null;
  }

  const headWorldX = Number(game?.bossSummonTrigger?.originX ?? game?.player?.worldX ?? 0);
  const headWorldY = Number(game?.bossSummonTrigger?.originY ?? game?.player?.worldY ?? 0) - scene.tileSize * 0.24;
  const headingAngle = Math.PI;
  const segmentSpacing = scene.tileSize * 0.94;
  const fangLayout = titanCentipedeFangLayout(scene);
  return {
    id: `${profile.id}-${Date.now().toString(36)}`,
    bossId: profile.id,
    label: profile.label,
    profile,
    worldX: headWorldX,
    worldY: headWorldY,
    spawnedAtElapsed: Math.max(0, Number(game?.elapsed ?? 0)),
    phaseIndex: 0,
    drawPartSize: scene.tileSize * 2.7,
    segmentSpacing,
    waveAmplitude: scene.tileSize * 0.28,
    waveStride: 0.34,
    waveSpeed: 0.0044,
    headingAngle,
    hornBaseOffsetX: scene.tileSize * 1.08,
    hornBaseOffsetY: -scene.tileSize * 0.16,
    hornBasePixelNudgeY: 6,
    hornBaseAssetOffsetXPx: 3,
    hornBaseScale: 1,
    fangOffsetX: fangLayout.offsetX,
    fangOffsetY: fangLayout.offsetY,
    fangSize: fangLayout.size,
    baseMoveSpeed: scene.tileSize * 4.6,
    baseMoveAcceleration: scene.tileSize * 12,
    baseMoveDeceleration: scene.tileSize * 14,
    moveSpeed: scene.tileSize * 4.6,
    moveAcceleration: scene.tileSize * 12,
    moveDeceleration: scene.tileSize * 14,
    velocityX: 0,
    velocityY: 0,
    moveX: -1,
    moveY: 0,
    isMoving: false,
    animationTime: 0,
    turnVelocity: 0,
    forwardSpeedRatio: 0,
    ramAccelerationStrength: 0,
    maxHealth: 12000,
    health: 12000,
    beamAttack: null,
    phaseTransition: null,
    ramAttack: {
      hitTimers: {},
      lockedTargetKey: "",
      lockDistanceAtAcquire: 0,
    },
    trailPoints: createTitanCentipedeTrailPoints(
      headWorldX,
      headWorldY,
      headingAngle,
      segmentSpacing,
      profile.body?.segmentCount ?? 1,
    ),
  };
}

function updateBossSummonTestFlow(game = state.game) {
  if (!game?.bossSummonTest?.summonRequested) {
    return false;
  }

  if (game.bossSummonTest.activeBoss) {
    game.bossSummonTest.summonRequested = false;
    return false;
  }

  const activeBoss = createTitanCentipedeBossEntity(game);
  if (!activeBoss) {
    return false;
  }

  game.bossSummonTest.activeBoss = activeBoss;
  game.bossSummonTest.summonRequested = false;
  game.bossSummonTest.controlPressCount = 0;
  game.bossSummonTest.controllingBoss = false;
  game.monsterSpawnsPaused = true;
  game.monsterSpawnProgress = 0;
  if (Array.isArray(game.monsters) && game.monsters.length) {
    game.monsters.length = 0;
  }
  setHudSaveMessage("Titan Centipede summoned");
  return true;
}

function releaseBossControl(game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  const player = game?.player;
  const scene = game?.scene;
  if (!game?.bossSummonTest?.controllingBoss || !boss || !player || !scene) {
    return false;
  }

  const headingAngle = Number.isFinite(Number(boss.headingAngle))
    ? Number(boss.headingAngle)
    : Math.PI;
  const forwardX = Math.cos(headingAngle);
  const forwardY = Math.sin(headingAngle);
  const lateralX = -forwardY;
  const lateralY = forwardX;
  const previousOffsetX = Number(player.worldX ?? 0) - Number(boss.worldX ?? 0);
  const previousOffsetY = Number(player.worldY ?? 0) - Number(boss.worldY ?? 0);
  const sideSign = (previousOffsetX * lateralX + previousOffsetY * lateralY) >= 0 ? 1 : -1;
  const flankDistance = Math.max(
    scene.tileSize * 2.1,
    Number(boss.drawPartSize ?? scene.tileSize * 2.7) * 0.9,
  );
  const retreatDistance = Math.max(
    scene.tileSize * 0.9,
    Number(boss.drawPartSize ?? scene.tileSize * 2.7) * 0.34,
  );

  player.worldX = Number(boss.worldX ?? 0) - forwardX * retreatDistance + lateralX * sideSign * flankDistance;
  player.worldY = Number(boss.worldY ?? 0) - forwardY * retreatDistance + lateralY * sideSign * flankDistance;
  player.velocityX = 0;
  player.velocityY = 0;
  player.isMoving = false;
  player.animationTime = 0;
  player.facing = headingAngle;
  player.moveX = forwardX;
  player.moveY = forwardY;

  boss.velocityX = 0;
  boss.velocityY = 0;
  boss.isMoving = false;
  boss.controlMovementLocked = Boolean(
    state.input.bossBeamHeld
    || boss.beamAttack?.active
    || Number(boss.beamAttack?.chargeElapsed ?? 0) > 0
  );

  game.bossSummonTest.controllingBoss = false;
  game.bossSummonTest.controlPressCount = 0;
  state.input.pressed.clear();
  setHudSaveMessage("Boss control released");
  return true;
}

function handleBossControlInteract(game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  const player = game?.player;
  if (!boss || !player || !game?.scene) {
    return false;
  }

  if (game.bossSummonTest.controllingBoss) {
    return releaseBossControl(game);
  }

  const interactionRadius = bossControlInteractionRadius(game);
  const distanceToBoss = Math.hypot(
    Number(player.worldX ?? 0) - Number(boss.worldX ?? 0),
    Number(player.worldY ?? 0) - Number(boss.worldY ?? 0),
  );
  if (distanceToBoss > interactionRadius) {
    return false;
  }

  const nextCount = Math.min(
    Number(game.bossSummonTest.controlPressTarget ?? 3),
    Math.max(0, Number(game.bossSummonTest.controlPressCount ?? 0)) + 1,
  );
  game.bossSummonTest.controlPressCount = nextCount;

  if (nextCount >= Number(game.bossSummonTest.controlPressTarget ?? 3)) {
    game.bossSummonTest.controllingBoss = true;
    boss.velocityX = 0;
    boss.velocityY = 0;
    boss.moveX = -1;
    boss.moveY = 0;
    boss.isMoving = false;
    player.velocityX = 0;
    player.velocityY = 0;
    player.isMoving = false;
    player.swing = null;
    player.beam = null;
    player.beamScreenShake = null;
    player.spin = null;
    player.titanGrowth = null;
    state.input.bossBeamHeld = false;
    state.input.attackHeld = false;
    state.input.attackHoldTime = 0;
    state.input.attackHoldStartedAt = 0;
    state.input.pendingBeamTap = false;
    state.input.pendingTitanTap = false;
    boss.beamAttack = null;
    player.beamScreenShake = null;
    setHudSaveMessage("Boss control engaged");
    return true;
  }

  setHudSaveMessage(`Boss control ${nextCount}/${Number(game.bossSummonTest.controlPressTarget ?? 3)}`);
  return true;
}

function updateTitanCentipedeBossBeam(dt, game = state.game) {
  const boss = game?.bossSummonTest?.activeBoss;
  const player = game?.player;
  const scene = game?.scene;
  const controllingBoss = Boolean(game?.bossSummonTest?.controllingBoss && boss);
  const sustainReleasedBeam = Boolean(!controllingBoss && state.input.bossBeamHeld && boss?.beamAttack);
  const clearBossBeam = () => {
    if (boss?.beamAttack) {
      boss.beamAttack.active = false;
      boss.beamAttack.chargeElapsed = 0;
      boss.beamAttack.age = 0;
      boss.beamAttack.currentLine = null;
      boss.beamAttack.previousLine = null;
      boss.beamAttack.hitTimers = {};
    }
    clearTitanCentipedeBeamClash(game);
    if (player?.beamScreenShake?.source === TITAN_CENTIPEDE_BOSS_ID) {
      player.beamScreenShake = null;
    }
  };

  if (!boss || !player || !scene || hasOpenHudOverlay() || !state.input.bossBeamHeld || (!controllingBoss && !sustainReleasedBeam)) {
    clearBossBeam();
    return;
  }

  const profile = titanCentipedeBossBeamProfile(boss, scene, game?.arena);
  if (!boss.beamAttack) {
    boss.beamAttack = {
      active: false,
      chargeElapsed: 0,
      age: 0,
      angle: Number(boss.headingAngle ?? Math.PI),
      phaseOffset: Math.random() * Math.PI * 2,
      hitTimers: {},
      previousLine: null,
      currentLine: null,
    };
  }

  const beamAttack = boss.beamAttack;
  const aimAngle = controllingBoss
    ? bossControlAimAngle(game, Number(beamAttack.angle ?? boss.headingAngle ?? Math.PI))
    : Number(beamAttack.angle ?? boss.headingAngle ?? Math.PI);
  const previousLine = beamAttack.currentLine ? { ...beamAttack.currentLine } : null;
  boss.headingAngle = aimAngle;
  beamAttack.angle = aimAngle;
  beamAttack.chargeElapsed = Math.max(0, Number(beamAttack.chargeElapsed ?? 0) + dt);
  beamAttack.phaseOffset = Number.isFinite(Number(beamAttack.phaseOffset))
    ? Number(beamAttack.phaseOffset)
    : Math.random() * Math.PI * 2;
  beamAttack.chargeDuration = profile.chargeDuration;
  beamAttack.hitInterval = profile.hitInterval;
  beamAttack.damage = profile.damage;
  beamAttack.range = profile.range;
  beamAttack.width = profile.width;
  beamAttack.visualCoreWidth = profile.visualCoreWidth;
  beamAttack.visualWhiteHotWidth = profile.visualWhiteHotWidth;
  beamAttack.visualGlowWidth = profile.visualGlowWidth;
  beamAttack.endpointRadius = profile.endpointRadius;
  beamAttack.shimmerSpeed = profile.shimmerSpeed;
  beamAttack.particleCount = profile.particleCount;
  beamAttack.particleSpread = profile.particleSpread;
  beamAttack.particleSize = profile.particleSize;
  beamAttack.particleShakeAmplitude = profile.particleShakeAmplitude;
  beamAttack.particleShakeSpeed = profile.particleShakeSpeed;
  beamAttack.particleFlowSpeed = profile.particleFlowSpeed;
  beamAttack.chargeParticleCount = profile.chargeParticleCount;
  beamAttack.chargeShellRadius = profile.chargeShellRadius;
  beamAttack.chargeOrbRadius = profile.chargeOrbRadius;
  beamAttack.chargeParticleJitter = profile.chargeParticleJitter;

  if (beamAttack.chargeElapsed < profile.chargeDuration) {
    const chargeProgress = clamp(beamAttack.chargeElapsed / Math.max(0.001, profile.chargeDuration), 0, 1);
    beamAttack.active = false;
    beamAttack.age = 0;
    beamAttack.currentLine = null;
    beamAttack.previousLine = null;
    player.beamScreenShake = {
      source: TITAN_CENTIPEDE_BOSS_ID,
      amplitude: clamp(2.2 + chargeProgress * 4.8, 2.2, 7.2),
      phaseSpeed: 0.33,
      verticalScale: 0.64,
    };
    return;
  }

  const mouthAnchor = resolveTitanCentipedeMouthAnchor(boss, scene);
  const directionX = Math.cos(aimAngle);
  const directionY = Math.sin(aimAngle);
  beamAttack.active = true;
  beamAttack.age = Math.max(0, Number(beamAttack.age ?? 0) + dt);
  beamAttack.previousLine = previousLine;
  beamAttack.currentLine = createBeamLineFromWorldPoints(
    mouthAnchor.worldX,
    mouthAnchor.worldY,
    directionX,
    directionY,
    profile.range,
    0,
    0,
  );
  updateTitanCentipedeBeamClash(dt, game);

  if (typeof tickBeamHitTimers === "function") {
    tickBeamHitTimers(beamAttack, dt);
  }

  const hitPadding = Math.max(scene.tileSize * 0.12, Number(profile.width ?? 0) * 0.52);
  const hitCurrentLines = resolveTitanCentipedeBossClashLines(beamAttack.currentLine, game);
  const hitPreviousLines = beamAttack.previousLine
    ? resolveTitanCentipedeBossClashLines(beamAttack.previousLine, game)
    : [];
  getCombatTargets(game).forEach((target) => {
    if (!isCombatTargetAlive(target)) {
      return;
    }

    const targetKey = getCombatTargetKey(target);
    const timer = beamAttack.hitTimers?.[targetKey] ?? 0;
    if (timer > 0) {
      return;
    }

    const hitAnyBeamLine = hitCurrentLines.some((line, index) => {
      const previousLine = hitPreviousLines[index] ?? null;
      return beamSweepHitsCombatTarget(target, line, previousLine, hitPadding);
    });
    if (!hitAnyBeamLine) {
      return;
    }

    applyDamageToCombatTarget(target, beamAttack.damage, {
      hitFlash: 0.18,
      damageFloatDuration: 0.5,
      attackMode: "beam",
    });
    beamAttack.hitTimers[targetKey] = beamAttack.hitInterval;
  });

  player.beamScreenShake = {
    source: TITAN_CENTIPEDE_BOSS_ID,
    amplitude: clamp(4 + beamAttack.age * 1.5, 4, 8.2),
    phaseSpeed: 0.31,
    verticalScale: 0.68,
  };
}

function drawTitanCentipedeBossBeamCharge(boss, scene, mouthAnchor) {
  const beamAttack = boss?.beamAttack;
  if (!beamAttack || beamAttack.active) {
    return;
  }

  const progress = clamp(
    Number(beamAttack.chargeElapsed ?? 0)
      / Math.max(0.001, Number(beamAttack.chargeDuration ?? TITAN_CENTIPEDE_BEAM_CHARGE_SECONDS)),
    0,
    1,
  );
  if (progress <= 0) {
    return;
  }

  const pull = Math.pow(progress, 1.85);
  const shellRadius = Number(beamAttack.chargeShellRadius ?? scene.tileSize * 1.8) * (1.06 - pull * 0.34);
  const orbRadius = Number(beamAttack.chargeOrbRadius ?? scene.tileSize) * (0.28 + progress * 0.96);
  const particleJitter = Number(beamAttack.chargeParticleJitter ?? scene.tileSize * 0.2) * (1.08 - progress * 0.42);
  const chargeParticleCount = Math.max(8, Math.round(Number(beamAttack.chargeParticleCount ?? 28) || 28));
  const highGraphics = typeof beamUsesHighGraphicsQuality === "function" ? beamUsesHighGraphicsQuality() : false;
  const chargeColors = [
    { mid: "rgba(255, 94, 94, %ALPHA%)", edge: "rgba(255, 52, 72, 0)" },
    { mid: "rgba(104, 208, 255, %ALPHA%)", edge: "rgba(54, 118, 255, 0)" },
    { mid: "rgba(255, 218, 126, %ALPHA%)", edge: "rgba(255, 172, 76, 0)" },
  ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let index = 0; index < chargeParticleCount; index += 1) {
    const seed = index * 1.417 + Number(beamAttack.angle ?? 0) * 0.73;
    const color = chargeColors[index % chargeColors.length];
    const spinAngle = state.time * 0.0036 + seed * 2.4;
    const sourceRadius = shellRadius * (0.72 + (Math.sin(seed * 1.91) * 0.5 + 0.5) * 0.42);
    const sourceX = mouthAnchor.screenX
      + Math.cos(spinAngle) * sourceRadius
      + Math.cos(state.time * 0.01 + seed * 4.2) * particleJitter * 0.28;
    const sourceY = mouthAnchor.screenY
      + Math.sin(spinAngle * 1.1) * sourceRadius * 0.76
      + Math.sin(state.time * 0.012 + seed * 3.1) * particleJitter * 0.24;
    const swirlAngle = state.time * 0.019 + seed * 5.1;
    const targetOrbitRadius = orbRadius * (1 - pull) * (0.14 + (index % 4) * 0.05);
    const targetX = mouthAnchor.screenX + Math.cos(swirlAngle) * targetOrbitRadius;
    const targetY = mouthAnchor.screenY + Math.sin(swirlAngle * 1.16) * targetOrbitRadius;
    const drawX = sourceX + (targetX - sourceX) * pull;
    const drawY = sourceY + (targetY - sourceY) * pull;
    const particleRadius = Number(beamAttack.particleSize ?? scene.tileSize * 0.08)
      * (0.48 + (Math.sin(swirlAngle * 1.7) * 0.5 + 0.5) * 0.92);
    const alpha = 0.18 + progress * 0.24 + (Math.sin(swirlAngle * 1.13) * 0.5 + 0.5) * 0.2;
    const particleGlow = ctx.createRadialGradient(
      drawX,
      drawY,
      particleRadius * 0.1,
      drawX,
      drawY,
      particleRadius,
    );
    particleGlow.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, alpha * 1.7)})`);
    particleGlow.addColorStop(0.46, color.mid.replace("%ALPHA%", String(Math.min(1, alpha))));
    particleGlow.addColorStop(1, color.edge);
    ctx.fillStyle = particleGlow;
    ctx.beginPath();
    ctx.arc(drawX, drawY, particleRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  const orbLayers = [
    { radius: orbRadius * 1.8, stops: [[0, `rgba(255, 110, 110, ${0.16 + progress * 0.16})`], [1, "rgba(255, 86, 86, 0)"]] },
    { radius: orbRadius * 1.48, stops: [[0, `rgba(116, 222, 255, ${0.22 + progress * 0.18})`], [1, "rgba(58, 126, 255, 0)"]] },
    { radius: orbRadius * 1.22, stops: [[0, `rgba(255, 226, 142, ${0.24 + progress * 0.2})`], [1, "rgba(255, 176, 74, 0)"]] },
  ];

  orbLayers.forEach((layer) => {
    const glowFill = ctx.createRadialGradient(
      mouthAnchor.screenX,
      mouthAnchor.screenY,
      orbRadius * 0.06,
      mouthAnchor.screenX,
      mouthAnchor.screenY,
      layer.radius,
    );
    layer.stops.forEach(([stop, color]) => {
      glowFill.addColorStop(stop, color);
    });
    ctx.fillStyle = glowFill;
    ctx.beginPath();
    ctx.arc(mouthAnchor.screenX, mouthAnchor.screenY, layer.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const chargeCoreFill = ctx.createRadialGradient(
    mouthAnchor.screenX,
    mouthAnchor.screenY,
    orbRadius * 0.04,
    mouthAnchor.screenX,
    mouthAnchor.screenY,
    orbRadius,
  );
  chargeCoreFill.addColorStop(0, "rgba(255, 255, 255, 1)");
  chargeCoreFill.addColorStop(0.24, `rgba(255, 244, 244, ${0.94 + progress * 0.04})`);
  chargeCoreFill.addColorStop(0.48, `rgba(214, 244, 255, ${0.62 + progress * 0.16})`);
  chargeCoreFill.addColorStop(0.76, `rgba(255, 238, 186, ${0.42 + progress * 0.18})`);
  chargeCoreFill.addColorStop(1, "rgba(255, 210, 124, 0)");
  ctx.fillStyle = chargeCoreFill;
  ctx.beginPath();
  ctx.arc(mouthAnchor.screenX, mouthAnchor.screenY, orbRadius, 0, Math.PI * 2);
  ctx.fill();

  if (progress > 0.62) {
    const ringRadius = orbRadius * (1.18 + Math.sin(state.time * 0.02) * 0.07);
    ctx.lineWidth = Math.max(1, Number(beamAttack.visualWhiteHotWidth ?? scene.tileSize * 0.12) * 0.36);
    ctx.strokeStyle = `rgba(255, 236, 186, ${0.18 + (progress - 0.62) * 1.4})`;
    ctx.beginPath();
    ctx.arc(mouthAnchor.screenX, mouthAnchor.screenY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (highGraphics && typeof drawBeamHighEndpointCorona === "function") {
    drawBeamHighEndpointCorona(
      mouthAnchor.screenX,
      mouthAnchor.screenY,
      Math.cos(Number(beamAttack.angle ?? 0)),
      Math.sin(Number(beamAttack.angle ?? 0)),
      orbRadius * 0.92,
      0.74 + progress * 0.2,
    );
  }

  ctx.restore();
}

function createTitanCentipedeBeamVisualLine(beamLine, startInset = 0) {
  if (!beamLine) {
    return beamLine;
  }

  const safeLength = Math.max(0, Number(beamLine.length ?? 0) || 0);
  const safeInset = clamp(Number(startInset ?? 0) || 0, 0, Math.max(0, safeLength - 1));
  if (safeInset <= 0 || safeLength <= 0.001) {
    return beamLine;
  }

  const startProgress = clamp(safeInset / safeLength, 0, 0.98);
  if (typeof createBeamScreenSegmentLine === "function") {
    return createBeamScreenSegmentLine(beamLine, startProgress, 1);
  }

  const startWorldX = Number(beamLine.startX ?? 0) + Number(beamLine.directionX ?? 0) * safeInset;
  const startWorldY = Number(beamLine.startY ?? 0) + Number(beamLine.directionY ?? 0) * safeInset;
  const startScreenX = Number(beamLine.startScreenX ?? 0) + Number(beamLine.directionX ?? 0) * safeInset;
  const startScreenY = Number(beamLine.startScreenY ?? 0) + Number(beamLine.directionY ?? 0) * safeInset;
  return {
    ...beamLine,
    startX: startWorldX,
    startY: startWorldY,
    startScreenX,
    startScreenY,
    screenDx: Number(beamLine.endScreenX ?? 0) - startScreenX,
    screenDy: Number(beamLine.endScreenY ?? 0) - startScreenY,
    length: Math.hypot(
      Number(beamLine.endScreenX ?? 0) - startScreenX,
      Number(beamLine.endScreenY ?? 0) - startScreenY,
    ),
  };
}

function drawTitanCentipedeBeamOriginTriangle(startX, startY, endX, endY, halfWidth, style, alpha = 1) {
  const dx = Number(endX ?? 0) - Number(startX ?? 0);
  const dy = Number(endY ?? 0) - Number(startY ?? 0);
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) {
    return;
  }

  const safeHalfWidth = Math.max(0.5, Number(halfWidth ?? 0) || 0.5);
  const normalX = -dy / length;
  const normalY = dx / length;
  const curvePull = safeHalfWidth * 0.34;
  const controlPointX = Number(startX ?? 0) + dx * 0.58;
  const controlPointY = Number(startY ?? 0) + dy * 0.58;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(
    controlPointX + normalX * curvePull,
    controlPointY + normalY * curvePull,
    endX + normalX * safeHalfWidth,
    endY + normalY * safeHalfWidth,
  );
  ctx.lineTo(endX - normalX * safeHalfWidth, endY - normalY * safeHalfWidth);
  ctx.quadraticCurveTo(
    controlPointX - normalX * curvePull,
    controlPointY - normalY * curvePull,
    startX,
    startY,
  );
  ctx.fill();
  ctx.restore();
}

function drawTitanCentipedeBeamScreenPath(beamLine, width, style, alpha = 1, lineCap = "round") {
  if (!beamLine || Number(width ?? 0) <= 0) {
    return;
  }

  if (typeof traceBeamVisualPath !== "function") {
    drawBeamScreenPath(beamLine, width, style, alpha);
    return;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = lineCap;
  ctx.lineJoin = lineCap === "butt" ? "miter" : "round";
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  traceBeamVisualPath(beamLine);
  ctx.stroke();
  ctx.restore();
}

function drawTitanCentipedeBeamTransitionBlend(beamLine, beamBodyLine, scene, glowWidth, coreWidth, whiteHotWidth) {
  if (!beamLine || !beamBodyLine || Number(beamBodyLine.length ?? 0) <= 0) {
    return;
  }

  const blendBackLength = clamp(
    Math.max(scene.tileSize * 0.2, coreWidth * 1.36),
    Math.max(scene.tileSize * 0.16, 8),
    Math.max(scene.tileSize * 0.7, beamLine.length * 0.028),
  );
  const blendForwardLength = clamp(
    Math.max(scene.tileSize * 0.3, coreWidth * 1.78),
    Math.max(scene.tileSize * 0.22, 12),
    Math.max(scene.tileSize * 1.02, beamBodyLine.length * 0.05),
  );
  const transitionStartScreenX = beamBodyLine.startScreenX - beamLine.directionX * blendBackLength;
  const transitionStartScreenY = beamBodyLine.startScreenY - beamLine.directionY * blendBackLength;
  const transitionEndScreenX = beamBodyLine.startScreenX + beamLine.directionX * blendForwardLength;
  const transitionEndScreenY = beamBodyLine.startScreenY + beamLine.directionY * blendForwardLength;
  const transitionLine = {
    ...beamLine,
    startScreenX: transitionStartScreenX,
    startScreenY: transitionStartScreenY,
    endScreenX: transitionEndScreenX,
    endScreenY: transitionEndScreenY,
    screenDx: transitionEndScreenX - transitionStartScreenX,
    screenDy: transitionEndScreenY - transitionStartScreenY,
    length: Math.hypot(
      transitionEndScreenX - transitionStartScreenX,
      transitionEndScreenY - transitionStartScreenY,
    ),
  };
  const shellGradient = ctx.createLinearGradient(
    transitionStartScreenX,
    transitionStartScreenY,
    transitionEndScreenX,
    transitionEndScreenY,
  );
  shellGradient.addColorStop(0, "rgba(255, 228, 208, 0)");
  shellGradient.addColorStop(0.34, "rgba(255, 132, 118, 0.08)");
  shellGradient.addColorStop(0.72, "rgba(112, 212, 255, 0.24)");
  shellGradient.addColorStop(1, "rgba(255, 230, 164, 0.3)");
  const coreGradient = ctx.createLinearGradient(
    transitionStartScreenX,
    transitionStartScreenY,
    transitionEndScreenX,
    transitionEndScreenY,
  );
  coreGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  coreGradient.addColorStop(0.28, "rgba(255, 246, 238, 0.24)");
  coreGradient.addColorStop(0.68, "rgba(255, 255, 255, 0.88)");
  coreGradient.addColorStop(1, "rgba(255, 255, 255, 1)");
  drawTitanCentipedeBeamScreenPath(transitionLine, glowWidth * 1.12, shellGradient, 0.42, "round");
  drawTitanCentipedeBeamScreenPath(transitionLine, coreWidth * 1.3, coreGradient, 0.96, "round");
  drawTitanCentipedeBeamScreenPath(
    transitionLine,
    Math.max(1, whiteHotWidth * 0.78),
    "rgba(255, 255, 255, 0.94)",
    0.9,
    "round",
  );
}

function createTitanCentipedeOffsetBeamScreenLine(beamLine, offset) {
  if (!beamLine) {
    return null;
  }

  const normalX = -Number(beamLine.directionY ?? 0);
  const normalY = Number(beamLine.directionX ?? 0);
  const safeOffset = Number(offset ?? 0) || 0;
  return {
    ...beamLine,
    startScreenX: Number(beamLine.startScreenX ?? 0) + normalX * safeOffset,
    startScreenY: Number(beamLine.startScreenY ?? 0) + normalY * safeOffset,
    endScreenX: Number(beamLine.endScreenX ?? 0) + normalX * safeOffset,
    endScreenY: Number(beamLine.endScreenY ?? 0) + normalY * safeOffset,
  };
}

function drawTitanCentipedeBeamEdgeRails(beamBodyLine, railOffset, railWidth, style, alpha = 1) {
  if (!beamBodyLine || Number(railOffset ?? 0) <= 0 || Number(railWidth ?? 0) <= 0) {
    return;
  }

  const upperRail = createTitanCentipedeOffsetBeamScreenLine(beamBodyLine, railOffset);
  const lowerRail = createTitanCentipedeOffsetBeamScreenLine(beamBodyLine, -railOffset);
  drawTitanCentipedeBeamScreenPath(upperRail, railWidth, style, alpha, "round");
  drawTitanCentipedeBeamScreenPath(lowerRail, railWidth, style, alpha, "round");
}

function drawTitanCentipedeBossBeamHeadLightOverlay(
  beamVisual,
  headScreenX,
  headScreenY,
  headDrawWidth,
  headDrawHeight,
) {
  if (!beamVisual?.beamLine || !beamVisual.useOriginTriangle) {
    return;
  }

  const beamLine = beamVisual.beamLine;
  const focusBlend = 0.42;
  const focusX = headScreenX + (beamLine.startScreenX - headScreenX) * focusBlend;
  const focusY = headScreenY + (beamLine.startScreenY - headScreenY) * focusBlend;
  const beamAngle = Math.atan2(beamLine.directionY, beamLine.directionX);
  const minorRadius = Math.max(headDrawHeight * 0.54, beamVisual.coreWidth * 1.42);
  const majorRadius = Math.max(headDrawWidth * 0.82, beamVisual.coreWidth * 2.8);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.44;
  ctx.translate(focusX, focusY);
  ctx.rotate(beamAngle);
  ctx.scale(Math.max(1.02, majorRadius / Math.max(1, minorRadius)), 1);
  const headGlow = ctx.createRadialGradient(0, 0, minorRadius * 0.08, 0, 0, minorRadius);
  headGlow.addColorStop(0, "rgba(255, 255, 255, 0.96)");
  headGlow.addColorStop(0.18, "rgba(255, 242, 228, 0.84)");
  headGlow.addColorStop(0.44, "rgba(255, 176, 148, 0.48)");
  headGlow.addColorStop(0.68, "rgba(112, 214, 255, 0.24)");
  headGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = headGlow;
  ctx.beginPath();
  ctx.arc(0, 0, minorRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const muzzleGlowRadius = Math.max(headDrawHeight * 0.18, beamVisual.whiteHotWidth * 1.6);
  const muzzleGlow = ctx.createRadialGradient(
    beamLine.startScreenX,
    beamLine.startScreenY,
    muzzleGlowRadius * 0.12,
    beamLine.startScreenX,
    beamLine.startScreenY,
    muzzleGlowRadius,
  );
  muzzleGlow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  muzzleGlow.addColorStop(0.28, "rgba(255, 232, 188, 0.52)");
  muzzleGlow.addColorStop(0.62, "rgba(255, 148, 132, 0.24)");
  muzzleGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = muzzleGlow;
  ctx.beginPath();
  ctx.arc(beamLine.startScreenX, beamLine.startScreenY, muzzleGlowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function titanCentipedeBeamVisualOscillation(beamAttack, useOriginTriangle) {
  const shimmerSpeed = Number(beamAttack?.shimmerSpeed ?? 0.022);
  const phaseOffset = Number(beamAttack?.phaseOffset ?? 0);
  const basePulse = Math.sin(state.time * shimmerSpeed + phaseOffset) * 0.5 + 0.5;
  if (!useOriginTriangle) {
    return {
      pulse: basePulse,
      tremorSigned: basePulse * 2 - 1,
      tremorAmount: basePulse,
    };
  }

  const fastWaveA = Math.sin(state.time * Math.max(shimmerSpeed * 4.8, 0.096) + phaseOffset * 1.31);
  const fastWaveB = Math.sin(state.time * Math.max(shimmerSpeed * 7.6, 0.148) + phaseOffset * 2.07 + 1.1);
  const fastWaveC = Math.sin(state.time * Math.max(shimmerSpeed * 10.4, 0.206) + phaseOffset * 0.74 + 2.3);
  const tremorSigned = clamp(
    fastWaveA * 0.52 + fastWaveB * 0.31 + fastWaveC * 0.17,
    -1,
    1,
  );
  return {
    pulse: tremorSigned * 0.5 + 0.5,
    tremorSigned,
    tremorAmount: Math.abs(tremorSigned),
  };
}

function resolveTitanCentipedeBossBeamOverlayVisual(boss, scene, cameraLeft, cameraTop) {
  const beamAttack = boss?.beamAttack;
  if (!beamAttack?.active || !beamAttack.currentLine || !scene) {
    return null;
  }

  const beamLine = createBeamLineFromWorldPoints(
    beamAttack.currentLine.startX,
    beamAttack.currentLine.startY,
    beamAttack.currentLine.directionX,
    beamAttack.currentLine.directionY,
    beamAttack.currentLine.range,
    cameraLeft,
    cameraTop,
  );
  const useOriginTriangle = titanCentipedeResolvedPhaseIndex(boss) === 2;
  const oscillation = titanCentipedeBeamVisualOscillation(beamAttack, useOriginTriangle);
  return {
    beamLine,
    coreWidth: Number(beamAttack.visualCoreWidth ?? scene.tileSize * 0.26) * (
      useOriginTriangle
        ? (1 + oscillation.tremorSigned * 0.028)
        : (1 + oscillation.pulse * 0.16)
    ),
    whiteHotWidth: Number(beamAttack.visualWhiteHotWidth ?? scene.tileSize * 0.12) * (
      useOriginTriangle
        ? (1.02 + oscillation.tremorAmount * 0.024)
        : (1.04 + oscillation.pulse * 0.12)
    ),
    useOriginTriangle,
  };
}

function drawTitanCentipedeBossBeamVisual(boss, scene, cameraLeft, cameraTop) {
  const beamAttack = boss?.beamAttack;
  if (!beamAttack?.active || !beamAttack.currentLine) {
    return null;
  }

  const beamLine = createBeamLineFromWorldPoints(
    beamAttack.currentLine.startX,
    beamAttack.currentLine.startY,
    beamAttack.currentLine.directionX,
    beamAttack.currentLine.directionY,
    beamAttack.currentLine.range,
    cameraLeft,
    cameraTop,
  );
  const phaseIndex = titanCentipedeResolvedPhaseIndex(boss);
  const useOriginTriangle = phaseIndex === 2;
  const oscillation = titanCentipedeBeamVisualOscillation(beamAttack, useOriginTriangle);
  const pulse = oscillation.pulse;
  const glowWidth = Number(beamAttack.visualGlowWidth ?? scene.tileSize * 0.9) * (
    useOriginTriangle
      ? (1.06 + oscillation.tremorAmount * 0.06)
      : (1.12 + pulse * 0.24)
  );
  const coreWidth = Number(beamAttack.visualCoreWidth ?? scene.tileSize * 0.26) * (
    useOriginTriangle
      ? (1 + oscillation.tremorSigned * 0.032)
      : (1 + pulse * 0.16)
  );
  const whiteHotWidth = Number(beamAttack.visualWhiteHotWidth ?? scene.tileSize * 0.12) * (
    useOriginTriangle
      ? (1.02 + oscillation.tremorAmount * 0.028)
      : (1.04 + pulse * 0.12)
  );
  const endpointRadius = Number(beamAttack.endpointRadius ?? scene.tileSize * 0.92) * (
    useOriginTriangle
      ? 1.04
      : (1.06 + pulse * 0.18)
  );
  const shellLineCap = "round";
  const coreLineCap = useOriginTriangle ? "butt" : "round";
  const originFunnelLength = useOriginTriangle
    ? clamp(
        Math.max(scene.tileSize * 1.12, endpointRadius * 0.8),
        Math.max(scene.tileSize * 0.96, 24),
        Math.max(scene.tileSize * 2.8, beamLine.length * 0.09),
      )
    : 0;
  const originTriangleOuterHalfWidth = useOriginTriangle
    ? clamp(
        Math.max(scene.tileSize * 0.58, endpointRadius * 0.44),
        scene.tileSize * 0.52,
        Math.max(scene.tileSize * 1.04, endpointRadius * 0.78),
      )
    : 0;
  const originTriangleEdgeHalfWidth = originTriangleOuterHalfWidth * 0.62;
  const originTriangleCoreHalfWidth = Math.max(scene.tileSize * 0.22, originTriangleOuterHalfWidth * 0.34);
  const originTriangleWhiteHalfWidth = Math.max(1, originTriangleCoreHalfWidth * 0.54);
  const beamBodyLine = createTitanCentipedeBeamVisualLine(beamLine, originFunnelLength);
  const shellStartInset = useOriginTriangle
    ? clamp(
        Math.max(coreWidth * 1.12, whiteHotWidth * 3.4),
        Math.max(scene.tileSize * 0.22, 10),
        Math.max(scene.tileSize * 1.1, beamBodyLine.length * 0.07),
      )
    : 0;
  const beamShellLine = createTitanCentipedeBeamVisualLine(beamBodyLine, shellStartInset);
  const highGraphics = typeof beamUsesHighGraphicsQuality === "function" ? beamUsesHighGraphicsQuality() : false;
  const outerGradient = ctx.createLinearGradient(
    beamShellLine.startScreenX,
    beamShellLine.startScreenY,
    beamShellLine.endScreenX,
    beamShellLine.endScreenY,
  );
  outerGradient.addColorStop(0, useOriginTriangle ? "rgba(255, 98, 112, 0)" : "rgba(255, 88, 88, 0.32)");
  outerGradient.addColorStop(useOriginTriangle ? 0.08 : 0.18, useOriginTriangle ? "rgba(255, 86, 110, 0.28)" : "rgba(255, 126, 96, 0.42)");
  outerGradient.addColorStop(0.36, useOriginTriangle ? "rgba(255, 148, 168, 0.24)" : "rgba(108, 216, 255, 0.44)");
  outerGradient.addColorStop(0.78, useOriginTriangle ? "rgba(255, 228, 236, 0.12)" : "rgba(255, 218, 124, 0.34)");
  outerGradient.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  const innerGradient = ctx.createLinearGradient(
    beamBodyLine.startScreenX,
    beamBodyLine.startScreenY,
    beamBodyLine.endScreenX,
    beamBodyLine.endScreenY,
  );
  innerGradient.addColorStop(0, useOriginTriangle ? "rgba(255, 255, 255, 1)" : "rgba(255, 198, 198, 0.92)");
  innerGradient.addColorStop(0.24, useOriginTriangle ? "rgba(255, 244, 248, 0.98)" : "rgba(255, 122, 112, 0.96)");
  innerGradient.addColorStop(0.58, useOriginTriangle ? "rgba(255, 234, 240, 0.96)" : "rgba(212, 248, 255, 1)");
  innerGradient.addColorStop(0.84, useOriginTriangle ? "rgba(255, 214, 224, 0.92)" : "rgba(255, 238, 186, 0.98)");
  innerGradient.addColorStop(1, useOriginTriangle ? "rgba(255, 246, 248, 0.78)" : "rgba(255, 248, 232, 0.92)");
  const softShellGradient = ctx.createLinearGradient(
    beamShellLine.startScreenX,
    beamShellLine.startScreenY,
    beamShellLine.endScreenX,
    beamShellLine.endScreenY,
  );
  softShellGradient.addColorStop(0, useOriginTriangle ? "rgba(255, 226, 232, 0)" : "rgba(255, 206, 160, 0.12)");
  softShellGradient.addColorStop(useOriginTriangle ? 0.12 : 0.26, useOriginTriangle ? "rgba(255, 246, 250, 0.18)" : "rgba(255, 244, 228, 0.2)");
  softShellGradient.addColorStop(0.54, useOriginTriangle ? "rgba(255, 202, 214, 0.16)" : "rgba(212, 244, 255, 0.22)");
  softShellGradient.addColorStop(0.82, useOriginTriangle ? "rgba(255, 160, 176, 0.1)" : "rgba(255, 232, 188, 0.18)");
  softShellGradient.addColorStop(1, "rgba(255, 152, 168, 0.04)");
  const softEdgeGradient = ctx.createLinearGradient(
    beamShellLine.startScreenX,
    beamShellLine.startScreenY,
    beamShellLine.endScreenX,
    beamShellLine.endScreenY,
  );
  softEdgeGradient.addColorStop(0, useOriginTriangle ? "rgba(255, 120, 136, 0)" : "rgba(255, 148, 132, 0.14)");
  softEdgeGradient.addColorStop(useOriginTriangle ? 0.14 : 0.32, useOriginTriangle ? "rgba(255, 102, 124, 0.16)" : "rgba(112, 206, 255, 0.18)");
  softEdgeGradient.addColorStop(0.64, useOriginTriangle ? "rgba(255, 168, 190, 0.14)" : "rgba(255, 224, 148, 0.18)");
  softEdgeGradient.addColorStop(1, useOriginTriangle ? "rgba(255, 124, 144, 0.08)" : "rgba(255, 170, 138, 0.12)");
  const phaseThreeEdgeRailOffset = useOriginTriangle ? Math.max(scene.tileSize * 0.18, coreWidth * 0.76) : 0;
  const phaseThreeEdgeRailWidth = useOriginTriangle ? Math.max(1, coreWidth * 0.18) : 0;
  const phaseThreeInnerRailWidth = useOriginTriangle ? Math.max(1, phaseThreeEdgeRailWidth * 0.42) : 0;
  const clash = activeTitanCentipedeBeamClash();
  const clashBossDistance = clash
    ? clamp(Number(clash.bossDistance ?? beamLine.range) || beamLine.range, 0, beamLine.range)
    : beamLine.range;
  const renderBeamBodyEndProgress = clash
    ? clamp(
      (clashBossDistance - originFunnelLength) / Math.max(0.0001, Number(beamBodyLine.range ?? 0)),
      0,
      1,
    )
    : 1;
  const renderBeamShellEndProgress = clash
    ? clamp(
      (clashBossDistance - originFunnelLength - shellStartInset) / Math.max(0.0001, Number(beamShellLine.range ?? 0)),
      0,
      1,
    )
    : 1;
  const renderBeamBodyLine = clash
    ? createBeamSegmentLine(beamBodyLine, 0, renderBeamBodyEndProgress)
    : beamBodyLine;
  const renderBeamShellLine = clash
    ? createBeamSegmentLine(beamShellLine, 0, renderBeamShellEndProgress)
    : beamShellLine;
  const splitEndDistance = clash
    ? clamp(
      Number(clash.bossSplitEndDistance ?? clashBossDistance) || clashBossDistance,
      clashBossDistance,
      Number(beamLine.range ?? clashBossDistance),
    )
    : 0;
  const clashBodySplitEndProgress = clash
    ? clamp(
      (splitEndDistance - originFunnelLength) / Math.max(0.0001, Number(beamBodyLine.range ?? 0)),
      renderBeamBodyEndProgress,
      1,
    )
    : 0;
  const clashShellSplitEndProgress = clash
    ? clamp(
      (splitEndDistance - originFunnelLength - shellStartInset) / Math.max(0.0001, Number(beamShellLine.range ?? 0)),
      renderBeamShellEndProgress,
      1,
    )
    : 0;
  const clashBodyGapLine = clash && clashBodySplitEndProgress > renderBeamBodyEndProgress
    ? createBeamSegmentLine(beamBodyLine, renderBeamBodyEndProgress, clashBodySplitEndProgress)
    : null;
  const clashShellGapLine = clash && clashShellSplitEndProgress > renderBeamShellEndProgress
    ? createBeamSegmentLine(beamShellLine, renderBeamShellEndProgress, clashShellSplitEndProgress)
    : null;
  const preClashBeamBodyLine = null;
  const preClashBeamShellLine = null;
  const clashShellSplitOffset = clash
    ? Math.max(
      Number(clash.splitOffset ?? phaseThreeEdgeRailOffset),
      Number(clash.gapWidth ?? glowWidth) * 0.52,
    )
    : 0;
  const clashConnectorDistance = clash
    ? Math.max(
      scene.tileSize * (useOriginTriangle ? 0.6 : 1),
      Number(clash.gapWidth ?? glowWidth) * (useOriginTriangle ? 0.08 : 0.14),
    )
    : 0;
  const clashShellConnectorDistance = clash
    ? Math.max(
      scene.tileSize * (useOriginTriangle ? 0.54 : 0.86),
      Number(clash.gapWidth ?? glowWidth) * (useOriginTriangle ? 0.07 : 0.12),
    )
    : 0;
  const clashBodyUpperLine = clashBodyGapLine
    ? createTitanCentipedeClashBranchLine(
      beamBodyLine,
      renderBeamBodyEndProgress,
      clashBodySplitEndProgress,
      Number(clash.splitOffset ?? phaseThreeEdgeRailOffset),
    )
    : null;
  const clashBodyLowerLine = clashBodyGapLine
    ? createTitanCentipedeClashBranchLine(
      beamBodyLine,
      renderBeamBodyEndProgress,
      clashBodySplitEndProgress,
      -Number(clash.splitOffset ?? phaseThreeEdgeRailOffset),
    )
    : null;
  const clashShellUpperLine = clashShellGapLine
    ? createTitanCentipedeClashBranchLine(
      beamShellLine,
      renderBeamShellEndProgress,
      clashShellSplitEndProgress,
      clashShellSplitOffset,
    )
    : null;
  const clashShellLowerLine = clashShellGapLine
    ? createTitanCentipedeClashBranchLine(
      beamShellLine,
      renderBeamShellEndProgress,
      clashShellSplitEndProgress,
      -clashShellSplitOffset,
    )
    : null;
  const simplifiedClashRender = Boolean(clash && clashBodyUpperLine && clashBodyLowerLine);
  const impactScreenX = renderBeamBodyLine.endScreenX;
  const impactScreenY = renderBeamBodyLine.endScreenY;
  const drawClashAwareBeamPath = (fullLine, preLine, upperLine, lowerLine, width, style, alpha = 1, lineCap = "round") => {
    if (upperLine && lowerLine) {
      drawTitanCentipedeBeamScreenPath(fullLine, width, style, alpha, lineCap);
      const branchLineCap = lineCap === "round" ? "butt" : lineCap;
      drawTitanCentipedeBeamScreenPath(upperLine, width, style, alpha, branchLineCap);
      drawTitanCentipedeBeamScreenPath(lowerLine, width, style, alpha, branchLineCap);
      return;
    }
    if (preLine) {
      drawTitanCentipedeBeamScreenPath(preLine, width, style, alpha, lineCap);
      return;
    }
    drawTitanCentipedeBeamScreenPath(fullLine, width, style, alpha, lineCap);
  };

  const veilGradient = ctx.createLinearGradient(
    renderBeamBodyLine.startScreenX,
    renderBeamBodyLine.startScreenY,
    renderBeamBodyLine.endScreenX,
    renderBeamBodyLine.endScreenY,
  );
  veilGradient.addColorStop(0, useOriginTriangle ? "rgba(255, 236, 240, 0.24)" : "rgba(255, 228, 232, 0.18)");
  veilGradient.addColorStop(0.26, useOriginTriangle ? "rgba(255, 244, 246, 0.28)" : "rgba(255, 244, 246, 0.2)");
  veilGradient.addColorStop(0.72, useOriginTriangle ? "rgba(255, 228, 236, 0.22)" : "rgba(255, 236, 238, 0.18)");
  veilGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
  const clashInsertLength = 0;
  const clashInsertTipX = clash
    ? impactScreenX - Number(clash.playerDirectionX ?? 0) * clashInsertLength
    : impactScreenX;
  const clashInsertTipY = clash
    ? impactScreenY - Number(clash.playerDirectionY ?? 0) * clashInsertLength
    : impactScreenY;
  const clashInsertHalfWidth = clash
    ? Math.max(
      scene.tileSize * (useOriginTriangle ? 0.16 : 0.22),
      Number(clash.gapWidth ?? glowWidth) * (useOriginTriangle ? 0.16 : 0.22),
    )
    : 0;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  drawClashAwareBeamPath(
    renderBeamShellLine,
    preClashBeamShellLine,
    clashShellUpperLine,
    clashShellLowerLine,
    glowWidth * (simplifiedClashRender ? 0.92 : (useOriginTriangle ? 1.22 : 1.08)),
    veilGradient,
    simplifiedClashRender ? 0.34 : (useOriginTriangle ? 0.64 : 0.56),
    shellLineCap,
  );
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = useOriginTriangle ? "rgba(255, 108, 124, 0.88)" : "rgba(255, 196, 126, 0.92)";
  ctx.shadowBlur = glowWidth * (simplifiedClashRender ? 0.54 : (useOriginTriangle ? 0.96 : 1.28));
  if (useOriginTriangle && originFunnelLength > 1) {
    const funnelOuterGradient = ctx.createLinearGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      beamBodyLine.startScreenX,
      beamBodyLine.startScreenY,
    );
    funnelOuterGradient.addColorStop(0, "rgba(255, 248, 248, 0.84)");
    funnelOuterGradient.addColorStop(0.22, "rgba(255, 124, 132, 0.5)");
    funnelOuterGradient.addColorStop(0.64, "rgba(255, 166, 182, 0.18)");
    funnelOuterGradient.addColorStop(1, "rgba(255, 208, 220, 0)");
    const funnelInnerGradient = ctx.createLinearGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      beamBodyLine.startScreenX,
      beamBodyLine.startScreenY,
    );
    funnelInnerGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    funnelInnerGradient.addColorStop(0.28, "rgba(255, 244, 246, 0.98)");
    funnelInnerGradient.addColorStop(0.6, "rgba(255, 228, 234, 0.94)");
    funnelInnerGradient.addColorStop(1, "rgba(255, 214, 222, 0.64)");
    drawTitanCentipedeBeamOriginTriangle(
      beamLine.startScreenX,
      beamLine.startScreenY,
      beamBodyLine.startScreenX,
      beamBodyLine.startScreenY,
      originTriangleOuterHalfWidth,
      funnelOuterGradient,
      0.8,
    );
    drawTitanCentipedeBeamOriginTriangle(
      beamLine.startScreenX,
      beamLine.startScreenY,
      beamBodyLine.startScreenX,
      beamBodyLine.startScreenY,
      originTriangleEdgeHalfWidth,
      "rgba(255, 96, 116, 0.44)",
      0.78,
    );
    drawTitanCentipedeBeamOriginTriangle(
      beamLine.startScreenX,
      beamLine.startScreenY,
      beamBodyLine.startScreenX,
      beamBodyLine.startScreenY,
      originTriangleCoreHalfWidth,
      funnelInnerGradient,
      0.92,
    );
    drawTitanCentipedeBeamOriginTriangle(
      beamLine.startScreenX,
      beamLine.startScreenY,
      beamBodyLine.startScreenX,
      beamBodyLine.startScreenY,
      originTriangleWhiteHalfWidth,
      "rgba(255, 255, 255, 0.98)",
      0.9,
    );
  }
  if (useOriginTriangle && !simplifiedClashRender) {
    drawClashAwareBeamPath(renderBeamShellLine, preClashBeamShellLine, clashShellUpperLine, clashShellLowerLine, glowWidth * 1.74, softShellGradient, 0.42, shellLineCap);
    drawClashAwareBeamPath(renderBeamShellLine, preClashBeamShellLine, clashShellUpperLine, clashShellLowerLine, glowWidth * 1.18, softEdgeGradient, 0.38, shellLineCap);
  }
  drawClashAwareBeamPath(
    renderBeamShellLine,
    preClashBeamShellLine,
    clashShellUpperLine,
    clashShellLowerLine,
    glowWidth * (simplifiedClashRender ? (useOriginTriangle ? 1.02 : 1.12) : (useOriginTriangle ? 1.4 : 1.74)),
    outerGradient,
    simplifiedClashRender ? 0.9 : 0.98,
    shellLineCap,
  );
  if (!simplifiedClashRender) {
    drawClashAwareBeamPath(
      renderBeamShellLine,
      preClashBeamShellLine,
      clashShellUpperLine,
      clashShellLowerLine,
      glowWidth * (useOriginTriangle ? 0.82 : 1.08),
      useOriginTriangle ? "rgba(255, 246, 248, 0.28)" : "rgba(112, 206, 255, 0.32)",
      0.92,
      shellLineCap,
    );
    drawClashAwareBeamPath(
      renderBeamShellLine,
      preClashBeamShellLine,
      clashShellUpperLine,
      clashShellLowerLine,
      glowWidth * (useOriginTriangle ? 0.68 : 0.82),
      useOriginTriangle ? "rgba(255, 92, 112, 0.24)" : "rgba(255, 94, 94, 0.28)",
      0.88,
      shellLineCap,
    );
  }
  if (!simplifiedClashRender && highGraphics && typeof drawBeamHighGoldenOverlay === "function") {
    drawBeamHighGoldenOverlay(
      useOriginTriangle
        ? (clashShellUpperLine && clashShellLowerLine ? clashShellUpperLine : renderBeamShellLine)
        : renderBeamBodyLine,
      glowWidth,
      coreWidth,
      pulse,
      beamAttack.phaseOffset ?? 0.61,
      useOriginTriangle ? 0.66 : 0.94,
    );
    if (useOriginTriangle && clashShellLowerLine) {
      drawBeamHighGoldenOverlay(
        clashShellLowerLine,
        glowWidth,
        coreWidth,
        pulse,
        (beamAttack.phaseOffset ?? 0.61) + Math.PI * 0.35,
        0.66,
      );
    }
  }
  if (!simplifiedClashRender && useOriginTriangle && highGraphics) {
    if (typeof drawBeamHighFilamentLayer === "function") {
      drawBeamHighFilamentLayer(
        clashShellUpperLine && clashShellLowerLine ? clashShellUpperLine : renderBeamShellLine,
        glowWidth * 0.96,
        coreWidth * 0.9,
        pulse,
        0.36,
      );
      if (clashShellLowerLine) {
        drawBeamHighFilamentLayer(clashShellLowerLine, glowWidth * 0.96, coreWidth * 0.9, pulse, 0.36);
      }
    }
    if (typeof drawBeamHighEnergyCurrents === "function") {
      drawBeamHighEnergyCurrents(
        clashShellUpperLine && clashShellLowerLine ? clashShellUpperLine : renderBeamShellLine,
        glowWidth * 0.9,
        coreWidth * 0.92,
        pulse,
        0.42,
      );
      if (clashShellLowerLine) {
        drawBeamHighEnergyCurrents(clashShellLowerLine, glowWidth * 0.9, coreWidth * 0.92, pulse, 0.42);
      }
    }
  }
  drawClashAwareBeamPath(
    renderBeamBodyLine,
    preClashBeamBodyLine,
    clashBodyUpperLine,
    clashBodyLowerLine,
    coreWidth * (simplifiedClashRender ? 1.02 : 1.28),
    simplifiedClashRender ? "rgba(255, 255, 255, 0.76)" : "rgba(255, 255, 255, 0.82)",
    simplifiedClashRender ? 0.88 : 0.94,
    coreLineCap,
  );
  drawClashAwareBeamPath(
    renderBeamBodyLine,
    preClashBeamBodyLine,
    clashBodyUpperLine,
    clashBodyLowerLine,
    coreWidth * (simplifiedClashRender ? 0.86 : 1),
    innerGradient,
    1,
    coreLineCap,
  );
  drawClashAwareBeamPath(
    renderBeamBodyLine,
    preClashBeamBodyLine,
    clashBodyUpperLine,
    clashBodyLowerLine,
    whiteHotWidth * (simplifiedClashRender ? 0.78 : 1),
    "rgba(255, 255, 255, 1)",
    simplifiedClashRender ? 0.9 : 0.98,
    coreLineCap,
  );
  if (!simplifiedClashRender) {
    drawClashAwareBeamPath(renderBeamBodyLine, preClashBeamBodyLine, clashBodyUpperLine, clashBodyLowerLine, Math.max(1, whiteHotWidth * 0.48), "rgba(255, 255, 255, 1)", 0.96, coreLineCap);
  }
  if (useOriginTriangle) {
    if (clash) {
      if (preClashBeamBodyLine) {
        drawTitanCentipedeBeamEdgeRails(
          preClashBeamBodyLine,
          phaseThreeEdgeRailOffset,
          phaseThreeEdgeRailWidth,
          "rgba(255, 92, 112, 0.8)",
          0.92,
        );
        drawTitanCentipedeBeamEdgeRails(
          preClashBeamBodyLine,
          Math.max(scene.tileSize * 0.1, phaseThreeEdgeRailOffset * 0.76),
          phaseThreeInnerRailWidth,
          "rgba(255, 246, 248, 0.64)",
          0.82,
        );
      }
    } else {
      drawTitanCentipedeBeamEdgeRails(
        renderBeamBodyLine,
        phaseThreeEdgeRailOffset,
        phaseThreeEdgeRailWidth,
        "rgba(255, 92, 112, 0.8)",
        0.92,
      );
      drawTitanCentipedeBeamEdgeRails(
        renderBeamBodyLine,
        Math.max(scene.tileSize * 0.1, phaseThreeEdgeRailOffset * 0.76),
        phaseThreeInnerRailWidth,
        "rgba(255, 246, 248, 0.64)",
        0.82,
      );
      drawTitanCentipedeBeamTransitionBlend(
        beamLine,
        renderBeamBodyLine,
        scene,
        glowWidth,
        coreWidth,
        whiteHotWidth,
      );
    }
  }
  if (!simplifiedClashRender && typeof drawBeamParticleField === "function") {
    if (clashBodyUpperLine && clashBodyLowerLine) {
      drawBeamParticleField(clashBodyUpperLine, beamAttack, scene, 0.76);
      drawBeamParticleField(clashBodyLowerLine, beamAttack, scene, 0.76);
      if (preClashBeamBodyLine) {
        drawBeamParticleField(preClashBeamBodyLine, beamAttack, scene, 0.86);
      }
    } else {
      drawBeamParticleField(renderBeamBodyLine, beamAttack, scene, 1);
    }
  }


  if (!useOriginTriangle) {
    const originGlow = ctx.createRadialGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      endpointRadius * 0.12,
      beamLine.startScreenX,
      beamLine.startScreenY,
      endpointRadius * 1.36,
    );
    originGlow.addColorStop(0, "rgba(255, 255, 255, 1)");
    originGlow.addColorStop(0.16, "rgba(255, 180, 180, 0.88)");
    originGlow.addColorStop(0.42, "rgba(108, 216, 255, 0.54)");
    originGlow.addColorStop(0.72, "rgba(255, 226, 146, 0.38)");
    originGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = originGlow;
    ctx.beginPath();
    ctx.arc(beamLine.startScreenX, beamLine.startScreenY, endpointRadius * 1.36, 0, Math.PI * 2);
    ctx.fill();
  }

  if (useOriginTriangle) {
    const originOrbRadius = Math.max(
      scene.tileSize * 0.28,
      Number(beamAttack.chargeOrbRadius ?? endpointRadius) * 0.28,
    ) * (
      useOriginTriangle
        ? (0.98 + oscillation.tremorAmount * 0.02)
        : (0.92 + pulse * 0.08)
    );
    const originOrbShell = ctx.createRadialGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      originOrbRadius * 0.08,
      beamLine.startScreenX,
      beamLine.startScreenY,
      originOrbRadius * 1.08,
    );
    originOrbShell.addColorStop(0, "rgba(255, 255, 255, 1)");
    originOrbShell.addColorStop(0.24, "rgba(255, 212, 220, 0.76)");
    originOrbShell.addColorStop(0.58, "rgba(255, 132, 148, 0.26)");
    originOrbShell.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = originOrbShell;
    ctx.beginPath();
    ctx.arc(beamLine.startScreenX, beamLine.startScreenY, originOrbRadius * 1.08, 0, Math.PI * 2);
    ctx.fill();

    const originOrbCore = ctx.createRadialGradient(
      beamLine.startScreenX,
      beamLine.startScreenY,
      originOrbRadius * 0.05,
      beamLine.startScreenX,
      beamLine.startScreenY,
      originOrbRadius,
    );
    originOrbCore.addColorStop(0, "rgba(255, 255, 255, 1)");
    originOrbCore.addColorStop(0.24, "rgba(255, 244, 246, 0.94)");
    originOrbCore.addColorStop(0.58, "rgba(255, 188, 198, 0.52)");
    originOrbCore.addColorStop(1, "rgba(255, 132, 148, 0)");
    ctx.fillStyle = originOrbCore;
    ctx.beginPath();
    ctx.arc(beamLine.startScreenX, beamLine.startScreenY, originOrbRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  const impactGlow = ctx.createRadialGradient(
    impactScreenX,
    impactScreenY,
    endpointRadius * 0.12,
    impactScreenX,
    impactScreenY,
    endpointRadius * (simplifiedClashRender ? 0.76 : 1.72),
  );
  impactGlow.addColorStop(0, simplifiedClashRender ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 1)");
  impactGlow.addColorStop(0.24, simplifiedClashRender ? "rgba(255, 246, 222, 0.34)" : "rgba(255, 246, 222, 0.9)");
  impactGlow.addColorStop(0.54, simplifiedClashRender ? "rgba(124, 224, 255, 0.08)" : "rgba(124, 224, 255, 0.34)");
  impactGlow.addColorStop(0.78, simplifiedClashRender ? "rgba(255, 200, 112, 0.06)" : "rgba(255, 200, 112, 0.28)");
  impactGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = impactGlow;
  ctx.beginPath();
  ctx.arc(impactScreenX, impactScreenY, endpointRadius * (simplifiedClashRender ? 0.76 : 1.72), 0, Math.PI * 2);
  ctx.fill();

  if (highGraphics && typeof drawBeamHighEndpointCorona === "function") {
    drawBeamHighEndpointCorona(
      beamLine.startScreenX,
      beamLine.startScreenY,
      -beamLine.directionX,
      -beamLine.directionY,
      endpointRadius * 0.98,
      0.76,
    );
    drawBeamHighEndpointCorona(
      impactScreenX,
      impactScreenY,
      renderBeamBodyLine.directionX,
      renderBeamBodyLine.directionY,
      endpointRadius * 1.18,
      0.92,
    );
  }
  ctx.restore();
  return {
    beamLine,
    renderBeamBodyLine,
    glowWidth,
    coreWidth,
    whiteHotWidth,
    endpointRadius,
    originFunnelLength,
    useOriginTriangle,
  };
}

function drawBossSheetFrame(image, frameIndex, partSize, screenX, screenY, drawWidth, drawHeight, rotation = 0) {
  if (!image || image.complete === false) {
    return;
  }

  const safePartSize = Math.max(1, Number(partSize ?? 32) || 32);
  const safeFrameIndex = Math.max(0, Math.floor(Number(frameIndex ?? 0) || 0));
  ctx.save();
  ctx.translate(screenX, screenY);
  if (rotation) {
    ctx.rotate(rotation);
  }
  drawPixelSprite(
    image,
    safeFrameIndex * safePartSize,
    0,
    safePartSize,
    safePartSize,
    -drawWidth * 0.5,
    -drawHeight * 0.5,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function drawTitanCentipedeAuraSpriteFrame(
  image,
  frameIndex,
  partSize,
  screenX,
  screenY,
  drawWidth,
  drawHeight,
  rotation = 0,
  {
    outerScale = 1.14,
    innerScale = 1.06,
    shadowBlur = 0,
    outerAlpha = 0.2,
    innerAlpha = 0.14,
    fillAlpha = 0.12,
    outerTintColor = "rgba(255, 255, 255, 1)",
    innerTintColor = outerTintColor,
    shadowColor = outerTintColor,
    compositeOperation = "lighter",
    innerCompositeOperation = "screen",
  } = {},
) {
  if (!image || image.complete === false) {
    return;
  }

  const safePartSize = Math.max(1, Number(partSize ?? 32) || 32);
  const safeFrameIndex = Math.max(0, Math.floor(Number(frameIndex ?? 0) || 0));
  const outerSprite = typeof getBeamWeaponHighlightSprite === "function"
    ? (getBeamWeaponHighlightSprite(image, outerTintColor) || image)
    : image;
  const innerSprite = typeof getBeamWeaponHighlightSprite === "function"
    ? (getBeamWeaponHighlightSprite(image, innerTintColor) || outerSprite)
    : outerSprite;
  const drawAuraPass = (sprite, scale) => {
    if (!sprite) {
      return;
    }
    drawPixelSprite(
      sprite,
      safeFrameIndex * safePartSize,
      0,
      safePartSize,
      safePartSize,
      -drawWidth * scale * 0.5,
      -drawHeight * scale * 0.5,
      drawWidth * scale,
      drawHeight * scale,
    );
  };

  ctx.save();
  ctx.translate(screenX, screenY);
  if (rotation) {
    ctx.rotate(rotation);
  }

  if (fillAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = compositeOperation;
    ctx.globalAlpha = clamp(fillAlpha, 0, 1);
    drawAuraPass(outerSprite, Math.max(1, outerScale * 0.98));
    ctx.restore();
  }

  if (outerAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = compositeOperation;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = Math.max(0, shadowBlur);
    ctx.globalAlpha = clamp(outerAlpha, 0, 1);
    drawAuraPass(outerSprite, outerScale);
    ctx.restore();
  }

  if (innerAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = innerCompositeOperation;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = Math.max(0, shadowBlur * 0.52);
    ctx.globalAlpha = clamp(innerAlpha, 0, 1);
    drawAuraPass(innerSprite, innerScale);
    ctx.restore();
  }

  ctx.restore();
}

function drawTitanCentipedePhaseAura(scene, phaseIndex, auraParts, options = {}) {
  if (!scene || phaseIndex < 1 || !Array.isArray(auraParts) || !auraParts.length) {
    return;
  }

  const phaseThree = phaseIndex === 2;
  const drawAnchorGlow = options.drawAnchorGlow !== false;
  const bodyMode = options.style === "body";
  const highGraphics = typeof beamUsesHighGraphicsQuality === "function" ? beamUsesHighGraphicsQuality() : false;
  const frontLiteMode = !bodyMode && !highGraphics;
  const pulse = Math.sin(state.time * (phaseThree ? 0.0054 : 0.0048)) * 0.5 + 0.5;
  const headAuraPart = auraParts[0];

  if (bodyMode && !highGraphics) {
    return;
  }

  auraParts.forEach((part, index) => {
    if (!part?.image) {
      return;
    }

    const emphasis = bodyMode
      ? (index < 4 ? 1.02 : 0.96)
      : (index === 0 ? 1.08 : 1);
    if (phaseThree) {
      drawTitanCentipedeAuraSpriteFrame(
        part.image,
        part.frameIndex,
        part.partSize,
        part.screenX,
        part.screenY,
        part.drawWidth,
        part.drawHeight,
        part.rotation,
        {
          outerScale: (bodyMode ? 1.1 : (frontLiteMode ? 1.1 : 1.18)) * emphasis,
          innerScale: (bodyMode ? 1.04 : (frontLiteMode ? 1.04 : 1.1)) * emphasis,
          shadowBlur: bodyMode
            ? (index < 4 ? scene.tileSize * 0.4 * (1 + pulse * 0.08) : 0)
            : (frontLiteMode
              ? (scene.tileSize * 0.48 * emphasis * (1 + pulse * 0.06))
              : (scene.tileSize * 1.12 * emphasis * (1 + pulse * 0.1))),
          fillAlpha: bodyMode
            ? (0.12 + pulse * 0.02)
            : (frontLiteMode ? (0.12 + pulse * 0.02) : (0.28 + pulse * 0.03)),
          outerAlpha: bodyMode
            ? (0.14 + pulse * 0.02)
            : (frontLiteMode ? (0.16 + pulse * 0.03) : (0.38 + pulse * 0.04)),
          innerAlpha: bodyMode
            ? (index < 4 ? (0.04 + pulse * 0.01) : 0)
            : (frontLiteMode
              ? (index === 0 ? (0.05 + pulse * 0.01) : 0)
              : (0.12 + pulse * 0.03)),
          outerTintColor: "rgba(12, 10, 18, 1)",
          innerTintColor: "rgba(168, 162, 186, 1)",
          shadowColor: "rgba(138, 132, 162, 0.34)",
          compositeOperation: "source-over",
          innerCompositeOperation: "screen",
        },
      );
      return;
    }

    drawTitanCentipedeAuraSpriteFrame(
      part.image,
      part.frameIndex,
      part.partSize,
      part.screenX,
      part.screenY,
      part.drawWidth,
      part.drawHeight,
      part.rotation,
      {
        outerScale: (bodyMode ? 1.08 : (frontLiteMode ? 1.08 : 1.16)) * emphasis,
        innerScale: (bodyMode ? 1.03 : (frontLiteMode ? 1.03 : 1.08)) * emphasis,
        shadowBlur: bodyMode
          ? (index < 4 ? scene.tileSize * 0.44 * (1 + pulse * 0.1) : 0)
          : (frontLiteMode
            ? (scene.tileSize * 0.52 * emphasis * (1 + pulse * 0.08))
            : (scene.tileSize * 1.28 * emphasis * (1 + pulse * 0.16))),
        fillAlpha: bodyMode
          ? (0.08 + pulse * 0.02)
          : (frontLiteMode ? (0.06 + pulse * 0.02) : (0.12 + pulse * 0.04)),
        outerAlpha: bodyMode
          ? (0.12 + pulse * 0.03)
          : (frontLiteMode ? (0.12 + pulse * 0.03) : (0.24 + pulse * 0.08)),
        innerAlpha: bodyMode
          ? (index < 4 ? (0.05 + pulse * 0.02) : 0)
          : (frontLiteMode
            ? (index === 0 ? (0.06 + pulse * 0.02) : 0)
            : (0.16 + pulse * 0.06)),
        outerTintColor: "rgba(255, 88, 108, 1)",
        innerTintColor: "rgba(255, 236, 242, 1)",
        shadowColor: "rgba(255, 76, 98, 0.96)",
        compositeOperation: "lighter",
        innerCompositeOperation: "screen",
      },
    );
  });

  if (drawAnchorGlow && headAuraPart && typeof drawBeamGlowSprite === "function") {
    const headGlowRadius = Math.max(
      scene.tileSize * (phaseThree ? 0.72 : 0.94),
      Math.max(headAuraPart.drawWidth, headAuraPart.drawHeight) * 0.56,
    );
    ctx.save();
    ctx.globalCompositeOperation = phaseThree ? "screen" : "lighter";
    ctx.globalAlpha = frontLiteMode
      ? (phaseThree ? (0.06 + pulse * 0.02) : (0.1 + pulse * 0.04))
      : (phaseThree ? (0.1 + pulse * 0.04) : (0.18 + pulse * 0.08));
    drawBeamGlowSprite(
      phaseThree ? "origin" : "impact",
      headAuraPart.screenX,
      headAuraPart.screenY,
      headGlowRadius,
      1,
    );
    ctx.restore();
  }
}

function drawTitanCentipedeBoss(cameraLeft, cameraTop, boss, scene, width, height) {
  if (!boss?.profile || !scene) {
    return;
  }

  const profile = boss.profile;
  const headPhaseFrames = profile.mainSheet?.headPhaseFrameIndices || [0];
  const headFrameIndex = headPhaseFrames[Math.max(0, Math.min(headPhaseFrames.length - 1, Number(boss.phaseIndex ?? 0) || 0))] ?? 0;
  const bodyFrameIndex = Number(profile.mainSheet?.bodyFrameIndex ?? TITAN_CENTIPEDE_BODY_FRAME_INDEX);
  const tailFrameIndex = Number(profile.mainSheet?.tailFrameIndex ?? TITAN_CENTIPEDE_TAIL_FRAME_INDEX);
  const partSize = Math.max(1, Number(profile.mainSheet?.partSize ?? TITAN_CENTIPEDE_BASE_PART_SIZE_PX) || TITAN_CENTIPEDE_BASE_PART_SIZE_PX);
  const segmentCount = Math.max(1, Number(profile.body?.segmentCount ?? 1) || 1);
  const segmentSpacing = Math.max(8, Number(boss.segmentSpacing ?? scene.tileSize));
  const bodyDrawSize = Math.max(scene.tileSize * 1.8, Number(boss.drawPartSize ?? scene.tileSize * 2.7));
  const headDrawWidth = bodyDrawSize * 1.26;
  const headDrawHeight = bodyDrawSize * 1.2;
  const tailDrawWidth = bodyDrawSize * 1.08;
  const tailDrawHeight = bodyDrawSize * 1.04;
  const foregroundBodySegmentCount = Math.max(0, Math.min(2, segmentCount));
  const hornBaseRenderState = titanCentipedeHornBaseRenderState(boss, scene, headDrawWidth, bodyDrawSize);
  const fangLayout = titanCentipedeFangLayout(scene);
  const fangDrawSize = Math.max(scene.tileSize, fangLayout.size);
  const visibleLeft = cameraLeft - bodyDrawSize;
  const visibleRight = cameraLeft + width + bodyDrawSize;
  const visibleTop = cameraTop - bodyDrawSize;
  const visibleBottom = cameraTop + height + bodyDrawSize;
  const headPose = resolveTitanCentipedeHeadPose(boss);
  const phaseIndex = titanCentipedeResolvedPhaseIndex(boss);
  const headWorldX = headPose.x;
  const headWorldY = headPose.y;
  const headRotation = titanCentipedeRenderRotation(headPose.headingAngle);
  const mouthAnchor = resolveTitanCentipedeMouthAnchor(boss, scene, cameraLeft, cameraTop);
  const highGraphics = typeof beamUsesHighGraphicsQuality === "function" ? beamUsesHighGraphicsQuality() : false;
  const hornBaseDrawWidth = tailDrawWidth * hornBaseRenderState.scale;
  const hornBaseDrawHeight = tailDrawHeight * hornBaseRenderState.scale;
  const hornBaseAssetOffsetX = Number(boss.hornBaseAssetOffsetXPx ?? 0) * (hornBaseDrawWidth / Math.max(1, partSize));
  const hornBaseOffset = rotateTitanCentipedeOffset(
    hornBaseRenderState.designOffsetX + hornBaseAssetOffsetX,
    hornBaseRenderState.designOffsetY,
    headPose.headingAngle,
  );
  const bodyAuraParts = [];
  const bodyAuraFrontSegmentCount = 6;
  const bodyAuraStride = 8;
  const bodyAuraMaxSegments = 20;
  const sampleVisibleBodySegment = (segmentIndex) => {
    const segmentPose = sampleTitanCentipedeTrailPose(boss, segmentSpacing * segmentIndex);
    const segmentWorldX = segmentPose.x;
    const segmentWorldY = segmentPose.y;
    if (
      segmentWorldX < visibleLeft
      || segmentWorldX > visibleRight
      || segmentWorldY < visibleTop
      || segmentWorldY > visibleBottom
    ) {
      return null;
    }

    return {
      pose: segmentPose,
      worldX: segmentWorldX,
      worldY: segmentWorldY,
      screenX: segmentWorldX - cameraLeft,
      screenY: segmentWorldY - cameraTop,
      rotation: titanCentipedeRenderRotation(segmentPose.headingAngle),
    };
  };
  const drawBodySegment = (segmentIndex, options = {}) => {
    const drawShadow = options.drawShadow !== false;
    const drawSprite = options.drawSprite !== false;
    const sampledSegment = sampleVisibleBodySegment(segmentIndex);
    if (!sampledSegment) {
      return;
    }
    const segmentPose = sampledSegment.pose;
    const segmentWorldX = sampledSegment.worldX;
    const segmentWorldY = sampledSegment.worldY;

    if (drawShadow) {
      drawPropShadow(
        segmentWorldX - cameraLeft,
        segmentWorldY - cameraTop + bodyDrawSize * 0.36,
        bodyDrawSize * 0.26,
        bodyDrawSize * 0.09,
        0.18,
      );
    }
    if (drawSprite) {
      drawBossSheetFrame(
        profile.mainSheet?.image,
        bodyFrameIndex,
        partSize,
        sampledSegment.screenX,
        sampledSegment.screenY,
        bodyDrawSize,
        bodyDrawSize,
        sampledSegment.rotation,
      );
    }
  };

  if (phaseIndex >= 1) {
    for (let segmentIndex = 1; segmentIndex <= segmentCount; segmentIndex += 1) {
      if (bodyAuraParts.length >= bodyAuraMaxSegments) {
        break;
      }
      if (segmentIndex > bodyAuraFrontSegmentCount && segmentIndex % bodyAuraStride !== 0) {
        continue;
      }

      const sampledSegment = sampleVisibleBodySegment(segmentIndex);
      if (!sampledSegment) {
        continue;
      }

      bodyAuraParts.push({
        image: profile.mainSheet?.image,
        frameIndex: bodyFrameIndex,
        partSize,
        screenX: sampledSegment.screenX,
        screenY: sampledSegment.screenY,
        drawWidth: bodyDrawSize,
        drawHeight: bodyDrawSize,
        rotation: sampledSegment.rotation,
      });
    }
  }

  if (highGraphics && bodyAuraParts.length > 0) {
    drawTitanCentipedePhaseAura(scene, phaseIndex, bodyAuraParts, {
      drawAnchorGlow: false,
      style: "body",
    });
  }

  for (let segmentIndex = segmentCount; segmentIndex > foregroundBodySegmentCount; segmentIndex -= 1) {
    drawBodySegment(segmentIndex);
  }
  for (let segmentIndex = foregroundBodySegmentCount; segmentIndex >= 1; segmentIndex -= 1) {
    drawBodySegment(segmentIndex, { drawSprite: false });
  }

  const tailPose = sampleTitanCentipedeTrailPose(boss, segmentSpacing * (segmentCount + 1));
  const tailWorldX = tailPose.x;
  const tailWorldY = tailPose.y;
  if (
    tailWorldX >= visibleLeft
    && tailWorldX <= visibleRight
    && tailWorldY >= visibleTop
    && tailWorldY <= visibleBottom
  ) {
    drawPropShadow(
      tailWorldX - cameraLeft,
      tailWorldY - cameraTop + tailDrawHeight * 0.34,
      tailDrawWidth * 0.24,
      tailDrawHeight * 0.08,
      0.18,
    );
    drawBossSheetFrame(
      profile.mainSheet?.image,
      tailFrameIndex,
      partSize,
      tailWorldX - cameraLeft,
      tailWorldY - cameraTop,
      tailDrawWidth,
      tailDrawHeight,
      titanCentipedeRenderRotation(tailPose.headingAngle),
    );
  }

  const fangFrameCount = Math.max(1, Number(profile.fangs?.frameCount ?? 4) || 4);
  const fangPartSize = Math.max(1, Number(profile.fangs?.partSize ?? 32) || 32);
  const fangFrame = Math.floor(state.time * 0.01) % fangFrameCount;
  const fangOpenProgress = titanCentipedeFangOpenProgress(boss);
  const phaseThreeBeamSpreadMultiplier = (
    phaseIndex === 2
    && boss?.beamAttack?.active
  )
    ? (1 + (TITAN_CENTIPEDE_PHASE_THREE_FANG_FIRE_SPREAD_MULTIPLIER - 1) * fangOpenProgress)
    : 1;
  const fangOffsetX = fangLayout.offsetX;
  const fangOffsetY = fangLayout.offsetY * phaseThreeBeamSpreadMultiplier;
  const fangOpenMaxAngle = phaseIndex === 2
    ? TITAN_CENTIPEDE_PHASE_THREE_FANG_OPEN_MAX_ANGLE
    : TITAN_CENTIPEDE_FANG_OPEN_BASE_ANGLE;
  const fangOpenAngle = fangOpenMaxAngle * fangOpenProgress;
  const fangHingeLength = scene.tileSize * 0.92;
  const upperFangOffset = rotateTitanCentipedeOffset(
    -fangOffsetX,
    -fangOffsetY,
    headPose.headingAngle,
  );
  const lowerFangOffset = rotateTitanCentipedeOffset(
    -fangOffsetX,
    fangOffsetY,
    headPose.headingAngle,
  );
  const resolveFangOpenedCenter = (closedCenterX, closedCenterY, openDelta) => {
    const toHeadX = headWorldX - cameraLeft - closedCenterX;
    const toHeadY = headWorldY - cameraTop - closedCenterY;
    const toHeadLength = Math.max(0.0001, Math.hypot(toHeadX, toHeadY));
    const hingeX = closedCenterX + (toHeadX / toHeadLength) * fangHingeLength;
    const hingeY = closedCenterY + (toHeadY / toHeadLength) * fangHingeLength;
    const hingeToCenter = rotateVector(
      closedCenterX - hingeX,
      closedCenterY - hingeY,
      openDelta,
    );
    return {
      x: hingeX + hingeToCenter.x,
      y: hingeY + hingeToCenter.y,
    };
  };
  const upperFangClosedCenterX = headWorldX + upperFangOffset.x - cameraLeft;
  const upperFangClosedCenterY = headWorldY + upperFangOffset.y - cameraTop;
  const lowerFangClosedCenterX = headWorldX + lowerFangOffset.x - cameraLeft;
  const lowerFangClosedCenterY = headWorldY + lowerFangOffset.y - cameraTop;
  const upperFangCenter = resolveFangOpenedCenter(
    upperFangClosedCenterX,
    upperFangClosedCenterY,
    fangOpenAngle,
  );
  const lowerFangCenter = resolveFangOpenedCenter(
    lowerFangClosedCenterX,
    lowerFangClosedCenterY,
    -fangOpenAngle,
  );
  drawTitanCentipedePhaseAura(scene, phaseIndex, [
    {
      image: profile.mainSheet?.image,
      frameIndex: headFrameIndex,
      partSize,
      screenX: headWorldX - cameraLeft,
      screenY: headWorldY - cameraTop,
      drawWidth: headDrawWidth,
      drawHeight: headDrawHeight,
      rotation: headRotation,
    },
    {
      image: profile.mainSheet?.image,
      frameIndex: tailFrameIndex,
      partSize,
      screenX: headWorldX + hornBaseOffset.x - cameraLeft,
      screenY: headWorldY + hornBaseOffset.y - cameraTop,
      drawWidth: hornBaseDrawWidth,
      drawHeight: hornBaseDrawHeight,
      rotation: headRotation,
    },
    {
      image: profile.fangs?.leftImage,
      frameIndex: fangFrame,
      partSize: fangPartSize,
      screenX: upperFangCenter.x,
      screenY: upperFangCenter.y,
      drawWidth: fangDrawSize,
      drawHeight: fangDrawSize,
      rotation: headRotation + fangOpenAngle,
    },
    {
      image: profile.fangs?.rightImage,
      frameIndex: fangFrame,
      partSize: fangPartSize,
      screenX: lowerFangCenter.x,
      screenY: lowerFangCenter.y,
      drawWidth: fangDrawSize,
      drawHeight: fangDrawSize,
      rotation: headRotation - fangOpenAngle,
    },
  ]);
  drawPropShadow(
    headWorldX - cameraLeft,
    headWorldY - cameraTop + headDrawHeight * 0.36,
    headDrawWidth * 0.32,
    headDrawHeight * 0.1,
    0.24,
  );
  drawBossSheetFrame(
    profile.fangs?.leftImage,
    fangFrame,
    fangPartSize,
    upperFangCenter.x,
    upperFangCenter.y,
    fangDrawSize,
    fangDrawSize,
    headRotation + fangOpenAngle,
  );
  drawBossSheetFrame(
    profile.fangs?.rightImage,
    fangFrame,
    fangPartSize,
    lowerFangCenter.x,
    lowerFangCenter.y,
    fangDrawSize,
    fangDrawSize,
    headRotation - fangOpenAngle,
  );
  for (let segmentIndex = foregroundBodySegmentCount; segmentIndex >= 1; segmentIndex -= 1) {
    drawBodySegment(segmentIndex, { drawShadow: false });
  }

  const drawHornBase = () => {
    drawBossSheetFrame(
      profile.mainSheet?.image,
      tailFrameIndex,
      partSize,
      headWorldX + hornBaseOffset.x - cameraLeft,
      headWorldY + hornBaseOffset.y - cameraTop,
      hornBaseDrawWidth,
      hornBaseDrawHeight,
      headRotation,
    );
  };
  if (!hornBaseRenderState.drawAboveHead) {
    drawHornBase();
  }

  drawTitanCentipedeBossBeamCharge(boss, scene, mouthAnchor);
  const activeBeamVisual = resolveTitanCentipedeBossBeamOverlayVisual(boss, scene, cameraLeft, cameraTop);

  drawBossSheetFrame(
    profile.mainSheet?.image,
    headFrameIndex,
    partSize,
    headWorldX - cameraLeft,
    headWorldY - cameraTop,
    headDrawWidth,
    headDrawHeight,
    headRotation,
  );
  if (hornBaseRenderState.drawAboveHead) {
    drawHornBase();
  }
  drawTitanCentipedeBossBeamHeadLightOverlay(
    activeBeamVisual,
    headWorldX - cameraLeft,
    headWorldY - cameraTop,
    headDrawWidth,
    headDrawHeight,
  );
}

function drawBossSummonTriggerMarker(cameraLeft, cameraTop, game = state.game) {
  if (!game?.bossSummonTrigger) {
    return;
  }

  const bossSummonTrigger = game.bossSummonTrigger;
  const pulse = Math.sin(state.time * 0.0049) * 0.5 + 0.5;
  const triggerScreenX = bossSummonTrigger.originX - cameraLeft;
  const triggerScreenY = bossSummonTrigger.originY - cameraTop;

  ctx.save();
  ctx.beginPath();
  ctx.arc(triggerScreenX, triggerScreenY, bossSummonTrigger.radius, 0, Math.PI * 2);
  ctx.fillStyle = bossSummonTrigger.activated
    ? "rgba(214, 58, 43, 0.22)"
    : "rgba(150, 24, 24, 0.12)";
  ctx.fill();

  ctx.setLineDash(bossSummonTrigger.activated ? [] : [16, 10]);
  ctx.lineWidth = bossSummonTrigger.activated ? 4 : 3;
  ctx.strokeStyle = bossSummonTrigger.activated
    ? "rgba(255, 146, 126, 0.92)"
    : `rgba(255, 92, 92, ${0.38 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(triggerScreenX, triggerScreenY, bossSummonTrigger.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = bossSummonTrigger.activated
    ? "rgba(255, 218, 202, 0.82)"
    : `rgba(255, 206, 198, ${0.18 + pulse * 0.14})`;
  ctx.beginPath();
  ctx.arc(triggerScreenX, triggerScreenY, Math.max(10, bossSummonTrigger.radius - 8), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBossSceneOverlays(cameraLeft, cameraTop, scene, width, height, game = state.game) {
  drawBossSummonTriggerMarker(cameraLeft, cameraTop, game);
  if (game?.bossSummonTest?.activeBoss) {
    drawTitanCentipedeBoss(
      cameraLeft,
      cameraTop,
      game.bossSummonTest.activeBoss,
      scene,
      width,
      height,
    );
  }
}

function drawBossSceneTopLayer(cameraLeft, cameraTop, scene, width, height, game = state.game) {
  if (!game?.bossSummonTest?.activeBoss) {
    return;
  }

  drawTitanCentipedeBossBeamVisual(
    game.bossSummonTest.activeBoss,
    scene,
    cameraLeft,
    cameraTop,
  );
}
