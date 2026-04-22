# CODEX MAP

เอกสารนี้ทำไว้สำหรับ agent/งานรอบถัดไปโดยเฉพาะ เพื่อให้เปิดไฟล์ให้น้อยที่สุดและเข้าจุดได้เร็ว

## Fast Handoff

- ถ้างานเกี่ยวกับ `Sword 12 / Sword 17 / Beam / Spin`
  เปิดแค่ `js/systems/beam.js` กับ `js/systems/combat.js` ก่อน
- ถ้างานเกี่ยวกับ `Boss / Titan Centipede / summon / boss beam / boss control`
  เปิด `js/systems/boss.js` ก่อน แล้วค่อยเปิด `js/systems/play.js` ถ้าต้องแตะ game loop / camera / HUD
- ถ้างานเกี่ยวกับ `มอนสเตอร์ไล่ผู้เล่น / ตีผู้เล่น / spawn rate / pacing`
  เปิดแค่ `js/systems/play.js` ก่อน แล้วค่อยเปิด `js/systems/entities.js` ถ้าต้องจูนค่าสถานะต้นทาง
- ถ้างานเกี่ยวกับ `ระยะมองเห็น / กล้อง / ขนาดฉาก`
  เปิด `script.js` ก่อน เพราะ `buildSceneLayout()` คุม `tileSize`
- ตอนนี้ผู้ใช้ต้องการ `ทำงานเร็ว` และ `ไม่ต้องรันเทสต์เอง` เว้นแต่สั่งตรง ๆ
- มอนสเตอร์มี AI เบื้องต้นแล้ว แต่ยังไม่มี pathfinding, telegraph, hit reaction, หรือ animation state แยก

## Read Order

อ่านตามนี้ก่อนเริ่มงานทุกครั้ง:

1. `progress.md`
2. `CODEX_MAP.md`
3. เปิดเฉพาะไฟล์ตามชนิดงานจากหัวข้อ `Task -> Files`

## Project Shape

โปรเจกต์นี้เป็นเว็บเกม multi-page รันด้วย PHP static server:

- run: `npm run dev`
- url: `http://localhost:4173`
- page boot order ทุกหน้า:
  1. `script.js`
  2. `js/systems/pages.js`
  3. `js/bootstrap.js`

- play/main gameplay pages เพิ่มเติม:
  4. `js/systems/stats.js`
  5. `js/systems/inventory.js`
  6. `js/systems/entities.js`
  7. `js/systems/damage.js`
  8. `js/systems/beam.js`
  9. `js/systems/combat.js`
  10. `js/systems/boss.js`
  11. `js/systems/play.js`

หมายเหตุ:

- ไม่ใช่ทุกหน้าที่โหลด gameplay stack เต็มแล้ว
- หน้า legacy redirect (`setup/start-run/briefing`) ตอนนี้เหลือแค่ route shell ขั้นต่ำ
- page behavior ถูกคุมด้วย `body[data-page]`

## Page Map

- `index.html`
  หน้า main menu
- `select.html`
  หน้าเลือกสล็อต / ลบตัวละคร
- `create.html`
  หน้าสร้างตัวละคร
- `ritual.html`
  หน้าเลือก 3 สกิล
- `setup.html`
  หน้าเลือก relic / build setup
- `start-run.html`
  หน้าสรุปก่อนเข้าเล่น
- `play.html`
  หน้าเล่นจริง
- `briefing.html`
  หน้าเก่าใน flow เดิม ยังมีอยู่แต่ไม่ใช่จุดหลักล่าสุด

## Task -> Files

ถ้าจะแก้งาน ให้เปิดตามนี้ก่อน:

- main menu UI
  `index.html`, `styles.css`, `js/systems/pages.js`
- select character
  `select.html`, `styles.css`, `script.js`, `js/systems/pages.js`
- create character
  `create.html`, `styles.css`, `script.js`, `js/systems/pages.js`
