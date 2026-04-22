const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
const page = document.body.dataset.page || "main";

const mainStartButton = document.querySelector("#main-start-btn");
const mainArchivesButton = document.querySelector("#main-archives-btn");
const mainSettingsButton = document.querySelector("#main-settings-btn");
const mainExitButton = document.querySelector("#main-exit-btn");
const mainSettingsPanel = document.querySelector("#main-settings-panel");
const mainMenuStatus = document.querySelector("#main-menu-status");

const slotList = document.querySelector("#slot-list");
const selectionStatus = document.querySelector("#selection-status");
const selectionTitle = document.querySelector("#selection-title");
const selectionSummary = document.querySelector("#selection-summary");
const selectionNote = document.querySelector("#selection-note");
const selectionMeta = document.querySelector("#selection-meta");
const startButton = document.querySelector("#start-btn");
const cycleButton = document.querySelector("#cycle-btn");
const deleteButton = document.querySelector("#delete-btn");
const deleteModal = document.querySelector("#delete-modal");
const deleteModalCopy = document.querySelector("#delete-modal-copy");
const deleteConfirmButton = document.querySelector("#delete-confirm-btn");
const deleteCancelButton = document.querySelector("#delete-cancel-btn");
const controlsCopy = document.querySelector("#controls-copy");
const controlsList = document.querySelector("#controls-list");

const nameInput = document.querySelector("#name-input");
const genderButtons = Array.from(document.querySelectorAll(".gender-button"));
const originButtons = Array.from(document.querySelectorAll(".origin-button"));
const createPreviewName = document.querySelector("#create-preview-name");
const createPreviewCopy = document.querySelector("#create-preview-copy");
const sheetAvatar = document.querySelector("#sheet-avatar");
const createConfirmButton = document.querySelector("#create-confirm-btn");
const createBackButton = document.querySelector("#create-back-btn");

const ritualSkillGrid = document.querySelector("#ritual-skill-grid");
const ritualCoreTitle = document.querySelector("#ritual-core-title");
const ritualRerollStatus = document.querySelector("#ritual-reroll-status");
const ritualCoreTitleVisual = document.querySelector("#ritual-core-title-visual");
const ritualRerollStatusVisual = document.querySelector("#ritual-reroll-status-visual");
const ritualRerollButton = document.querySelector("#ritual-reroll-btn");
const ritualAcceptButton = document.querySelector("#ritual-accept-btn");
const ritualSearchInput = document.querySelector("#ritual-search-input");
const ritualBackButton = document.querySelector("#ritual-back-btn");
const ritualEquipButton = document.querySelector("#ritual-equip-btn");
const ritualSigilPreview = document.querySelector("#ritual-sigil-preview");
const ritualSlotIndicatorBar = document.querySelector("#ritual-slot-indicator-bar");
const ritualSlotBar = document.querySelector("#ritual-slot-bar");
const ritualDetailType = document.querySelector("#ritual-detail-type");
const ritualDetailCategory = document.querySelector("#ritual-detail-category");
const ritualDetailName = document.querySelector("#ritual-detail-name");
const ritualDetailTrigger = document.querySelector("#ritual-detail-trigger");
const ritualDetailEffect = document.querySelector("#ritual-detail-effect");
const ritualDetailScaling = document.querySelector("#ritual-detail-scaling");
const ritualDetailChaos = document.querySelector("#ritual-detail-chaos");

const setupSkillStack = document.querySelector("#setup-skill-stack");
const setupItemGrid = document.querySelector("#setup-item-grid");
const synergyList = document.querySelector("#synergy-list");
const setupConfirmButton = document.querySelector("#setup-confirm-btn");
const setupBackButton = document.querySelector("#setup-back-btn");

const startRunTitle = document.querySelector("#start-run-title");
const startRunName = document.querySelector("#start-run-name");
const startRunOrigin = document.querySelector("#start-run-origin");
const startRunSummary = document.querySelector("#start-run-summary");
const startRunSkillList = document.querySelector("#start-run-skill-list");
const startRunItemList = document.querySelector("#start-run-item-list");
const startRunBackButton = document.querySelector("#start-run-back-btn");
const enterWorldButton = document.querySelector("#enter-world-btn");

const playingHud = document.querySelector("#playing-hud");
const hudPortrait = document.querySelector("#hud-portrait");
const portraitButton = document.querySelector("#portrait-button");
const hudRewardBadge = document.querySelector("#hud-reward-badge");
const hudRewardCount = document.querySelector("#hud-reward-count");
const hudLevelRing = document.querySelector("#hud-level-ring");
const hudCoreStatButtons = Array.from(document.querySelectorAll("[data-core-stat-increase]"));
const inventoryToggleButton = document.querySelector("#inventory-toggle-button");
const hudName = document.querySelector("#hud-name");
const hudChapter = document.querySelector("#hud-chapter");
const hudLevel = document.querySelector("#hud-level");
const hudHealthFill = document.querySelector("#hud-health-fill");
const hudHealthValue = document.querySelector("#hud-health-value");
const hudHealthLabel = document.querySelector("#hud-health-label");
const hudArmorFill = document.querySelector("#hud-armor-fill");
const hudArmorValue = document.querySelector("#hud-armor-value");
const hudArmorLabel = document.querySelector("#hud-armor-label");
const hudManaFill = document.querySelector("#hud-mana-fill");
const hudManaValue = document.querySelector("#hud-mana-value");
const hudManaLabel = document.querySelector("#hud-mana-label");
const hudBuffIndicator = document.querySelector("#hud-buff-indicator");
const hudBuffStackCount = document.querySelector("#hud-buff-stack-count");
const hudDpsValue = document.querySelector("#hud-dps-value");
const hudMenuToggle = document.querySelector("#hud-menu-toggle");
const hudBackdrop = document.querySelector("#hud-backdrop");
const starterWeaponOverlay = document.querySelector("#starter-weapon-overlay");
const starterWeaponPanel = document.querySelector("#starter-weapon-panel");
const starterWeaponTitle = document.querySelector("#starter-weapon-title");
const starterWeaponReroll = document.querySelector("#starter-weapon-reroll");
const starterWeaponGrid = document.querySelector("#starter-weapon-grid");
const inventoryHoverCard = document.querySelector("#inventory-hover-card");
const inventoryHoverKind = document.querySelector("#inventory-hover-kind");
const inventoryHoverTitle = document.querySelector("#inventory-hover-title");
const inventoryHoverTags = document.querySelector("#inventory-hover-tags");
const inventoryHoverStats = document.querySelector("#inventory-hover-stats");
const inventoryHoverCopy = document.querySelector("#inventory-hover-copy");
const hudStatsPanel = document.querySelector("#hud-stats-panel");
const hudInventoryPanel = document.querySelector("#hud-inventory-panel");
const hudSettings = document.querySelector("#hud-settings");
const hudSaveButton = document.querySelector("#hud-save-btn");
const hudSaveStatus = document.querySelector("#hud-save-status");
const inventoryLayout = document.querySelector(".inventory-layout");
const inventoryPreviewSprite = document.querySelector("#inventory-preview-sprite");
const inventoryStatus = document.querySelector("#inventory-status");
const inventoryEquipped = document.querySelector("#inventory-equipped");
const inventoryGrid = document.querySelector("#inventory-grid");
const containerCard = document.querySelector("#container-card");
const containerStatus = document.querySelector("#container-status");
const containerGrid = document.querySelector("#container-grid");
const weaponSlotGrid = document.querySelector("#weapon-slot-grid");
const utilitySlotGrid = document.querySelector("#utility-slot-grid");
const masterVolumeInput = document.querySelector("#master-volume");
const effectsVolumeInput = document.querySelector("#effects-volume");
const musicVolumeInput = document.querySelector("#music-volume");
const graphicsQualitySelect = document.querySelector("#graphics-quality");
const masterVolumeValue = document.querySelector("#master-volume-value");
const effectsVolumeValue = document.querySelector("#effects-volume-value");
const musicVolumeValue = document.querySelector("#music-volume-value");
const graphicsQualityValue = document.querySelector("#graphics-quality-value");

const hudStatNodes = {
  level: document.querySelector("#hud-stat-level"),
  exp: document.querySelector("#hud-stat-exp"),
  statPoints: document.querySelector("#hud-stat-points"),
  vitality: document.querySelector("#hud-stat-vitality"),
  power: document.querySelector("#hud-stat-power"),
  guard: document.querySelector("#hud-stat-guard"),
  coreAgility: document.querySelector("#hud-stat-core-agility"),
  instinct: document.querySelector("#hud-stat-instinct"),
  attack: document.querySelector("#hud-stat-attack"),
  hp: document.querySelector("#hud-stat-hp"),
  mana: document.querySelector("#hud-stat-mana"),
  defense: document.querySelector("#hud-stat-defense"),
  agility: document.querySelector("#hud-stat-agility"),
  armor: document.querySelector("#hud-stat-armor"),
  hpRegen: document.querySelector("#hud-stat-hp-regen"),
  manaRegen: document.querySelector("#hud-stat-mana-regen"),
  range: document.querySelector("#hud-stat-range"),
};

