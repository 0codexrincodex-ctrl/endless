import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = "/Users/mon/roguelike-endless-skill/output/spin-tip-check";
const URL = "http://localhost:4173/play.html?slot=1";

const makeEmptySlot = (id) => ({
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
});

const slots = [1, 2, 3].map((id) => makeEmptySlot(id));
slots[0] = {
  id: 1,
  occupied: true,
  name: "Spin Test",
  title: "Blade Anchor",
  buildType: "Unstable Thesis",
  origin: "lost-wanderer",
  chapter: 1,
  level: 1,
  risk: "Ready",
  health: "100%",
  status: "stable",
  summary: "Spin anchor test slot",
  skills: ["Pulse Shard", "Guard Bloom", "Mark Relay"],
  gender: "female",
  saveData: {
    chapter: 1,
    elapsed: 0,
    runStarted: false,
    monsterSpawnProgress: 0,
    startZoneOriginX: 0,
    startZoneOriginY: 0,
    startZoneRadius: 220,
    worldX: 0,
    worldY: 0,
    playerStats: {
      level: 1,
      experience: "0",
      experienceToNextLevel: "1",
      statPoints: 0,
      coreStats: {
        vitality: 10,
        power: 10,
        guard: 10,
        agility: 10,
        instinct: 10,
      },
      attack: 20,
      maxHealth: 100,
      health: 100,
      maxMana: 100,
      mana: 100,
      defense: 10,
      baseAgility: 10,
      physicalBoostStacks: 10,
      spinManaProgress: 0,
      physicalBoostDecayRemaining: 0,
      agility: 10,
      attackSpeed: 1,
      actionSpeed: 1,
      maxArmor: 100,
      armor: 100,
      healthRegen: 1,
      manaRegen: 5,
      skillRange: 1,
      chapter: 1,
    },
    inventoryItems: Array(24).fill(null),
    starterWeaponClaimed: true,
    pendingLevelRewardSelections: 0,
    rewardSelectionKind: null,
    rewardSelectionRerollsLeft: 0,
    rewardSelectionOptions: [],
    equippedWeaponId: "sword-12",
    weaponSlotIds: ["sword-12", "sword-17"],
    utilitySlotIds: Array(8).fill(null),
    activeWeaponSlotIndex: 0,
    activeUtilitySlotIndex: 0,
    activeLoadoutTarget: "weapon-0",
    selectedInventoryIndex: 0,
    containers: [],
    monsters: [],
    dummies: [],
  },
};

const settings = {
  masterVolume: 72,
  effectsVolume: 78,
  musicVolume: 54,
  graphicsQuality: "high",
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

page.on("console", (message) => {
  console.log(`[console:${message.type()}] ${message.text()}`);
});

page.on("pageerror", (error) => {
  console.log(`[pageerror] ${error.message}`);
});

await page.addInitScript(
  ({ seededSlots, seededSettings }) => {
    localStorage.setItem("endless-skill-slots-v1", JSON.stringify(seededSlots));
    localStorage.setItem("endless-skill-settings-v1", JSON.stringify(seededSettings));
  },
  { seededSlots: slots, seededSettings: settings },
);

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("#game-canvas");
await page.waitForTimeout(800);

const mouseTarget = { x: 1160, y: 260 };
await page.mouse.move(mouseTarget.x, mouseTarget.y);
await page.mouse.down();

const captures = [
  { name: "spin-2100", waitMs: 2100 },
  { name: "spin-2500", waitMs: 400 },
  { name: "spin-2900", waitMs: 400 },
];

let elapsed = 0;
for (const capture of captures) {
  elapsed += capture.waitMs;
  await page.waitForTimeout(capture.waitMs);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${capture.name}.png`),
  });
}

const textState = await page.evaluate(() => {
  if (typeof window.render_game_to_text === "function") {
    return window.render_game_to_text();
  }
  return null;
});

await fs.writeFile(
  path.join(OUTPUT_DIR, "spin-state.json"),
  JSON.stringify(
    {
      elapsedHoldMs: elapsed,
      textState: textState ? JSON.parse(textState) : null,
    },
    null,
    2,
  ),
);

await page.mouse.up();
await browser.close();