- ritual skill picker
  `ritual.html`, `styles.css`, `script.js`, `js/systems/pages.js`
- build setup
  `setup.html`, `styles.css`, `script.js`, `js/systems/pages.js`
- start run summary
  `start-run.html`, `styles.css`, `script.js`, `js/systems/pages.js`
- in-game HUD / inventory / chest UI
  `play.html`, `styles/play.css`, `js/systems/inventory.js`, `js/systems/play.js`, `script.js`
- combat / dummy / swing / spin / DPS
  `js/systems/damage.js`, `js/systems/combat.js`, `js/systems/stats.js`, `js/systems/play.js`, `script.js`
- Sword 12 / Prism Beam / beam visuals / beam runtime
  `js/systems/beam.js`, `js/systems/combat.js`, `js/systems/play.js`, `script.js`
- player stats / formulas / derived values
  `js/systems/stats.js`, `script.js`, `js/systems/play.js`, `js/systems/combat.js`
- routing / save / slot / prep / shared render
  `script.js`, `js/systems/pages.js`, `js/bootstrap.js`
- inventory data / move / transfer / container helpers
  `js/systems/inventory.js`, `script.js`, `js/systems/play.js`
- boss summon / boss control / Titan Centipede render / boss beam
  `js/systems/boss.js`, `js/systems/play.js`, `script.js`
- monster/entity data and ambient spawn
  `js/systems/entities.js`, `js/systems/play.js`, `js/bootstrap.js`, `script.js`
- monster AI / chase / attack / player pressure
  `js/systems/play.js`, `js/systems/entities.js`, `js/systems/stats.js`
- camera feel / scene visibility / zoomed-out view
  `script.js`, `js/systems/play.js`
- damage formulas / mitigation / final hit resolution
  `js/systems/damage.js`, `js/systems/combat.js`, `js/systems/entities.js`

## Reusable Visual Pattern

### Sprite-Shaped Aura

ใช้กับงานที่ผู้ใช้ต้องการ “ออร่าให้ตรงทรงสไปรต์จริง” ไม่ใช่กรอบเรขาคณิต

- จุดอ้างอิงหลักคือ `getBeamWeaponHighlightSprite()` และ glow flow ใน `js/systems/beam.js`
- ถ้าจะทำออร่าแบบนี้ อย่าวาด `rect/frame path` ครอบทั้งชิ้นก่อน เพราะจะดูเป็น UI frame มากกว่า energy aura
- วิธีที่ใช้ได้ผลกับ Titan Centipede คือ:
  1. แยกชิ้นที่จะมีออร่าเป็น `parts` ก่อน เช่น `head`, `left fang`, `right fang`
  2. คำนวณตำแหน่งจริงของชิ้นพวกนี้ให้เสร็จก่อน แล้วค่อยเรียกวาดออร่า
  3. ใช้ tinted sprite pass ที่ `scale` ใหญ่กว่าสไปรต์จริงเล็กน้อย วาดไว้ “หลัง” ชิ้นจริง
  4. ซ้อนอย่างน้อย 2 ชั้น:
     `outer glow silhouette` + `inner lighter/screen silhouette`
  5. ถ้าต้องการให้อ่านชัดขึ้น ค่อยเติม radial glow เล็ก ๆ เฉพาะจุดสำคัญ เช่นกลางหัว ไม่ใช่ทำเป็นกรอบ
- ถ้าชิ้นมี attachment ที่ขยับได้ เช่นเขี้ยว/ปีก/ใบมีด ให้ย้ายการวาด aura ไปหลังขั้น resolve position ของ attachment เสมอ ไม่งั้นออร่าจะหลุดทรง
- Titan Centipede ใช้วิธีนี้อยู่ใน `js/systems/boss.js` ผ่าน:
  - `drawTitanCentipedeAuraSpriteFrame()`
  - `drawTitanCentipedePhaseAura()`