const STORAGE_KEYS = {
  slots: "endless-skill-slots-v1",
  settings: "endless-skill-settings-v1",
  prep: "endless-skill-prep-v1",
};

const STASH_CAPACITY = 24;
const CONTAINER_CAPACITY = 120;
const ACTIVE_ARTIFACT_IDS = [
  12, 13, 14, 27, 29, 30, 32, 35, 36, 40, 43, 44, 47, 48, 55, 56, 57, 58,
  62, 63, 64, 65, 70, 71, 73, 77, 79, 80, 81, 83, 89, 91, 93, 96, 98, 99, 100,
];
const WEAPON_SLOT_CAPACITY = 2;
const UTILITY_SLOT_CAPACITY = 8;

function loadImageAsset(src) {
  const image = new Image();
  image.src = src;
  image.addEventListener("load", () => {
    if (page === "play") {
      draw();
    }
  });
  return image;
}

const playingAssets = {
  playerWalk: loadImageAsset("asset-use/playing-scene/player-walk-sheet.png"),
  sideTorch: loadImageAsset("asset-use/playing-scene/side-torch-1.png"),
  miniBox: loadImageAsset("asset-use/playing-scene/mini-box-1.png"),
};

function padNumber(value, size = 2) {
  return String(value).padStart(size, "0");
}

function resolveWeaponSpriteDrawOffset(weapon, drawSize) {
  const safeDrawSize = Math.max(0, Number(drawSize ?? 0) || 0);
  const drawOriginXScale = Number(
    weapon?.beamSkill?.drawOriginXScale
    ?? weapon?.melee?.drawOriginXScale
    ?? 0.28,
  );
  const drawOriginYScale = Number(
    weapon?.beamSkill?.drawOriginYScale
    ?? weapon?.melee?.drawOriginYScale
    ?? 0.72,
  );
  return {
    x: -safeDrawSize * drawOriginXScale,
    y: -safeDrawSize * drawOriginYScale,
  };
}

const MELEE_SWORD_PROFILE = {
  kind: "melee",
  family: "sword",
  arcRadians: Math.PI,
  rangeScale: 1.38,
  hitRangeScale: 1.35,
  rotationOffsetRadians: Math.PI * 0.25,
  drawOriginXScale: 0.28,
  drawOriginYScale: 0.72,
  tipLocalXScale: 0.34,
  tipLocalYScale: -0.46,
};

const MELEE_SWORD_VISUAL_OVERRIDES_BY_NUMERIC_ID = {
  12: {
    drawOriginXScale: 0.23,
    drawOriginYScale: 0.72,
    tipLocalXScale: 0.692,
    tipLocalYScale: -0.673,
  },
  7: { tipLocalXScale: 0.658, tipLocalYScale: -0.564 },
  9: { tipLocalXScale: 0.658, tipLocalYScale: -0.689 },
  11: { tipLocalXScale: 0.658, tipLocalYScale: -0.658 },
  15: { tipLocalXScale: 0.626, tipLocalYScale: -0.564 },
  16: { tipLocalXScale: 0.658, tipLocalYScale: -0.689 },
  17: { tipLocalXScale: 0.626, tipLocalYScale: -0.564 },
  19: { tipLocalXScale: 0.658, tipLocalYScale: -0.689 },
};

const ACTIVE_WEAPON_IDS = [7, 9, 11, 12, 15, 16, 17, 19];
const BEAM_PASSIVE_WEAPON_NUMERIC_ID = 12;
const BEAM_PASSIVE_ID = "prism-beam";
const BEAM_PASSIVE_TITLE = "Prism Beam";
const BEAM_PASSIVE_DESCRIPTION = "Equip Sword 12 in either hand, then hold Attack to channel a long piercing beam toward the cursor. Beam damage scales with weapon damage, total mana spent, and channel time, while mana cost compounds each second.";
const BEAM_PASSIVE_UTILITY_DESCRIPTION = "In utility slots, Sword 12 automatically channels Prism Beam from the flying blade whenever it locks onto a target, draining the wielder's mana while active.";
const TITAN_GROWTH_PASSIVE_WEAPON_NUMERIC_ID = 17;
const TITAN_GROWTH_PASSIVE_ID = "titan-edge";
const TITAN_GROWTH_PASSIVE_TITLE = "Titan Edge";
const TITAN_GROWTH_PASSIVE_DESCRIPTION = "Hold Attack with Sword 17 to feed mana into the blade. Each mana spent temporarily increases its size and reach, and the sword keeps swelling as long as the channel continues.";
const TITAN_GROWTH_PASSIVE_UTILITY_DESCRIPTION = "In utility slots, Sword 17 only keeps its flying sword behavior. Titan Edge activates only while the weapon is held in hand.";
const SPIN_PASSIVE_WEAPON_NUMERIC_ID = 17;
const SPIN_PASSIVE_ENABLED = false;
const SPIN_PASSIVE_ID = "twin-spin";
const SPIN_PASSIVE_TITLE = "Twin Spin";
const SPIN_PASSIVE_DESCRIPTION = "Equip Sword 17 in either hand while dual wielding, then hold Attack to spin around your body.";
const SPIN_PASSIVE_STACK_DESCRIPTION = "Every 1 mana spent grants 1 Speed stack per equipped Twin Spin source. Stacks fade after 5 seconds once the spin ends.";
const SPIN_PASSIVE_UTILITY_DESCRIPTION = "In utility slots, Sword 17 keeps its auto-thrust and spins two mirrored blades around itself while flying, bringing the total to three blades. This flight spin drains 3 mana per second from the wielder and builds local Speed stacks on that sword itself.";
const ARTIFACT_SKILL_RANGE_NUMERIC_ID = 12;
const ARTIFACT_SKILL_RANGE_PASSIVE_ID = "far-reach";
const ARTIFACT_SKILL_RANGE_PASSIVE_TITLE = "Far Reach";
const ARTIFACT_SKILL_RANGE_PASSIVE_DESCRIPTION = "While equipped in a utility slot, all attack and skill range is increased by 50%.";
const ARTIFACT_ACTION_SPEED_NUMERIC_ID = 13;
const ARTIFACT_ACTION_SPEED_PASSIVE_ID = "rapid-rhythm";
const ARTIFACT_ACTION_SPEED_PASSIVE_TITLE = "Rapid Rhythm";
const ARTIFACT_ACTION_SPEED_PASSIVE_DESCRIPTION = "While equipped in a utility slot, all attack and skill action speed is increased by 50%, but player movement speed is unchanged.";
const ARTIFACT_LIFESTEAL_NUMERIC_ID = 14;
const ARTIFACT_LIFESTEAL_PASSIVE_ID = "blood-siphon";
const ARTIFACT_LIFESTEAL_PASSIVE_TITLE = "Blood Siphon";
const ARTIFACT_LIFESTEAL_PASSIVE_DESCRIPTION = "While equipped in a utility slot, recover 2% of final damage dealt as health.";

function isWeaponPassiveActive(passive) {
  return Boolean(passive && passive.disabled !== true);
}

const EFFECT_SHEET_BASE = {
  frameSize: 100,
  columns: 6,
  rows: 6,
  frameCount: 36,
};

const EFFECT_CATALOG = {};

