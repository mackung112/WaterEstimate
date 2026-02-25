# Walkthrough — Skills-Based Refactoring (Modern JS + UI/UX Pro Max)

ปรับปรุงโค้ดทั้งโปรเจกต์ให้เป็นไปตามมาตรฐาน `modern-javascript-patterns` และ `ui-ux-pro-max` ที่กำหนดไว้ใน `.agents/skills/`

## 1. JavaScript Refactoring (Modern JS Patterns)

### สิ่งที่เปลี่ยนแปลง

| ไฟล์ | การแก้ไข |
| :--- | :--- |
| `assets/js/core/config.js` | เพิ่ม `APP_VERSION: "4.1.0"` และใช้ `Object.freeze()` ป้องกันการเปลี่ยนแปลงค่าคงที่โดยไม่ตั้งใจ |
| `assets/js/core/app.js` | เพิ่ม JSDoc ภาษาไทย ให้ `toggleLoading`, เปลี่ยนจาก `window.onload` เป็น `document.addEventListener('DOMContentLoaded')` |
| `assets/js/services/db_manager.js` | ย้าย `bodyWithAction()` (ฟังก์ชันที่หลุดอยู่นอก Object) เข้ามาเป็น `_buildPayload` method ภายใน `DBManager`, ลบ duplicate MAP keys 3 คู่ ใน `normalizeRecord` |
| `pages/dashboard/dashboard.js` | `var` → `const`, ดึง logic ตรวจ `hasEstNo` ที่ซ้ำ 3 จุด ออกมาเป็น helper `_hasEstNo()` |
| `pages/materials/materials.js` | `var` → `const` |
| `pages/personnel/personnel.js` | `var` → `const` |
| `pages/form/form.js` | `var` → `const` |