- ถ้าจะ reuse กับระบบอื่น ให้ทำ helper ชื่อแนวเดียวกัน เช่น `draw<Thing>AuraSpriteFrame()` แล้วส่ง `image/frameIndex/partSize/screenX/screenY/drawWidth/drawHeight/rotation`

## JS Ownership Map

### `script.js`

ไฟล์ shared core

- DOM refs ทุกหน้า
- constants / storage keys
- asset catalogs
- skill / relic / origin data
- shared state
- save/load localStorage
- slot/prep helpers
- route helper `goToPage`
- page render helpers:
  - `renderSelection()`
  - `renderCreateDraft()`
  - `renderRitualPage()`
  - `renderSetupPage()`
  - `renderStartRunPage()`

เปิดไฟล์นี้เมื่อ:

- state เพี้ยน
- save/load มีปัญหา
- route ไปผิดหน้า
- ritual/setup/start-run data ไม่ตรง
- inventory move logic ผิด

### `js/systems/inventory.js`

ไฟล์ inventory domain โดยเฉพาะ

- restore / normalize inventory state
- stash / weapon / utility / container slot helpers
- quick transfer / drag-drop move helpers
- active container / equipped weapon helpers
- near-box helpers

เปิดไฟล์นี้เมื่อ:

- shift+click เพี้ยน

### `js/systems/entities.js`

ไฟล์ entity/monster hub สำหรับต่อยอดในอนาคต

- monster-only data/render helpers
- boss blueprint ถูกแยกออกไปแล้วที่ `js/systems/boss.js`

- monster catalog + idle frame assets
- base monster stats
- ambient monster spawn / restore helpers
- visible monster projection + draw helpers
- monster runtime stat creation seed

เปิดไฟล์นี้เมื่อ:

- จะเพิ่มมอนสเตอร์ใหม่
- จะปรับค่าสถานะ monster template
- จะเปลี่ยนการเกิดรอบตัวหรือการ render monster
- จะจูนฐาน `attack / moveSpeed / awarenessRadius` ของมอนจากฝั่ง data

### `js/systems/boss.js`

ไฟล์บอสโดยเฉพาะ

- Titan Centipede profile + asset mapping
- boss summon trigger / test flow
- boss control input bridge
- boss beam charge / fire runtime
- boss render / fang layout / trail body draw

เปิดไฟล์นี้เมื่อ:

- จะจูนบอส
- จะขยับหัว / เขี้ยว / หาง / ลำตัว
- จะเปลี่ยน trigger วงแดงหรือ flow summon
- จะเปลี่ยนการบังคับบอสด้วย `B` / mouse / `Shift`
- จะจูนลำแสงหรืออนุภาคของบอส

### `js/systems/damage.js`

ไฟล์สูตรดาเมจกลาง

- damage mode multipliers
- defense mitigation
- final damage resolution against combat targets

เปิดไฟล์นี้เมื่อ:

- จะจูนดาเมจแรงไป/เบาไป
- จะเพิ่มประเภทการโจมตีใหม่
- จะเปลี่ยนสูตรลดดาเมจจาก defense
- drag/drop เพี้ยน
- ของเข้าออกกล่องผิด
- equipped weapon / active container ไม่ sync
- stash / utility / weapon slot state เพี้ยน

### `js/systems/combat.js`

ไฟล์ combat ล้วน

- dual wield profile
- dummy generation
- DPS meter
- melee swing
- hold-to-spin
- physical boost stack

เปิดไฟล์นี้เมื่อ:

- ดาเมจไม่เข้า
- charge/spin เพี้ยน
- dummy ไม่รีเลือด
- DPS ไม่อัปเดต
- ความคล่องตัวส่งผลผิด

### `js/systems/stats.js`

ไฟล์คำนวณค่าสถานะโดยเฉพาะ

- `buildPlayerStats()`
- `attackSpeedFromAgility()`
- `currentMoveSpeed()`
- `syncPhysicalEnhancementStats()`
- `healthRatio()`
- `manaRatio()`
- `riskStateFromRatio()`