function createMeleeSwordWeapon(weaponId) {
  const image = loadImageAsset(`asset-use/weapons/sword-${padNumber(weaponId)}.png`);
  let passive = null;
  let legacySpinPassive = null;
  if (weaponId === BEAM_PASSIVE_WEAPON_NUMERIC_ID) {
    passive = {
      id: BEAM_PASSIVE_ID,
      title: BEAM_PASSIVE_TITLE,
      description: BEAM_PASSIVE_DESCRIPTION,
      utilityDescription: BEAM_PASSIVE_UTILITY_DESCRIPTION,
      effects: {
        hand: {
          enablesNativeTrigger: 1,
        },
      },
    };
  } else if (weaponId === TITAN_GROWTH_PASSIVE_WEAPON_NUMERIC_ID) {
    passive = {
      id: TITAN_GROWTH_PASSIVE_ID,
      title: TITAN_GROWTH_PASSIVE_TITLE,
      description: TITAN_GROWTH_PASSIVE_DESCRIPTION,
      utilityDescription: TITAN_GROWTH_PASSIVE_UTILITY_DESCRIPTION,
      effects: {
        hand: {
          enablesNativeTrigger: 1,
        },
      },
    };
  }
  if (weaponId === SPIN_PASSIVE_WEAPON_NUMERIC_ID) {
    legacySpinPassive = {
      id: SPIN_PASSIVE_ID,
      title: SPIN_PASSIVE_TITLE,
      description: SPIN_PASSIVE_DESCRIPTION,
      stackDescription: SPIN_PASSIVE_STACK_DESCRIPTION,
      utilityDescription: SPIN_PASSIVE_UTILITY_DESCRIPTION,
      disabled: !SPIN_PASSIVE_ENABLED,
      effects: {
        hand: {
          enablesNativeTrigger: 1,
          manaSpendStackMultiplier: 1,
        },
        utility: {
          manaSpendStackMultiplier: 1,
        },
      },
    };
  }
  const utilityCombat = {
    autoOrbitAttack: true,
    autoThrustAttack: true,
    damageMultiplier: 0.42,
    tipRadiusScale: 0.22,
    travelDistanceMultiplier: 30,
    passDistanceMultiplier: 5.4,
    flightSpeedScale: weaponId === BEAM_PASSIVE_WEAPON_NUMERIC_ID ? 22 : 110,
    hitIntervalSeconds: 0.12,
    cycleCooldownSeconds: 0.12,
  };

  if (weaponId === SPIN_PASSIVE_WEAPON_NUMERIC_ID) {
    utilityCombat.utilityTwinSpinEnabled = SPIN_PASSIVE_ENABLED;
    utilityCombat.utilityTwinSpinBladeCount = 3;
    utilityCombat.utilityTwinSpinDamageMultiplier = 0.34;
    utilityCombat.utilityTwinSpinRangeScale = 0.19;
    utilityCombat.utilityTwinSpinHitIntervalSeconds = 0.12;
    utilityCombat.utilityTwinSpinRateMultiplier = 1;
    utilityCombat.utilityTwinSpinVisualDistanceScale = 0.12;
    utilityCombat.utilityTwinSpinManaCostPerSecond = 3;
    utilityCombat.utilityTwinSpinLocalStackPerMana = 1;
    utilityCombat.utilityTwinSpinStackSpeedBonus = 0.08;
  }

  if (weaponId === BEAM_PASSIVE_WEAPON_NUMERIC_ID) {
    utilityCombat.utilityBeamEnabled = true;
    utilityCombat.utilityBeamFixedRangeTileMultiplier = 60;
    utilityCombat.utilityBeamChargeDurationSeconds = 0;
    utilityCombat.singlePassAttack = true;
  }

  const weapon = {
    id: `sword-${padNumber(weaponId)}`,
    label: `Sword ${weaponId}`,
    src: `asset-use/weapons/sword-${padNumber(weaponId)}.png`,
    image,
    damageBonus: 7 + (weaponId % 6) * 2,
    weaponType: "melee",
    passive,
    utilityCombat,
    melee: {
      ...MELEE_SWORD_PROFILE,
      ...(MELEE_SWORD_VISUAL_OVERRIDES_BY_NUMERIC_ID[weaponId] || {}),
    },
    legacySpinPassive,
  };

  if (weaponId === TITAN_GROWTH_PASSIVE_WEAPON_NUMERIC_ID) {
    weapon.titanGrowthSkill = {
      enabled: true,
      manaCostPerSecond: 6,
      rangeSizeBonusPerMana: 0.05,
      outwardDistanceRatio: 0.22,
      autoRepeatWhileHeld: true,
    };
  }

  if (weaponId === BEAM_PASSIVE_WEAPON_NUMERIC_ID) {
    weapon.beamSkill = {
      enabled: true,
      chargeDurationSeconds: 0.48,
      manaCostPerSecond: 6.5,
      manaCompoundMultiplierPerSecond: 1.18,
      hitIntervalSeconds: 0.13,
      fixedRangeTileMultiplier: 75,
      rangeScale: 2.65,
      widthScale: 0.3,
      visualCoreWidthScale: 0.14,
      visualWhiteHotWidthScale: 0.06,
      visualGlowWidthScale: 0.72,
      originOffsetScale: 0.42,
      endpointRadiusScale: 0.8,
      shimmerAmplitudeScale: 0,
      shimmerSpeed: 0.018,
      particleCount: 26,
      particleSpreadScale: 0.24,
      particleSizeScale: 0.11,
      particleShakeAmplitudeScale: 0.2,
      particleShakeSpeed: 0.032,
      particleFlowSpeed: 0.00095,
      chargeParticleCount: 34,
      chargeShellRadiusScale: 0.96,
      chargeOrbRadiusScale: 0.62,
      chargeParticleJitterScale: 0.18,
      weaponHighlightTintColor: "rgba(255, 210, 112, 1)",
      weaponHighlightOuterColor: "rgba(255, 194, 86, 0.98)",
      weaponHighlightCoreColor: "rgba(255, 242, 192, 1)",
      weaponHighlightOutlineScale: 0.036,
      weaponHighlightOuterBlurScale: 0.44,
      weaponHighlightCoreBlurScale: 0.18,
      drawOriginXScale: 0.278,
      drawOriginYScale: 0.69,
      utilityWeaponAuraTintColor: "rgba(255, 220, 132, 1)",
      utilityWeaponAuraGlowColor: "rgba(255, 210, 118, 0.98)",
      utilityWeaponAuraRadiusScale: 0.68,
      utilityWeaponAuraCoreRadiusScale: 0.32,
      utilityWeaponAuraTipRadiusScale: 0.28,
      utilityWeaponAuraParticleCount: 18,
      utilityWeaponAuraParticleOrbitScale: 0.64,
      utilityWeaponAuraParticleSizeScale: 0.11,
      utilityWeaponAuraSpriteAlpha: 0.58,
      utilityWeaponAuraGlowAlpha: 0.84,
      rotationOffsetRadians: Math.PI * 0.25,
      tipLocalXScale: 0.692,
      tipLocalYScale: -0.673,
    };
  }

  return weapon;
}

function buildWeaponCatalog() {
  return ACTIVE_WEAPON_IDS.map((weaponId) => createMeleeSwordWeapon(weaponId));
}

const weaponCatalog = buildWeaponCatalog();
const weaponCatalogById = new Map(weaponCatalog.map((weapon) => [weapon.id, weapon]));

function createArtifactItem(artifactId) {
  const assetId = padNumber(artifactId, 3);
  const src = `asset-use/artifacts/artifact-${assetId}.png`;
  let passive = null;
  if (artifactId === ARTIFACT_SKILL_RANGE_NUMERIC_ID) {
    passive = {
      id: ARTIFACT_SKILL_RANGE_PASSIVE_ID,
      title: ARTIFACT_SKILL_RANGE_PASSIVE_TITLE,
      description: ARTIFACT_SKILL_RANGE_PASSIVE_DESCRIPTION,
      effects: {
        equipped: {
          skillRangeMultiplierBonus: 0.5,
        },
      },
    };
  } else if (artifactId === ARTIFACT_ACTION_SPEED_NUMERIC_ID) {
    passive = {
      id: ARTIFACT_ACTION_SPEED_PASSIVE_ID,
      title: ARTIFACT_ACTION_SPEED_PASSIVE_TITLE,
      description: ARTIFACT_ACTION_SPEED_PASSIVE_DESCRIPTION,
      effects: {
        equipped: {
          actionSpeedMultiplierBonus: 0.5,
        },
      },
    };
  } else if (artifactId === ARTIFACT_LIFESTEAL_NUMERIC_ID) {
    passive = {
      id: ARTIFACT_LIFESTEAL_PASSIVE_ID,
      title: ARTIFACT_LIFESTEAL_PASSIVE_TITLE,
      description: ARTIFACT_LIFESTEAL_PASSIVE_DESCRIPTION,
      effects: {
        equipped: {
          lifeStealRatio: 0.02,
        },
      },
    };
  }
  return {
    id: `artifact-${assetId}`,
    label: `Artifact ${artifactId}`,
    src,
    image: loadImageAsset(src),
    itemType: "artifact",
    passive,
  };
}

function buildArtifactCatalog() {
  return ACTIVE_ARTIFACT_IDS.map((artifactId) => createArtifactItem(artifactId));
}

const artifactCatalog = buildArtifactCatalog();
const artifactCatalogById = new Map(artifactCatalog.map((artifact) => [artifact.id, artifact]));

const ORIGIN_CATALOG = [
  {
    id: "lost-wanderer",
    label: "Lost Wanderer",
    title: "Ashen Drifter",
    summary: "Walked into the ritual with no answers.",
  },
  {
    id: "broken-knight",
    label: "Broken Knight",
    title: "Oathbreaker Remnant",
    summary: "Armor shattered, but resolve still refuses to die.",
  },
  {
    id: "forbidden-scholar",
    label: "Forbidden Scholar",
    title: "Illicit Theorist",
    summary: "Keeps forbidden formulas close at hand.",
  },
];