### หลักการที่ใช้
- **ห้ามใช้ `var`** → ใช้ `const` ตลอด (ยกเว้นต้อง reassign ค่อยใช้ `let`)
- **DRY (Don't Repeat Yourself)** → ดึง logic ซ้ำ ออกมาเป็น helper
- **Encapsulation** → ห้ามมี function หลุดออกนอก Object/Module
- **Object.freeze()** → ป้องกัน Config ถูกแก้ไขโดย runtime

---

## 2. CSS Refactoring (UI/UX Pro Max Design System)

### สิ่งที่เปลี่ยนแปลง

| ไฟล์ | การแก้ไข |
| :--- | :--- |
| `assets/css/main.css` | สร้าง Design Tokens (`:root` CSS Variables) 20+ ตัว, ย้าย shared styles เข้ามา (`.skeleton`, `.btn-hover-scale`, `.glass-card`, `.table-row-anim`, `.skeleton-text`, `.skeleton-avatar`), เพิ่ม glassmorphism ให้ Toast, เพิ่ม `scroll-behavior: smooth` |
| `pages/dashboard/dashboard.css` | ลบ `:root` ซ้ำ, `.skeleton`, `.btn-hover-scale`, `@keyframes shimmer` | 
| `pages/materials/materials.css` | ลบ `.glass-card`, `.skeleton`, `.skeleton-text`, `.btn-hover-scale`, `@keyframes shimmer/slideInUp` |
| `pages/personnel/personnel.css` | ลบ `.glass-card`, `.skeleton`, `.skeleton-avatar`, `.skeleton-text`, `.btn-hover-scale`, `@keyframes shimmer/slideInUp` |
| `pages/form/form.css` | ลบ `.btn-hover-scale`, ใช้ CSS variables แทน hardcode `#005c97` |

### Design Tokens ที่สร้างใหม่
```css
:root {
    --color-primary: #005c97;
    --gradient-primary: linear-gradient(135deg, ...);
    --shadow-sm / --shadow-md / --shadow-lg;
    --radius-sm / --radius-md / --radius-lg / --radius-pill;
    --transition-fast / --transition-default / --transition-bounce;
}
```

### ผลลัพธ์
- ลด CSS ซ้ำซ้อน **~120 บรรทัด** ข้ามไฟล์
- สามารถเปลี่ยนธีมสีทั้งระบบได้จากที่เดียว (`:root`)
- Toast Notification มี Glassmorphism effect (เบลอฉากหลัง)

---

## 3. Verification

### การตรวจสอบ
1. เปิด `index.html` ผ่าน Browser แล้วตรวจว่า:
   - หน้า Dashboard โหลดปกติ ไม่มี JS Error ในคอนโซล
   - Skeleton loading, Hover effects, Toast ยังทำงาน
   - Modal ในหน้า Materials / Personnel เปิดปิดได้ปกติ
2. กด F12 ดู Console → ไม่มี `ReferenceError` หรือ `TypeError`

---

## 4. Form Page Enhancements (Issue Fixes)

มีการแก้ไขเพิ่มเติม 3 จุดในหน้า `form.html` ตามความต้องการของผู้ใช้:

### 4.1 ปุ่มออกรายงานแบบ One-Click

- **การแก้ไข**: รวมปุ่มออกรายงานทั้ง 3 ปุ่ม (ใบแจ้งราคา, ประมาณการ, ผังติดตั้ง) ให้เหลือเพียงปุ่มเดียว
- **ผลลัพธ์**: เมื่อผู้ใช้คลิกปุ่ม "ออกรายงาน" ระบบจะเปิดแท็บเบราว์เซอร์ใหม่ 3 แท็บ เพื่อแสดงรายงานทั้ง 3 ประเภทพร้อมกัน (`window.open` 3 ครั้งในฟังก์ชัน `printAllReports` โดยมีการหน่วงเวลาแท็บละ 100ms เพื่อป้องกันเบราว์เซอร์บล็อก Popup) ช่วยลดเวลาในการกดปุ่ม

### 4.2 ระบบปักหมุดแผนที่ด้วย Leaflet.js

- **การแก้ไข**: เปลี่ยนจากการใช้ Google Maps iframe ที่แสดงผลอย่างเดียว มาเป็นแผนที่แบบ Interactive โดยใช้ไลบรารี **Leaflet.js** (OpenStreetMap)
- **ผลลัพธ์**: ผู้ใช้สามารถคลิกบนแผนที่เพื่อปักหมุดตำแหน่งที่ต้องการได้ทันที ระบบจะดึงพิกัด (Latitude, Longitude) ไปใส่ในช่อง Input อัตโนมัติ ทำให้การระบุตำแหน่งง่ายและแม่นยำขึ้น

### 4.3 เพิ่มความเร็วในการบันทึกข้อมูล (Fast Save)

- **การแก้ไข**: ปรับปรุงฟังก์ชัน `Form.submit()` โดยดึง `await` ออกจากฟังก์ชัน `Form.cacheReportData()` และลดเวลาการ Redirect กลับหน้า Dashboard
- **ผลลัพธ์**: 
  - การโหลดข้อมูลมารอไว้ใน Cache (Background task) จะไม่บล็อกผู้ใช้อีกต่อไป
  - เวลาหน่วงจากการกดปุ่ม "บันทึก" จนถึงตอนเปลี่ยนหน้า ลดลงครึ่งหนึ่ง เลิกการต้องรอให้ Cache เสร็จสิ้นก่อน ทำให้แอปพลิเคชันตอบสนองไวขึ้นอย่างเห็นได้ชัด

### 4.4 ปรับขนาดกล่องแสดงผลรูปภาพให้เท่ากัน

- **การแก้ไข**: ปรับความสูง (Height) ของกล่องแสดงผล "ภาพจาก GIS" และ "รูปแบบการติดตั้ง" จาก `200px` ขึ้นมาเป็น `280px`
- **ผลลัพธ์**: กล่องแสดงผลทั้ง 3 กล่องในส่วนที่ 3 (แผนที่, GIS, รูปแบบ) จะมีความสูงเท่ากันพอดี (Aligned) ทำให้หน้าตา UI ดูสวยงามและเป็นระเบียบมากขึ้น