เปิดไฟล์นี้เมื่อ:

- อยากแก้สูตรเลเวล / chapter
- HP / Mana / Regen คำนวณผิด
- attack speed / move speed เพี้ยน
- save summary / risk state แสดงไม่ตรง

### `js/systems/play.js`

ไฟล์ runtime ของหน้าเล่น

- start session
- world objects
- drawing scene
- HUD render
- inventory panel render
- chest open/close
- input handling ในหน้าเล่น
- monster spawn director
- simple monster AI chase/attack
- player movement physics
- current pacing knobs ของหน้าเล่น
- boss hooks ที่เรียกเข้า `js/systems/boss.js`

เปิดไฟล์นี้เมื่อ:

- ของในกล่องไม่ขึ้น
- HUD ซ้อน / panel ผิด
- มอนเดิน/ตีผิด
- อัตราเกิดมอนไม่ตรง
- เกมเห็นพื้นที่แคบหรือกว้างเกิน
- กด `E` แล้ว flow เพี้ยน
- วาด object ในโลกผิด
- boss มีปัญหาเพราะ loop / camera / scene plumbing ฝั่งหน้าเล่น

### `js/systems/pages.js`

ไฟล์ init รายหน้า

- `initializeMainPage()`
- `initializeMenuPage()`
- `initializeCreatePage()`
- `initializeRitualPage()`
- `initializeSetupPage()`
- `initializeStartRunPage()`
- `initializePlayPage()`

เปิดไฟล์นี้เมื่อ:

- event listener หาย
- ปุ่มหน้าใดหน้าหนึ่งไม่ทำงาน
- modal / delete / slot / ritual click ไม่ตอบสนอง

### `js/bootstrap.js`

ไฟล์ boot กลาง

- `render_game_to_text`
- `advanceTime(ms)`
- global events
- resize/fullscreen/contextmenu handling

เปิดไฟล์นี้เมื่อ:

- Playwright อ่าน state ไม่ครบ
- automation เพี้ยน
- fullscreen / resize / blur มีปัญหา

## CSS Ownership Map

### `styles.css`

ใช้กับหน้า pre-run ทั้งหมด:

- main
- select
- create
- ritual
- setup
- start-run

จุดสำคัญ:

- หน้า main เริ่มแถว `.main-*`
- หน้า create เริ่มแถว `.create-*`
- หน้า ritual เริ่มแถว `.ritual-*`
- หน้า setup / start-run ใช้ shell กลุ่มเดียวกันบางส่วน

### `styles/play.css`

ใช้กับหน้าเล่น:

- HUD
- stats
- settings
- inventory
- chest / artifact chest
- scrollbar

### `styles/responsive.css`

responsive overrides

เปิดเมื่อ:

- แก้แล้ว desktop ดี แต่ tablet/mobile พัง

## Route Flow

flow หลักตอนนี้:

`index -> select -> create -> ritual -> play`

logic จริงอยู่ใน `js/systems/pages.js` และ `script.js`

หน้า `setup / start-run / briefing` ยังมีอยู่ แต่ตอนนี้เป็น legacy shell/redirect ไม่ใช่ flow หลัก

## Save Model

localStorage keys:

- `endless-skill-slots-v1`
- `endless-skill-settings-v1`
- `endless-skill-prep-v1`

สิ่งที่แยกกัน:

- slot data = ตัวละคร/บทสรุปฝั่งเมนู
- prep data = ritual/setup selection ก่อนเข้า run
- game snapshot = state ตอนเล่นจริง ถูกฝังไว้ใน slot

## Current Inventory Model

ความจุปัจจุบัน:

- stash = 24
- weapon slots = 2
- utility slots = 6
- weapon chest = 120
- artifact chest = 120
- artifact actual items seeded = 100

กฎรองรับ item:

- `stash` รับ weapon + artifact
- `weapon` รับ weapon
- `utility` รับ weapon + artifact
- `chest` รับ weapon
- `artifact-chest` รับ artifact