const SKILL_POOL = [
  {
    id: "blood-echo",
    name: "Blood Echo",
    type: "Reactive",
    trigger: "When HP drops below 40%",
    effect: "Summon blood spirits that echo the last hit around you.",
    scaling: "Max HP",
    chaos: 30,
  },
  {
    id: "ward-pulse",
    name: "Ward Pulse",
    type: "Passive",
    trigger: "Every 6 seconds",
    effect: "Release a defensive wave that converts pressure into a brief barrier.",
    scaling: "Defense",
    chaos: 12,
  },
  {
    id: "mirror-debt",
    name: "Mirror Debt",
    type: "Chaos",
    trigger: "When a hit would overkill an enemy",
    effect: "Copy excess damage into a delayed echo around the next target.",
    scaling: "Attack",
    chaos: 42,
  },
  {
    id: "grief-bloom",
    name: "Grief Bloom",
    type: "Curse",
    trigger: "When mana is spent rapidly",
    effect: "Grow cursed thorns that trade recovery for violent retaliation.",
    scaling: "Mana",
    chaos: 37,
  },
  {
    id: "verdict-engine",
    name: "Verdict Engine",
    type: "Trigger",
    trigger: "After 3 successful hits on the same rule",
    effect: "Detonate a verdict sigil that punishes stationary enemies.",
    scaling: "Attack Speed",
    chaos: 18,
  },
  {
    id: "null-tithe",
    name: "Null Tithe",
    type: "Passive",
    trigger: "Whenever a curse is active",
    effect: "Convert a fraction of incoming danger into stored null charge.",
    scaling: "Armor",
    chaos: 24,
  },
  {
    id: "ash-sigil",
    name: "Ash Sigil",
    type: "Trigger",
    trigger: "When enemies cross your marked zone",
    effect: "Ignite an ash seal that erodes resistance over time.",
    scaling: "Skill Range",
    chaos: 21,
  },
  {
    id: "chaos-relay",
    name: "Chaos Relay",
    type: "Chaos",
    trigger: "On chain reaction",
    effect: "Pass one active modifier into a neighboring target and distort its result.",
    scaling: "Mana Regen",
    chaos: 46,
  },
];

const SKILL_BY_ID = new Map(SKILL_POOL.map((skill) => [skill.id, skill]));

const RITUAL_SKILL_CATEGORIES = {
  attack: {
    id: "attack",
    label: "Attack",
    color: "red",
    skillIds: ["mirror-debt", "verdict-engine", "ash-sigil"],
  },
  defense: {
    id: "defense",
    label: "Defense",
    color: "blue",
    skillIds: ["ward-pulse", "null-tithe"],
  },
  support: {
    id: "support",
    label: "Support",
    color: "green",
    skillIds: ["blood-echo", "grief-bloom", "chaos-relay"],
  },
};

const RITUAL_CATEGORY_BY_SKILL_ID = new Map(
  Object.values(RITUAL_SKILL_CATEGORIES)
    .flatMap((category) => category.skillIds.map((skillId) => [skillId, category])),
);

const STARTING_ITEM_POOL = [
  { id: "cursed-ring", name: "Cursed Ring", effect: "Amplifies curse-based reactions." },
  { id: "forbidden-tome", name: "Forbidden Tome", effect: "Improves arcane scaling and chaos conversion." },
  { id: "blood-charm", name: "Blood Charm", effect: "Turns lost life into offensive residue." },
  { id: "chaos-lantern", name: "Chaos Lantern", effect: "Feeds unstable interactions with extra spread." },
  { id: "jade-gyre", name: "Jade Gyre", effect: "Stabilizes reactive triggers into looping pulses." },
  { id: "black-salt", name: "Black Salt", effect: "Hardens defensive conversions into exploit windows." },
];

const ITEM_BY_ID = new Map(STARTING_ITEM_POOL.map((item) => [item.id, item]));

const SYNERGY_TABLE = [
  { skillId: "blood-echo", itemId: "blood-charm", result: "Spirit Explosion" },
  { skillId: "grief-bloom", itemId: "cursed-ring", result: "Bleeding Thorn Halo" },
  { skillId: "ward-pulse", itemId: "black-salt", result: "Salt Barrier Cascade" },
  { skillId: "mirror-debt", itemId: "forbidden-tome", result: "Recursive Debt Burst" },
  { skillId: "verdict-engine", itemId: "jade-gyre", result: "Closed Loop Sentence" },
  { skillId: "ash-sigil", itemId: "chaos-lantern", result: "Ashfire Relay" },
  { skillId: "chaos-relay", itemId: "chaos-lantern", result: "Lantern of Fractured Outcomes" },
  { skillId: "null-tithe", itemId: "forbidden-tome", result: "Archive Of The Null Tax" },
];

function makeEmptySlot(id) {
  return {
    id,
    occupied: false,
    name: "",
    title: "Empty Slot",
    buildType: "Create",
    origin: "lost-wanderer",
    chapter: 1,
    level: 1,
    risk: "Empty",
    health: "--",
    status: "empty",
    summary: `Slot ${id} ready.`,
    skills: [],
    gender: "female",
    saveData: null,
  };
}

function defaultSettings() {
  return {
    masterVolume: 72,
    effectsVolume: 78,
    musicVolume: 54,
    graphicsQuality: "normal",
  };
}

function normalizeGraphicsQuality(value) {
  return ["low", "normal", "high"].includes(value) ? value : "normal";
}

function graphicsQualityLabel(value) {
  return {
    low: "Low",
    normal: "Normal",
    high: "High",
  }[normalizeGraphicsQuality(value)];
}

function isHighGraphicsQuality() {
  return normalizeGraphicsQuality(state.settings?.graphicsQuality) === "high";
}

const state = {
  page,
  time: 0,
  selectedSlotIndex: 0,
  createDraft: {
    name: "",
    gender: "female",
    origin: "lost-wanderer",
  },
  ritualUi: {
    focusedSkillId: "",
    activeSlotIndex: 0,
    searchTerm: "",
    categoryFilter: "all",
  },
  input: {
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    bossBeamHeld: false,
    attackHeld: false,
    attackHoldTime: 0,
    attackHoldStartedAt: 0,
    pendingBeamTap: false,
    pendingTitanTap: false,
  },
  settings: defaultSettings(),
  prep: {},
  hud: {
    settingsOpen: false,
    statsOpen: false,
    inventoryOpen: false,
    starterWeaponOpen: false,
    rewardSelectionKind: null,
    rewardSelectionRerollsLeft: 0,
    pauseStartedAt: 0,
    starterWeaponOptions: [],
    inventoryHoverSnapshot: "",
    inventoryHoverTitle: "",
    activeContainerId: null,
    saveMessage: "No save created this run",
    dragItem: null,
    dragPreviewEl: null,
    dragSourceEl: null,
    dragDropTargetEl: null,
    dragSuppressUntil: 0,
    pendingInventoryClick: null,
    hudSnapshot: "",
    inventorySummarySnapshot: "",
    inventoryFullSnapshot: "",
  },
  game: null,
  slots: [1, 2, 3].map((id) => makeEmptySlot(id)),
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function currentSlot() {
  return state.slots[state.selectedSlotIndex];
}

function primaryActionLabel(slot) {
  return slot.occupied ? "Enter" : "Create";
}

function genderLabel(gender) {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return "Non-Binary";
}

function defaultSkills() {
  return ["Pulse Shard", "Guard Bloom", "Mark Relay"];
}

function originById(originId) {
  return ORIGIN_CATALOG.find((origin) => origin.id === originId) || ORIGIN_CATALOG[0];
}

function skillById(skillId) {
  return SKILL_BY_ID.get(skillId) || null;
}

function itemById(itemId) {
  return ITEM_BY_ID.get(itemId) || null;
}

function randomUniqueIds(collection, count) {
  const pool = [...collection];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, count).map((entry) => entry.id);
}

function defaultPrepForSlot(slot) {
  return {
    slotId: slot.id,
    originId: slot.origin || "lost-wanderer",
    ritualSkillIds: randomUniqueIds(SKILL_POOL, 3),
    rerollsLeft: 1,
    selectedItemIds: [],
    ritualAccepted: false,
    buildSealed: false,
  };
}

function normalizePrepEntry(prep, slot) {
  const fallback = defaultPrepForSlot(slot);
  if (!prep || typeof prep !== "object") {
    return fallback;
  }

  const ritualSkillIds = Array.isArray(prep.ritualSkillIds)
    ? prep.ritualSkillIds.filter((skillId) => SKILL_BY_ID.has(skillId)).slice(0, 3)
    : fallback.ritualSkillIds;
  while (ritualSkillIds.length < 3) {
    const extra = randomUniqueIds(SKILL_POOL.filter((skill) => !ritualSkillIds.includes(skill.id)), 1)[0];
    if (!extra) break;
    ritualSkillIds.push(extra);
  }

  return {
    slotId: slot.id,
    originId: typeof prep.originId === "string" ? prep.originId : fallback.originId,
    ritualSkillIds,
    rerollsLeft: clamp(Number(prep.rerollsLeft ?? fallback.rerollsLeft), 0, 1),
    selectedItemIds: Array.isArray(prep.selectedItemIds)
      ? prep.selectedItemIds.filter((itemId) => ITEM_BY_ID.has(itemId)).slice(0, 2)
      : [],
    ritualAccepted: Boolean(prep.ritualAccepted),
    buildSealed: Boolean(prep.buildSealed),
  };
}

