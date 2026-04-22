# Project Summary

## ภาพรวมโปรเจกต์

โปรเจกต์นี้คือเว็บเกม `top-down survival roguelike` ที่ตอนนี้มีทั้ง flow หน้าเมนูหลายหน้าและฉากเล่นจริงขั้นต่ำแล้ว โดยแกนของเกมยังคงเป็น:

- ตัวละคร 1 ชีวิต
- 3 สกิลติดตัวแบบอัตโนมัติ
- 20 นาทีต่อ 1 chapter
- ชนะบอสแล้วไปต่อด้วยตัวเดิมและของเดิม
- ตายแล้วเริ่มใหม่ทั้งหมด
- build ค่อย ๆ ก่อรูปผ่านไอเทม

สถานะปัจจุบันไม่ใช่แค่หน้าเริ่มเกมแล้ว แต่เป็น `front-end shell + gameplay prototype + in-game HUD` ที่เชื่อมต่อกันได้จริง

## สถานะปัจจุบัน

ตอนนี้ในโปรเจกต์มี:

- โครงเว็บแบบ `multi-page` จริง
  - [index.html](/Users/mon/roguelike-endless-skill/index.html)
  - [create.html](/Users/mon/roguelike-endless-skill/create.html)
  - [briefing.html](/Users/mon/roguelike-endless-skill/briefing.html)
  - [play.html](/Users/mon/roguelike-endless-skill/play.html)
- พื้นหลัง canvas และ visual base ของเกม
- เมนูเลือกตัวละคร 3 สล็อต
- flow ข้ามหน้าจริง:
  - `menu -> create -> briefing -> play`
- ฉากเล่นที่ขยับตัวละครได้ด้วย `WASD`
- เมาส์หันหน้าตัวละคร
- แมพแบบ procedural ต่อเนื่องตามการเดิน
- dummy 3 ตัวสำหรับทดสอบสกิล
- HUD ตอนเล่น:
  - โปรไฟล์ตัวละคร
  - เลือด / มานา
  - ค่าสถานะจริง
  - เมนูแฮมเบอร์เกอร์
  - ปุ่มเซฟความคืบหน้า
- save/load ผ่าน `localStorage`
- ปุ่ม fullscreen
- hook สำหรับระบบทดสอบ:
  - `window.render_game_to_text`
  - `window.advanceTime(ms)`

ไฟล์หลัก:

- [index.html](/Users/mon/roguelike-endless-skill/index.html)
- [styles.css](/Users/mon/roguelike-endless-skill/styles.css)
- [script.js](/Users/mon/roguelike-endless-skill/script.js)
- [progress.md](/Users/mon/roguelike-endless-skill/progress.md)

## สิ่งที่ทำไปแล้ว

### 1. แยกจาก single-page เป็น multi-page

เดิม flow หลักทั้งหมดอยู่ใน [index.html](/Users/mon/roguelike-endless-skill/index.html) หน้าเดียว แล้วสลับ state ภายใน JS  
ตอนนี้แยกเป็นหลายหน้าแล้ว เพื่อให้โครงเว็บอ่านง่ายขึ้นและต่อยอดได้ง่ายกว่า:

- หน้าเลือกตัวละคร
- หน้าสร้างตัวละคร
- หน้าสรุปก่อนเริ่ม
- หน้าเล่นจริง

### 2. เชื่อม flow หน้าเกมกับข้อมูลสล็อตจริง

ตอนนี้แต่ละหน้ารับ `slot` จาก query params และอ่านข้อมูลจริงจาก `localStorage`

ผลคือ:

- เปิดสล็อตว่าง -> ไปหน้าสร้างตัวละคร
- สร้างตัวละคร -> ไป briefing
- กดเริ่มรอบ -> เข้าหน้าเล่นจริง
- เซฟในหน้าเล่น -> กลับมาเห็นสล็อตเดิมพร้อมข้อมูลล่าสุด

### 3. มี gameplay scene จริงแล้ว

ระบบที่ทำแล้ว:

- เดินด้วย `WASD`
- หันหน้าด้วยเมาส์
- ฉากเล่น procedural
- คบเพลิงพร้อมแสง
- dummy 3 ตัวใน world-space
- HUD ตอนเล่น

### 4. มี HUD และ settings ระหว่างเล่น

HUD ตอนเล่นตอนนี้มี:

- portrait ตัวละคร
- HP / Mana bars
- ค่าสถานะจริง
- ปุ่มแฮมเบอร์เกอร์
- slider เสียงเกม / เอฟเฟกต์ / เพลง
- ปุ่มเซฟความคืบหน้า

## วิธีรันโปรเจกต์

ใช้คำสั่ง:

```bash
npm run dev
```

จากนั้นเปิด:

```text
http://localhost:4173
```

หน้าใช้งานหลัก:

```text
http://localhost:4173/index.html
http://localhost:4173/create.html?slot=1
http://localhost:4173/briefing.html?slot=1
http://localhost:4173/play.html?slot=1
```

## สิ่งที่ควรทำต่อ

ลำดับที่แนะนำ:

### 1. ทำสกิลแรกให้ใช้งานกับ dummy ได้จริง

เป้าหมาย:

- ตัวละครมี auto-skill อย่างน้อย 1 ช่อง
- ใช้มานาจริง
- กระทบ dummy และลด HP ได้

นี่คือ milestone ที่คุ้มที่สุดตอนนี้ เพราะ HUD และสนามทดสอบพร้อมแล้ว

### 2. เพิ่ม combat feedback ขั้นต่ำ

ควรมี:

- hit flash
- floating damage
- dummy shake หรือ state โดนโจมตี

### 3. เริ่มผูก progression ของ run เข้ากับ gameplay จริง

ตอนนี้ slot และ save มีแล้ว แต่ยังไม่ได้โตจากการเล่นจริงมากนัก  
ควรต่อ:

- XP
- level up
- item choice
- mana/health usage จากสกิลจริง

### 4. เริ่มแตก `script.js`

ตอนนี้ multi-page แล้ว แต่ logic ยังรวมอยู่ไฟล์เดียว  
ขั้นถัดไปที่ควรทำคือแยกอย่างน้อย:

- page routing
- slot persistence
- gameplay systems
- HUD rendering

## สิ่งที่ยังไม่ควรทำตอนนี้

เพื่อกัน scope บาน ยังไม่ควรแตะสิ่งต่อไปนี้:

- lore หรือ narrative ลึก
- class หลายแบบ
- meta progression แบบถาวร
- chapter หลายฉาก
- item จำนวนมาก
- boss หลายตัว
- ระบบ online
- settings/menu ที่แตกแขนงมาก

## ความเสี่ยงหลักตอนนี้

### 1. `script.js` ยังรวมหลายระบบไว้มากเกินไป

ความเสี่ยง:

- ตอนนี้มีทั้ง routing, persistence, gameplay, HUD และ menu flow อยู่ในไฟล์เดียว

ทางลดความเสี่ยง:

- แยก module หรืออย่างน้อยแยกเป็นส่วน `pages`, `save`, `gameplay`, `hud`

### 2. มี gameplay shell แล้ว แต่ core combat ยังไม่ถูกพิสูจน์

ความเสี่ยง:

- ระบบเดิน, HUD, save, multi-page ดูพร้อมขึ้น แต่ยังไม่รู้ว่าสกิลอัตโนมัติและการ build สนุกจริงหรือไม่

ทางลดความเสี่ยง:

- รีบทำ `skill -> hit dummy -> consume mana -> kill target` ให้ครบเส้นก่อน

### 3. save progress ยังเป็น snapshot เบื้องต้น

ความเสี่ยง:

- ตอนนี้เซฟได้แล้ว แต่ยังเป็น snapshot ของสภาพ run ไม่ใช่ progression เต็มรูปแบบ

ทางลดความเสี่ยง:

- ควรออกแบบ save schema ให้รองรับ level up, items, chapter carry-over ก่อน content โต

## งานแนะนำรอบถัดไป

ถ้าจะทำต่อทันที ฉันแนะนำรอบถัดไปให้โฟกัสแค่ชุดเดียว:

### เป้าหมาย

ทำ `first combat slice`

### ขอบเขต

ขอบเขต:

- auto-skill ตัวแรก
- mana cost
- hit dummy
- dummy ตายได้
- HUD ค่าลดลง/ฟื้นกลับได้
- timer 20 นาทีแบบย่อเพื่อทดสอบก่อน
- enemy spawn ขั้นต่ำ
- auto-skill ขั้นต่ำ 1-3 แบบ
- HP และ death
- ปุ่มกลับสู่เมนูเมื่อแพ้

### ห้ามเพิ่มในรอบเดียวกัน

- inventory ใหญ่
- item draft ซับซ้อน
- boss เต็มรูปแบบ
- multiple maps

## อัปเดตล่าสุด

- หน้าเริ่มเกมถูกรีดีไซน์ให้คลีนขึ้น
- เปลี่ยนข้อความให้เป็นภาษาที่ผู้เล่นเข้าใจง่ายขึ้น
- เก็บพื้นหลังเดิมไว้ตาม feedback
- แก้บัค UI ซ้อนกันแล้ว
- ระบบทดสอบอัตโนมัติยังใช้ต่อได้ผ่าน `?capture=1`

## หมายเหตุสำหรับการทำงานต่อ

- `progress.md` ใช้เป็น log การทำงานรายรอบ
- เอกสารนี้ใช้เป็นภาพรวมของโปรเจกต์และแผนงานต่อ
- ถ้าจะเริ่มลง gameplay จริง ควรอัปเดตเอกสารนี้หลังจบแต่ละ milestone ใหญ่
