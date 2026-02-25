# คู่มือนักพัฒนา (Developer Guide) - Water Supply Application V3

เอกสารนี้รวบรวมรายละเอียดของโครงสร้างโปรเจกต์, มาตรฐานการเขียนโค้ด, และ API Reference ของโมดูลต่าง ๆ เพื่อให้ง่ายต่อการดูแลรักษาและพัฒนาต่อยอด

## สารบัญ
1. [โครงสร้างโปรเจกต์ (Project Structure)](#project-structure)
2. [มาตรฐานการเขียนโค้ด (Coding Standards)](#coding-standards)
3. [โมดูลหลัก (Core Modules)](#core-modules)
   - [Config (`config.js`)](#config-js)
   - [Utils (`utils.js`)](#utils-js)
   - [DBManager (`db_manager.js`)](#dbmanager-js)
   - [App (`app.js`)](#app-js)
4. [หน้าและคอมโพเนนต์ (Pages & Components)](#pages--components)
   - [Form Controller (`form.js`)](#form-js)
   - [Items Component (`items.js`)](#itemscomponent-js)
   - [Dashboard Controller (`dashboard.js`)](#dashboard-js)
   - [Materials Controller (`materials.js`)](#materials-js)
   - [Personnel Controller (`personnel.js`)](#personnel-js)

---

## <a id="project-structure"></a>1. โครงสร้างโปรเจกต์
- `index.html`: หน้าหลัก (SPA Entry Point)
- `assets/js`: เก็บสคริปต์หลักที่ใช้ร่วมกัน
  - `core/`: ไฟล์พื้นฐานระบบ (`utils.js`, `config.js`, `app.js`)
  - `services/`: ไฟล์ติดต่อฐานข้อมูลและ API (`db_manager.js`)
- `pages/`: เก็บไฟล์ HTML/JS/CSS แยกตามหน้า
  - `form/`: หน้าบันทึกข้อมูลและส่วนจัดการรายการ (`form.js`, `items/items.js`)
  - `dashboard/`: หน้าสรุปผลและรายการงาน (`dashboard.js`)
  - `materials/`: หน้าจัดการวัสดุ (`materials.js`)
  - `personnel/`: หน้าจัดการบุคลากร (`personnel.js`)

---

## <a id="coding-standards"></a>2. มาตรฐานการเขียนโค้ด (Coding Standards)

เพื่อให้โค้ดเป็นระเบียบและง่ายต่อการแก้ไข:

1.  **Variables (ตัวแปร)**: ใช้ `camelCase` สื่อความหมายชัดเจน
    -   *ดี*: `customerName`, `totalPrice`
    -   *ไม่ดี*: `cname`, `tp`

2.  **Functions (ฟังก์ชัน)**: ใช้ `camelCase` เริ่มต้นด้วยคำกริยา
    -   *ตัวอย่าง*: `calculateTax()`, `getData()`, `updateStatus()`

3.  **Classes/Objects (คลาส/โมดูล)**: ใช้ `PascalCase`
    -   *ตัวอย่าง*: `DBManager`, `Utils`, `FormController`

4.  **Documentation (เอกสารกำกับโค้ด)**:
    -   ใช้ **JSDoc** สำหรับฟังก์ชันและโมดูลสำคัญ
    -   ระบอก `param` และ `return` ให้ชัดเจน

```javascript
/**
 * คำนวณราคารวม
 * @param {number} price - ราคาต่อหน่วย
 * @param {number} qty - จำนวน
 * @returns {number} ราคารวมทั้งหมด
 */
const calculateTotal = (price, qty) => { ... }
```

---

## <a id="core-modules"></a>3. โมดูลหลัก (Core Modules)

### <a id="config-js"></a>Config (`assets/js/core/config.js`)
รวมค่าคงที่ที่ใช้ทั่วทั้งแอพพลิเคชัน

| ตัวแปร | ประเภท | คำอธิบาย |
| :--- | :--- | :--- |
| `CONFIG.API_URL` | `string` | URL ของ Google Apps Script Web App Endpoint |
| `CONFIG.APP_VERSION` | `string` | เวอร์ชันปัจจุบันของแอพพลิเคชัน |

### <a id="utils-js"></a>Utils (`assets/js/core/utils.js`)
รวมฟังก์ชันอรรถประโยชน์ที่ใช้บ่อย

| ฟังก์ชัน | คำอธิบาย |
| :--- | :--- |
| `formatThaiDate(dateString)` | แปลงวันที่เป็นรูปแบบภาษาไทย (เช่น 12 ส.ค. 2567) |
| `formatCurrency(amount)` | แปลงตัวเลขเป็นรูปแบบเงิน (เช่น 1,234.00) |
| `showToast(msg, type)` | แสดงข้อความแจ้งเตือน (Success/Error) บนหน้าจอ |
| `calculateJobCosts(items, materials, size)` | **Core Logic**: คำนวณราคาและแบ่งหมวดหมู่ค่าใช้จ่ายทั้งหมดของงาน <br> *Item Structure*: `{ quantity, unitPriceMaterial, unitPriceLabor, section }* |

### <a id="dbmanager-js"></a>DBManager (`assets/js/services/db_manager.js`)
ตัวจัดการการเชื่อมต่อกับฐานข้อมูล (Google Sheets via Apps Script)

| เมธอด | คำอธิบาย |
| :--- | :--- |
| `getDatbase(limit)` | ดึงข้อมูลทั้งหมด (Jobs, Materials, Personnel) |
| `saveJob(jobData)` | บันทึกหรืออัปเดตข้อมูลงานติดตั้ง |
| `deleteJob(jobId)` | ลบข้อมูลงาน |
| `saveMaterial(data)` | บันทึกข้อมูลวัสดุ |
| `deleteMaterial(id)` | ลบข้อมูลวัสดุ |
| `savePersonnel(data)` | บันทึกข้อมูลบุคลากร |
| `deletePersonnel(id)` | ลบข้อมูลบุคลากร |

### <a id="app-js"></a>App (`assets/js/core/app.js`)
ตัวจัดการ Routing และการโหลดหน้าเว็บ (SPA Logic)

| Object/Method | คำอธิบาย |
| :--- | :--- |
| `Router.load(pageName)` | โหลดเนื้อหาจาก `pages/[pageName]/[pageName].html` |

---

## <a id="pages--components"></a>4. หน้าและคอมโพเนนต์

### <a id="form-js"></a>Form Controller (`pages/form/form.js`)
ควบคุมหน้าฟอร์มบันทึกข้อมูล

- **init()**: เริ่มต้นหน้า, โหลดข้อมูลพื้นฐาน, ตรวจสอบ Mode (New/Edit)
- **fillFormData(job)**: กรอกข้อมูลลงฟอร์มกรณีแก้ไข
- **submit()**: รวบรวมข้อมูลและบันทึก
- **printReport(type)**: จัดการการพิมพ์รายงาน (R1, R2, R3)

### <a id="itemscomponent-js"></a>Items Component (`pages/form/items/items.js`)
จัดการตารางรายการวัสดุและการคำนวณ

- **setItems(items)**: โหลดรายการวัสดุเข้าตาราง
- **calculateTotals()**: คำนวณยอดเงินรวมและอัปเดต UI (เรียกใช้ `Utils.calculateJobCosts`)
- **applyDefaultItems(size)**: โหลดรายการมาตรฐานตามขนาดมิเตอร์ (1/2" หรือ 3/4") พร้อมแจ้งเตือนหากวัสดุไม่ครบ

### <a id="dashboard-js"></a>Dashboard Controller (`pages/dashboard/dashboard.js`)
หน้าจอหลักแสดงรายการงาน

- **fetchData()**: ดึงข้อมูลงานล่าสุดและแสดงผล
- **render(list)**: แสดงตารางงานพร้อม Badge สถานะ
- **updateStats(list)**: คำนวณและแสดงสถิติ (ทั้งหมด, รอออกเลข)

### <a id="materials-js"></a>Materials Controller (`pages/materials/materials.js`)
หน้าจัดการวัสดุอุปกรณ์

- **render(list)**: แสดงรายการวัสดุ พร้อม Badge หมวดหมู่
- **save()**: บันทึกข้อมูลวัสดุ (Create/Update)
- **delete(id)**: ลบข้อมูลวัสดุ

### <a id="personnel-js"></a>Personnel Controller (`pages/personnel/personnel.js`)
หน้าจัดการบุคลากร

- **render(list)**: แสดงรายการบุคลากร
- **save()**: บันทึกข้อมูลบุคลากร
- **delete(id)**: ลบข้อมูลบุคลากร