function savePrep() {
  try {
    window.localStorage.setItem(STORAGE_KEYS.prep, JSON.stringify(state.prep));
  } catch (error) {
    console.warn("Unable to persist prep", error);
  }
}

function loadPrep() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.prep);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    state.prep = parsed;
  } catch (error) {
    console.warn("Unable to load prep", error);
  }
}

function ensurePrepForSlot(slot = currentSlot()) {
  const prepKey = String(slot.id);
  state.prep[prepKey] = normalizePrepEntry(state.prep[prepKey], slot);
  return state.prep[prepKey];
}

function clearPrepForSlot(slot = currentSlot()) {
  delete state.prep[String(slot.id)];
  savePrep();
}

function prepSkills(prep = ensurePrepForSlot()) {
  return prep.ritualSkillIds.map((skillId) => skillById(skillId)).filter(Boolean);
}

function ritualCategoryForSkill(skillId) {
  return RITUAL_CATEGORY_BY_SKILL_ID.get(skillId) || {
    id: "support",
    label: "Support",
    color: "green",
  };
}

function prepItems(prep = ensurePrepForSlot()) {
  return prep.selectedItemIds.map((itemId) => itemById(itemId)).filter(Boolean);
}

function buildTypeFromPrep(prep = ensurePrepForSlot()) {
  const skills = prepSkills(prep);
  if (skills.some((skill) => skill.type === "Chaos")) return "Chaos Mathematics";
  if (skills.some((skill) => skill.type === "Curse")) return "Cursed Exploit";
  if (skills.some((skill) => skill.type === "Reactive")) return "Reactive Engine";
  return "Arcane Theory";
}

function getWeaponById(weaponId) {
  return weaponCatalogById.get(weaponId) || null;
}

function getArtifactById(artifactId) {
  return artifactCatalogById.get(artifactId) || null;
}

function getInventoryItemById(itemId) {
  return getWeaponById(itemId) || getArtifactById(itemId) || null;
}

function isWeaponItemId(itemId) {
  return Boolean(getWeaponById(itemId));
}

function isArtifactItemId(itemId) {
  return Boolean(getArtifactById(itemId));
}

function createEffectInstance(effectId, worldX, worldY, angle = 0, overrides = {}) {
  const definition = EFFECT_CATALOG[effectId];
  if (!definition) {
    return null;
  }

  return {
    kind: effectId,
    worldX,
    worldY,
    angle,
    timer: overrides.duration ?? definition.duration,
    duration: overrides.duration ?? definition.duration,
    frameSize: definition.frameSize,
    columns: definition.columns,
    rows: definition.rows,
    frameCount: definition.frameCount,
    assetKey: definition.assetKey,
    sizeScale: definition.sizeScale,
    blend: definition.blend,
    brightness: definition.brightness,
    saturate: definition.saturate,
    rotationOffset: definition.rotationOffset,
  };
}

function hasOpenHudOverlay() {
  return Boolean(
    state.hud.settingsOpen
    || state.hud.statsOpen
    || state.hud.inventoryOpen
    || state.hud.starterWeaponOpen
  );
}

function isPlaySimulationPaused() {
  return page === "play" && hasOpenHudOverlay();
}

function offsetPlayPauseSensitiveTimers(pausedMs) {
  if (!state.game || !Number.isFinite(Number(pausedMs)) || pausedMs <= 0) {
    return;
  }

  if ((state.input.attackHoldStartedAt ?? 0) > 0) {
    state.input.attackHoldStartedAt += pausedMs;
  }

  const player = state.game.player;
  if (player?.physicalBoostExpiresAt > 0) {
    player.physicalBoostExpiresAt += pausedMs;
  }

  const utilityAttackStates = player?.utilityWeaponAttackStates || {};
  Object.values(utilityAttackStates).forEach((attackState) => {
    if ((attackState?.utilityTwinSpinExpiresAt ?? 0) > 0) {
      attackState.utilityTwinSpinExpiresAt += pausedMs;
    }
  });

  const damageEvents = state.game.combatMetrics?.damageEvents || [];
  damageEvents.forEach((event) => {
    if ((event?.at ?? 0) > 0) {
      event.at += pausedMs;
    }
  });
}

function syncPlayOverlayPauseState() {
  if (page !== "play") {
    state.hud.pauseStartedAt = 0;
    return;
  }

  if (hasOpenHudOverlay()) {
    if ((state.hud.pauseStartedAt ?? 0) <= 0) {
      state.hud.pauseStartedAt = performance.now();
      state.input.pressed.clear();
    }
    return;
  }

  if ((state.hud.pauseStartedAt ?? 0) > 0) {
    const pausedMs = Math.max(0, performance.now() - state.hud.pauseStartedAt);
    offsetPlayPauseSensitiveTimers(pausedMs);
    state.hud.pauseStartedAt = 0;
  }
}

function saveSettings() {
  try {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  } catch (error) {
    console.warn("Unable to persist settings", error);
  }
}

function saveSlots() {
  try {
    window.localStorage.setItem(STORAGE_KEYS.slots, JSON.stringify(state.slots));
  } catch (error) {
    console.warn("Unable to persist slots", error);
  }
}

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.settings = {
        masterVolume: clamp(Number(parsed.masterVolume ?? state.settings.masterVolume), 0, 100),
        effectsVolume: clamp(Number(parsed.effectsVolume ?? state.settings.effectsVolume), 0, 100),
        musicVolume: clamp(Number(parsed.musicVolume ?? state.settings.musicVolume), 0, 100),
        graphicsQuality: normalizeGraphicsQuality(parsed.graphicsQuality ?? state.settings.graphicsQuality),
      };
    }
  } catch (error) {
    console.warn("Unable to load settings", error);
  }
}

function loadSlots() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.slots);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    state.slots = [1, 2, 3].map((id, index) => {
      const base = makeEmptySlot(id);
      const source = parsed[index];
      if (!source || typeof source !== "object") return base;

      return {
        ...base,
        occupied: Boolean(source.occupied),
        name: typeof source.name === "string" ? source.name : base.name,
        title: typeof source.title === "string" ? source.title : base.title,
        buildType: typeof source.buildType === "string" ? source.buildType : base.buildType,
        origin: typeof source.origin === "string" ? source.origin : base.origin,
        chapter: Math.max(1, Number(source.chapter ?? base.chapter)),
        level: Math.max(1, Number(source.level ?? base.level)),
        risk: typeof source.risk === "string" ? source.risk : base.risk,
        health: typeof source.health === "string" ? source.health : base.health,
        status: typeof source.status === "string" ? source.status : base.status,
        summary: typeof source.summary === "string" ? source.summary : base.summary,
        skills: Array.isArray(source.skills) ? source.skills.slice(0, 3) : base.skills,
        gender: typeof source.gender === "string" ? source.gender : base.gender,
        saveData: source.saveData && typeof source.saveData === "object" ? source.saveData : null,
      };
    });
  } catch (error) {
    console.warn("Unable to load slots", error);
  }
}

function loadPersistedState() {
  loadSettings();
  loadSlots();
  loadPrep();
}

function readSlotIndexFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = Number(params.get("slot"));
  if (Number.isFinite(fromUrl) && fromUrl >= 1 && fromUrl <= state.slots.length) {
    return fromUrl - 1;
  }
  return 0;
}

function syncSlotUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("slot", String(state.selectedSlotIndex + 1));
  window.history.replaceState({}, "", url);
}

function goToPage(targetPage, slotIndex = state.selectedSlotIndex) {
  const url = `${targetPage}.html?slot=${slotIndex + 1}`;
  window.location.href = url;
}

function syncSettingsControls() {
  if (!masterVolumeInput || !effectsVolumeInput || !musicVolumeInput) {
    return;
  }

  masterVolumeInput.value = String(state.settings.masterVolume);
  effectsVolumeInput.value = String(state.settings.effectsVolume);
  musicVolumeInput.value = String(state.settings.musicVolume);
  masterVolumeValue.textContent = `${state.settings.masterVolume}%`;
  effectsVolumeValue.textContent = `${state.settings.effectsVolume}%`;
  musicVolumeValue.textContent = `${state.settings.musicVolume}%`;
  if (graphicsQualitySelect) {
    graphicsQualitySelect.value = normalizeGraphicsQuality(state.settings.graphicsQuality);
  }
  if (graphicsQualityValue) {
    graphicsQualityValue.textContent = graphicsQualityLabel(state.settings.graphicsQuality);
  }
}

function setHudSaveMessage(message) {
  state.hud.saveMessage = message;
  if (hudSaveStatus) {
    hudSaveStatus.textContent = message;
  }
}