shortcut สำคัญ:

- `E` เปิด/ปิด inventory หรือกล่องใกล้ตัว
- `Shift+click` จากกล่อง -> เข้าตัวก่อน
- `Shift+click` จากตัว -> เข้ากล่องที่เปิดอยู่ก่อน

logic หลักอยู่ที่:

- `moveItemBetweenSlots()`
- `quickTransferItem()`
- `resolveInventoryLoadoutTarget()`

## Combat Model Snapshot

ระบบที่มีแล้ว:

- melee sword
- dual wield cross slash
- hold left click charge 1.5s
- spin 360 consume mana
- agility เป็นค่าสากลของ move/attack/spin
- boost stack decay 5 วิ
- dummy auto heal / respawn
- DPS rolling window 3 วิ

## Assets Used Often

### Gameplay

- `asset-use/playing-scene/player-walk-sheet.png`
- `asset-use/playing-scene/side-torch-1.png`
- `asset-use/playing-scene/mini-box-1.png`
- `asset-use/playing-scene/chest-1.png`
- `asset-use/playing-scene/dungeon-tileset.png`

### Weapons

- `asset-use/weapons/sword-01.png` ถึง `sword-24.png`

### Artifacts

- `asset-use/artifacts/artifact-001.png` ถึง `artifact-100.png`
- source trace: `asset-use/artifacts/SOURCE_MAP.txt`

### Buffs

- `asset-use/buffs/swiftness.png`

## Fast Debug Checklist

ถ้า UI หน้า pre-run พัง:

1. เช็ก page ถูกต้องจาก `body[data-page]`
2. เปิด `styles.css`
3. เปิด render/init ของหน้านั้นใน `script.js` + `pages.js`

ถ้า inventory/chest พัง:

1. `script.js`
2. `js/systems/play.js`
3. `styles/play.css`

ถ้าโจมตี/ดาเมจ/charge พัง:

1. `js/systems/combat.js`
2. `js/systems/play.js`
3. `js/bootstrap.js` เฉพาะตอน automation/state output

## Useful Symbols

ใช้ `rg` ตามนี้เพื่อลดการเปิดไฟล์:

- `rg -n "goToPage\\(" script.js js/systems/pages.js js/systems/play.js`
- `rg -n "renderRitualPage|renderSetupPage|renderStartRunPage" script.js`
- `rg -n "moveItemBetweenSlots|quickTransferItem" script.js`
- `rg -n "startPlayingSession|renderInventoryPanel|openLootBox" js/systems/play.js`
- `rg -n "triggerMeleeAttack|updateSpinState|applySwingHits|updateDpsMetric" js/systems/combat.js`
- `rg -n "bossSummon|TitanCentipede|bossBeam|activeControlledBoss" js/systems/boss.js js/systems/play.js`
- `rg -n "render_game_to_text|advanceTime" js/bootstrap.js`

## Do Not Relearn

เรื่องที่รู้อยู่แล้ว ไม่ต้องไล่ใหม่ทุกครั้ง:

- project ใช้ PHP static server ไม่ใช่ Vite
- หน้า `play`/`main` โหลด gameplay stack และ boss logic อยู่ใน `js/systems/boss.js` ก่อน `js/systems/play.js`
- `render_game_to_text` ใช้เช็ก state automation
- หน้า `play` คือหน้าเดียวที่ใช้ `styles/play.css`
- combat ถูกแยกแล้วใน `js/systems/combat.js`
- artifact chest มีแล้ว และคนละชนิดกับ weapon chest

## Suggested Next-Agent Habit

ก่อนแก้:

1. อ่าน `progress.md`
2. อ่าน `CODEX_MAP.md`
3. เปิดเฉพาะไฟล์ในหัวข้อ `Task -> Files`
4. ค่อยไล่ลึกถ้ายังไม่พอ

เป้าหมายของไฟล์นี้คือทำให้ “อ่านให้น้อย แต่เข้าจุดให้ถูก”