function syncHudOverlays() {
  if (!playingHud) {
    return;
  }

  const hasOpenOverlay = state.hud.settingsOpen || state.hud.statsOpen || state.hud.inventoryOpen;
  playingHud.classList.toggle("is-settings-open", hasOpenOverlay);

  if (hudMenuToggle) {
    hudMenuToggle.setAttribute("aria-expanded", String(state.hud.settingsOpen));
  }

  if (portraitButton) {
    portraitButton.setAttribute("aria-expanded", String(state.hud.statsOpen));
  }

  if (inventoryToggleButton) {
    inventoryToggleButton.setAttribute("aria-expanded", String(state.hud.inventoryOpen));
  }

  if (hudInventoryPanel) {
    hudInventoryPanel.hidden = !state.hud.inventoryOpen;
  }

  if (hudSettings) {
    hudSettings.hidden = !state.hud.settingsOpen;
  }

  if (hudStatsPanel) {
    hudStatsPanel.hidden = !state.hud.statsOpen;
  }

  if (hudBackdrop) {
    hudBackdrop.hidden = !hasOpenOverlay;
  }

  syncPlayOverlayPauseState();
}

function toggleHudSettings(forceValue) {
  if (!playingHud || !hudMenuToggle || !hudSettings) {
    return;
  }
  const nextValue = typeof forceValue === "boolean" ? forceValue : !state.hud.settingsOpen;
  state.hud.settingsOpen = nextValue;
  if (nextValue) {
    state.hud.statsOpen = false;
    state.hud.inventoryOpen = false;
    syncSettingsControls();
  }
  syncHudOverlays();
}

function toggleHudStats(forceValue) {
  if (!playingHud || !portraitButton || !hudStatsPanel) {
    return;
  }
  const nextValue = typeof forceValue === "boolean" ? forceValue : !state.hud.statsOpen;
  state.hud.statsOpen = nextValue;
  if (nextValue) {
    state.hud.settingsOpen = false;
    state.hud.inventoryOpen = false;
  }
  syncHudOverlays();
}

function toggleHudInventory(forceValue) {
  if (!playingHud || !hudInventoryPanel) {
    return;
  }
  const nextValue = typeof forceValue === "boolean" ? forceValue : !state.hud.inventoryOpen;
  state.hud.inventoryOpen = nextValue;
  if (!nextValue) {
    clearInventoryDragState();
    if (typeof clearInventoryHoverCard === "function") {
      clearInventoryHoverCard();
    }
    state.hud.activeContainerId = null;
  }
  if (nextValue) {
    state.hud.settingsOpen = false;
    state.hud.statsOpen = false;
    renderInventoryPanel(true);
  }
  syncHudOverlays();
}

function currentArenaBounds() {
  const width = canvas.clientWidth || 1280;
  const height = canvas.clientHeight || 720;
  return {
    width,
    height,
    worldBounded: false,
    inset: 0,
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
  };
}

function buildSceneLayout(arena) {
  const baseTileSize = Math.max(68, Math.min(arena.width, arena.height) * 0.085);
  const tileSize = Math.max(34, baseTileSize * 0.5);
  return {
    tileSize,
    torchCellSpan: 6,
    torchChance: 0.34,
    torchSpriteSize: tileSize * 0.62,
  };
}

function getPlayerCombatAnchor(player = state.game?.player, scene = state.game?.scene) {
  const anchorOffsetY = (scene?.tileSize ?? 0) * 0.12;
  return {
    worldX: player?.worldX ?? 0,
    worldY: (player?.worldY ?? 0) + anchorOffsetY,
    screenX: player?.screenX ?? 0,
    screenY: (player?.screenY ?? 0) + anchorOffsetY,
  };
}

function syncPlayerFacing() {
  if (!state.game) return;
  const { player } = state.game;
  const combatAnchor = getPlayerCombatAnchor(player, state.game.scene);
  player.facing = Math.atan2(
    state.input.mouseY - combatAnchor.screenY,
    state.input.mouseX - combatAnchor.screenX,
  );
}

function renderMenu() {
  if (!slotList) return;
  slotList.innerHTML = "";

  state.slots.forEach((slot, index) => {
    const subtitle = slot.occupied ? slot.title : "Empty Slot";
    const slotLabel = slot.occupied ? slot.name : `Slot ${slot.id}`;
    const riskLabel = slot.occupied ? slot.risk : "Empty";
    const button = document.createElement("button");
    button.className = "archive-slot-button";
    button.type = "button";
    button.dataset.slotIndex = String(index);
    button.classList.toggle("is-selected", index === state.selectedSlotIndex);

    const badgeClass = slot.occupied
      ? slot.status === "critical" ? "danger" : slot.status === "stable" ? "safe" : ""
      : "";

    button.innerHTML = `
      <div class="archive-slot-main">
        <div class="slot-portrait">
          <div class="slot-portrait-sprite" aria-hidden="true"></div>
        </div>
        <div class="archive-slot-copy">
          <span class="archive-slot-name">${slotLabel}</span>
          <span class="archive-slot-title">${subtitle}</span>
          <span class="archive-slot-build">${slot.occupied ? slot.buildType : "Create"}</span>
        </div>
        <div class="archive-slot-side">
          <span class="slot-badge ${badgeClass}">${riskLabel}</span>
          <span class="archive-slot-meta">${slot.occupied ? `Depth ${slot.chapter} · Lv ${slot.level}` : `Slot ${slot.id}`}</span>
        </div>
      </div>
    `;

    button.addEventListener("click", () => {
      state.selectedSlotIndex = index;
      syncSlotUrl();
      renderMenu();
      renderSelection();
    });

    slotList.appendChild(button);
  });
}

function renderSelection() {
  if (!selectionTitle || !selectionSummary || !startButton) {
    return;
  }

  const slot = currentSlot();
  if (selectionStatus) {
    selectionStatus.textContent = slot.occupied ? "Selected" : `Slot ${slot.id}`;
  }
  selectionTitle.textContent = slot.occupied ? `${slot.name}` : "empty slot";
  selectionSummary.textContent = slot.occupied
    ? `${slot.title} · ${slot.buildType}`
    : `slot ${slot.id}`;
  if (selectionNote) {
    selectionNote.textContent = "";
  }
  if (selectionMeta) {
    selectionMeta.innerHTML = "";
    const metaItems = slot.occupied
      ? [slot.buildType, `Chapter ${slot.chapter}`, `Lv ${slot.level}`, slot.risk]
      : [`Slot ${slot.id}`, "Ready"];
    metaItems.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "select-meta-pill";
      chip.textContent = item;
      selectionMeta.appendChild(chip);
    });
  }
  startButton.textContent = slot.occupied ? "Enter" : "Create";
  if (deleteButton) {
    deleteButton.hidden = !slot.occupied;
  }
  if (deleteModalCopy) {
    deleteModalCopy.textContent = slot.occupied
      ? `Erase ${slot.name}?`
      : "";
  }
}

function toggleDeleteModal(force) {
  if (!deleteModal) return;
  const nextHidden = typeof force === "boolean" ? !force : !deleteModal.hidden;
  deleteModal.hidden = nextHidden;
}

function deleteCurrentSlot() {
  const slot = currentSlot();
  if (!slot.occupied) return;
  state.slots[state.selectedSlotIndex] = makeEmptySlot(slot.id);
  clearPrepForSlot(slot);
  saveSlots();
  renderMenu();
  renderSelection();
  toggleDeleteModal(false);
}

function renderCreateDraft() {
  if (!createPreviewName || !createPreviewCopy || !sheetAvatar) return;
  const draftName = state.createDraft.name.trim() || "New Survivor";
  const origin = originById(state.createDraft.origin);
  createPreviewName.textContent = draftName;
  createPreviewCopy.textContent = `${origin.label} · ${origin.title}`;
  sheetAvatar.dataset.gender = state.createDraft.gender;
  genderButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.gender === state.createDraft.gender);
  });
  originButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.origin === state.createDraft.origin);
  });
}

function controlsConfigForPage() {
  if (page === "play") {
    return {
      copy: "",
      items: [],
    };
  }

  if (page === "main") {
    return {
      copy: "Start a new run, open settings, or inspect the locked features.",
      items: [
        "Press <kbd>Enter</kbd> on <kbd>New Game</kbd>",
        "Click <kbd>Multiplayer</kbd> to check the feature status",
        "Click <kbd>Settings</kbd> to adjust audio",
        "Press <kbd>F</kbd> to toggle fullscreen",
      ],
    };
  }

  if (page === "create") {
    return {
      copy: "",
      items: [],
    };
  }

  if (page === "ritual") {
    return {
      copy: "",
      items: [],
    };
  }

  if (page === "setup") {
    return {
      copy: "This page is no longer used. You will be returned to Ritual.",
      items: [
        "Redirect happens automatically",
        "<kbd>F</kbd> Toggle fullscreen",
      ],
    };
  }

  if (page === "start-run") {
    return {
      copy: "This page is no longer used. You will be returned to Ritual.",
      items: [
        "Redirect happens automatically",
        "<kbd>F</kbd> Toggle fullscreen",
      ],
    };
  }

  if (page === "briefing") {
    return {
      copy: "This page is no longer used. You will be returned to the live flow.",
      items: [
        "Redirect happens automatically",
        "<kbd>F</kbd> Toggle fullscreen",
      ],
    };
  }

  return {
    copy: "",
    items: [],
  };
}

function renderControls() {
  if (!controlsCopy || !controlsList) return;
  const config = controlsConfigForPage();
  controlsCopy.textContent = config.copy;
  controlsList.innerHTML = config.items.map((item) => `<li>${item}</li>`).join("");
}

function cycleSlot(direction = 1) {
  state.selectedSlotIndex =
    (state.selectedSlotIndex + direction + state.slots.length) % state.slots.length;
  syncSlotUrl();
  renderMenu();
  renderSelection();
}

function createCharacter() {
  const slot = currentSlot();
  const origin = originById(state.createDraft.origin);
  const finalName = state.createDraft.name.trim() || `Survivor ${slot.id}`;
  slot.occupied = true;
  slot.name = finalName;
  slot.title = origin.title;
  slot.buildType = "Unstable Thesis";
  slot.origin = origin.id;
  slot.chapter = 1;
  slot.level = 1;
  slot.risk = "Ready";
  slot.health = "100%";
  slot.status = "stable";
  slot.summary = origin.summary;
  slot.skills = defaultSkills();
  slot.gender = state.createDraft.gender;
  slot.saveData = null;
  clearPrepForSlot(slot);
  ensurePrepForSlot(slot).originId = origin.id;
  savePrep();
  saveSlots();
}

function rerollRitualSkills() {
  const prep = ensurePrepForSlot();
  if (prep.rerollsLeft <= 0) {
    return;
  }
  prep.ritualSkillIds = randomUniqueIds(SKILL_POOL, 3);
  prep.rerollsLeft = 0;
  prep.ritualAccepted = false;
  savePrep();
}

function setFocusedRitualSkill(skillId) {
  if (!SKILL_BY_ID.has(skillId)) return;
  state.ritualUi.focusedSkillId = skillId;
}

function filteredRitualSkills() {
  const search = state.ritualUi.searchTerm.trim().toLowerCase();

  return SKILL_POOL.filter((skill) => {
    if (!search) {
      return true;
    }
    return [
      skill.name,
      skill.type,
      skill.trigger,
      skill.effect,
      skill.scaling,
    ].join(" ").toLowerCase().includes(search);
  });
}

function assignRitualSkillToSlot(skillId, slotIndex = state.ritualUi.activeSlotIndex) {
  const prep = ensurePrepForSlot();
  if (!SKILL_BY_ID.has(skillId)) return;
  if (slotIndex < 0 || slotIndex > 2) return;
  prep.ritualSkillIds[slotIndex] = skillId;
  prep.ritualAccepted = false;
  state.ritualUi.activeSlotIndex = slotIndex;
  state.ritualUi.focusedSkillId = skillId;
  savePrep();
}

function renderRitualPage() {
  if (!ritualSkillGrid || !ritualCoreTitle || !ritualAcceptButton || !ritualSlotBar) {
    return;
  }
  const slot = currentSlot();
  const prep = ensurePrepForSlot(slot);
  const selectedSkills = prepSkills(prep);
  const fallbackFocusedSkillId = prep.ritualSkillIds[state.ritualUi.activeSlotIndex] || prep.ritualSkillIds[0];
  const focusedSkill = skillById(state.ritualUi.focusedSkillId) || skillById(fallbackFocusedSkillId) || selectedSkills[0] || SKILL_POOL[0];
  const focusedCategory = ritualCategoryForSkill(focusedSkill?.id);
  const visibleSkills = filteredRitualSkills();

  ritualCoreTitle.textContent = focusedSkill?.name || "choose your skill";
  if (ritualRerollStatus) {
    ritualRerollStatus.textContent = `slot ${state.ritualUi.activeSlotIndex + 1}`;
  }
  if (ritualCoreTitleVisual) {
    ritualCoreTitleVisual.textContent = ritualCoreTitle.textContent;
  }
  if (ritualRerollStatusVisual) {
    ritualRerollStatusVisual.textContent = ritualRerollStatus?.textContent || "";
  }

  if (ritualDetailType) {
    ritualDetailType.textContent = focusedSkill?.type || "-";
  }
  if (ritualDetailCategory) {
    ritualDetailCategory.textContent = focusedCategory.label;
    ritualDetailCategory.dataset.color = focusedCategory.color;
  }
  if (ritualSigilPreview) {
    ritualSigilPreview.dataset.color = focusedCategory.color;
    ritualSigilPreview.setAttribute("aria-label", `Category ${focusedCategory.label}`);
  }
  if (ritualDetailName) {
    ritualDetailName.textContent = focusedSkill?.name || "-";
  }
  if (ritualDetailTrigger) {
    ritualDetailTrigger.textContent = focusedSkill?.trigger || "-";
  }
  if (ritualDetailEffect) {
    ritualDetailEffect.textContent = focusedSkill?.effect || "-";
  }
  if (ritualDetailScaling) {
    ritualDetailScaling.textContent = focusedSkill?.scaling || "-";
  }
  if (ritualDetailChaos) {
    ritualDetailChaos.textContent = focusedSkill ? `${focusedSkill.chaos}%` : "-";
  }
  if (ritualSearchInput && ritualSearchInput.value !== state.ritualUi.searchTerm) {
    ritualSearchInput.value = state.ritualUi.searchTerm;
  }

  if (ritualSlotIndicatorBar) {
    ritualSlotIndicatorBar.innerHTML = prep.ritualSkillIds.map((skillId, index) => {
      const category = ritualCategoryForSkill(skillId);
      const skill = skillById(skillId);
      const isActive = index === state.ritualUi.activeSlotIndex;
      return `
        <button
          class="ritual-filter-button${isActive ? " is-active" : ""}"
          type="button"
          data-slot-index="${index}"
          data-color="${category.color}"
          aria-label="Slot ${index + 1} ${skill?.name || "Empty"}"
          title="Slot ${index + 1}: ${skill?.name || "Empty"}"
        >
          <span class="ritual-filter-fill" aria-hidden="true"></span>
        </button>
      `;
    }).join("");
  }

  ritualSkillGrid.innerHTML = visibleSkills.length
    ? visibleSkills.map((skill) => {
      const category = ritualCategoryForSkill(skill.id);
      const isFocused = focusedSkill?.id === skill.id;
      const isSelected = prep.ritualSkillIds.includes(skill.id);
      return `
        <button
          class="ritual-library-skill${isFocused ? " is-focused" : ""}${isSelected ? " is-selected" : ""}"
          type="button"
          data-skill-id="${skill.id}"
          data-color="${category.color}"
        >
          <span class="ritual-library-sigil" data-color="${category.color}" aria-hidden="true"></span>
          <span class="ritual-library-label">${skill.name}</span>
          <span class="ritual-library-tag">${category.label}</span>
        </button>
      `;
    }).join("")
    : '<div class="ritual-library-empty">No match</div>';

  ritualSlotBar.innerHTML = prep.ritualSkillIds.map((skillId, index) => {
    const skill = skillById(skillId);
    const category = ritualCategoryForSkill(skillId);
    const activeClass = index === state.ritualUi.activeSlotIndex ? " is-active" : "";
    return `
      <button
        class="ritual-picked-slot${activeClass}"
        type="button"
        data-slot-index="${index}"
        data-color="${category.color}"
      >
        <span class="ritual-picked-label">Slot ${index + 1}</span>
        <strong>${skill?.name || "Empty"}</strong>
        <span>${category.label}</span>
      </button>
    `;
  }).join("");
}

function toggleSetupItem(itemId) {
  const prep = ensurePrepForSlot();
  if (prep.selectedItemIds.includes(itemId)) {
    prep.selectedItemIds = prep.selectedItemIds.filter((selectedId) => selectedId !== itemId);
  } else if (prep.selectedItemIds.length < 2) {
    prep.selectedItemIds.push(itemId);
  } else {
    prep.selectedItemIds = [prep.selectedItemIds[1], itemId];
  }
  prep.buildSealed = false;
  savePrep();
}

function currentSynergies(prep = ensurePrepForSlot()) {
  return SYNERGY_TABLE.filter((entry) => (
    prep.ritualSkillIds.includes(entry.skillId) && prep.selectedItemIds.includes(entry.itemId)
  ));
}

function renderSetupPage() {
  if (!setupSkillStack || !setupItemGrid || !synergyList || !setupConfirmButton) {
    return;
  }
  const prep = ensurePrepForSlot();
  const skills = prepSkills(prep);
  const synergies = currentSynergies(prep);

  setupSkillStack.innerHTML = skills
    .map((skill) => `
      <article class="build-skill-card">
        <span class="ritual-card-type">${skill.type}</span>
        <h3>${skill.name}</h3>
        <p>${skill.trigger}</p>
      </article>
    `)
    .join("");

  setupItemGrid.innerHTML = STARTING_ITEM_POOL
    .map((item) => `
      <button class="setup-item-card ${prep.selectedItemIds.includes(item.id) ? "is-selected" : ""}" type="button" data-item-id="${item.id}">
        <strong>${item.name}</strong>
        <p>${item.effect}</p>
      </button>
    `)
    .join("");

  synergyList.innerHTML = synergies.length
    ? synergies.map((entry) => {
        const skill = skillById(entry.skillId);
        const item = itemById(entry.itemId);
        return `
          <article class="synergy-link">
            <span class="synergy-node">${skill.name}</span>
            <span class="synergy-connector"></span>
            <span class="synergy-node">${item.name}</span>
            <span class="synergy-arrow">=</span>
            <strong class="synergy-result">${entry.result}</strong>
          </article>
        `;
      }).join("")
    : `<p class="synergy-empty">Choose a relic to open a build path and see which rules are starting to break.</p>`;

  setupConfirmButton.disabled = prep.selectedItemIds.length === 0;
}

function renderStartRunPage() {
  if (!startRunTitle || !startRunName || !startRunOrigin || !startRunSummary || !startRunSkillList || !startRunItemList) {
    return;
  }

  const slot = currentSlot();
  const prep = ensurePrepForSlot(slot);
  const origin = originById(prep.originId || slot.origin);
  const skills = prepSkills(prep);
  const items = prepItems(prep);

  startRunTitle.textContent = `The ritual is sealed for ${slot.name}`;
  startRunName.textContent = `${slot.name} · ${slot.title}`;
  startRunOrigin.textContent = `${origin.label} · Build Type: ${slot.buildType}`;
  startRunSummary.textContent = slot.summary;

  startRunSkillList.innerHTML = skills
    .map((skill) => `<span class="sealed-pill">${skill.name}</span>`)
    .join("");
  startRunItemList.innerHTML = items.length
    ? items.map((item) => `<span class="sealed-pill sealed-pill-item">${item.name}</span>`).join("")
    : `<span class="sealed-pill sealed-pill-empty">No opening relic chosen</span>`;
}

function serializeGameSnapshot(game) {
  const { player } = game;
  const snapshotNow = (page === "play" && hasOpenHudOverlay() && (state.hud.pauseStartedAt ?? 0) > 0)
    ? state.hud.pauseStartedAt
    : performance.now();
  const boostDecayRemaining = Math.max(0, ((player.physicalBoostExpiresAt ?? 0) - snapshotNow) / 1000);
  return {
    chapter: game.chapter,
    elapsed: Number(game.elapsed.toFixed(2)),
    runStarted: Boolean(game.runStarted),
    monsterSpawnProgress: Number(Number(game.monsterSpawnProgress ?? 0).toFixed(4)),
    startZoneOriginX: Number(game.startZone?.originX ?? player.worldX ?? 0),
    startZoneOriginY: Number(game.startZone?.originY ?? player.worldY ?? 0),
    startZoneRadius: Number(game.startZone?.radius ?? 0),
    worldX: Number(player.worldX.toFixed(2)),
    worldY: Number(player.worldY.toFixed(2)),
    playerStats: {
      level: player.level,
      experience: experienceToString(player.experience),
      experienceToNextLevel: experienceToString(player.experienceToNextLevel),
      statPoints: Math.max(0, Math.floor(Number(player.statPoints ?? 0))),
      coreStats: player.coreStats ? { ...player.coreStats } : createPlayerCoreStats(),
      attack: player.attack,
      maxHealth: player.maxHealth,
      health: Number(player.health.toFixed(1)),
      maxMana: player.maxMana,
      mana: Number(player.mana.toFixed(1)),
      defense: player.defense,
      baseAgility: player.baseAgility,
      physicalBoostStacks: player.physicalBoostStacks ?? 0,
      spinManaProgress: Number((player.spinManaProgress ?? 0).toFixed(4)),
      physicalBoostDecayRemaining: Number(boostDecayRemaining.toFixed(3)),
      agility: player.agility,
      attackSpeed: Number(player.attackSpeed.toFixed(2)),
      actionSpeed: Number((player.actionSpeed ?? player.attackSpeed).toFixed(2)),
      maxArmor: player.maxArmor,
      armor: player.armor,
      healthRegen: Number(player.healthRegen),
      manaRegen: Number(player.manaRegen),
      skillRange: Number(player.skillRange),
      chapter: game.chapter,
    },
    inventoryItems: game.inventory.items.slice(),
    starterWeaponClaimed: Boolean(game.starterWeaponClaimed),
    pendingLevelRewardSelections: Math.max(0, Math.floor(Number(game.pendingLevelRewardSelections ?? 0))),
    rewardSelectionKind: state.hud.starterWeaponOpen
      ? (state.hud.rewardSelectionKind === "level-up" ? "level-up" : "starter")
      : null,
    rewardSelectionRerollsLeft: state.hud.starterWeaponOpen
      ? Math.max(0, Math.floor(Number(state.hud.rewardSelectionRerollsLeft ?? 0)))
      : 0,
    rewardSelectionOptions: state.hud.starterWeaponOpen ? state.hud.starterWeaponOptions.slice() : [],
    equippedWeaponId: player.equippedWeaponId,
    weaponSlotIds: game.inventory.weaponSlots.slice(),
    utilitySlotIds: game.inventory.utilitySlots.slice(),
    activeWeaponSlotIndex: game.inventory.activeWeaponSlotIndex,
    activeUtilitySlotIndex: game.inventory.activeUtilitySlotIndex,
    activeLoadoutTarget: resolveInventoryLoadoutTarget(game.inventory),
    selectedInventoryIndex: game.inventory.selectedIndex,
    containers: (game.containers || []).map((container) => ({
      id: container.id,
      label: container.label,
      variant: container.variant,
      worldX: Number(container.worldX.toFixed(2)),
      worldY: Number(container.worldY.toFixed(2)),
      size: Number(container.size.toFixed(2)),
      interactionRadius: Number(container.interactionRadius.toFixed(2)),
      looted: Boolean(container.looted),
      items: container.items.slice(),
    })),
    monsters: (game.monsters || []).map((monster) => ({
      id: monster.id,
      monsterId: monster.monsterId,
      stats: monster.stats ? { ...monster.stats } : null,
      worldX: Number(monster.worldX.toFixed(2)),
      worldY: Number(monster.worldY.toFixed(2)),
      health: Number(monster.health),
      maxHealth: Number(monster.maxHealth),
      attack: Number(monster.attack),
      defense: Number(monster.defense),
      moveSpeed: Number(monster.moveSpeed),
      awarenessRadius: Number(monster.awarenessRadius),
      radiusScale: Number(monster.radiusScale),
      spriteScale: Number(monster.spriteScale),
      hitboxWidthScale: Number(monster.hitboxWidthScale),
      hitboxHeightScale: Number(monster.hitboxHeightScale),
      hitboxOffsetYScale: Number(monster.hitboxOffsetYScale),
      idleFps: Number(monster.idleFps),
      hoverAmplitude: Number(monster.hoverAmplitude),
      shadowScale: Number(monster.shadowScale),
      animationOffset: Number(monster.animationOffset ?? 0),
    })),
    lootBoxLooted: game.containers?.[0]?.looted ?? false,
    lootBoxItems: game.containers?.[0]?.items?.slice?.() || [],
    artifactBoxLooted: game.containers?.[1]?.looted ?? false,
    artifactBoxItems: game.containers?.[1]?.items?.slice?.() || [],
  };
}

function applyGameStateToSlot(slot, game, persist = true) {
  const { player } = game;
  const hpPct = Math.round(healthRatio(player) * 100);
  const { risk, status } = riskStateFromRatio(healthRatio(player));
  slot.occupied = true;
  slot.name = player.name;
  slot.gender = player.gender;
  slot.chapter = game.chapter;
  slot.level = player.level;
  slot.health = `${hpPct}%`;
  slot.risk = risk;
  slot.status = status;
  slot.summary = `Last save: Chapter ${game.chapter} • Level ${player.level} • Mana ${Math.round(manaRatio(player) * 100)}%`;
  slot.skills = slot.skills.length ? slot.skills : defaultSkills();
  slot.saveData = serializeGameSnapshot(game);
  if (persist) {
    saveSlots();
  }
}

function saveCurrentProgress() {
  if (!state.game) return;
  const slot = currentSlot();
  applyGameStateToSlot(slot, state.game, true);
  setHudSaveMessage(`Saved: ${slot.name} • Chapter ${slot.chapter} • Level ${slot.level}`);
}

function resolveInventoryLoadoutTarget(inventory = state.game?.inventory) {
  if (!inventory) {
    return "weapon";
  }
  return inventory.activeLoadoutTarget === "utility" ? "utility" : "weapon";
}

function isInventoryWeaponSlotted(weaponId, inventory = state.game?.inventory) {
  if (!weaponId || !inventory) {
    return false;
  }

  return inventory.weaponSlots.includes(weaponId) || inventory.utilitySlots.includes(weaponId);
}
