// ============================================
// 1. CONFIGURATION
// ============================================
// 🚨 [สำคัญ] URL Web App ของคุณ
const API_URL = CONFIG.API_URL;

// ============================================
// 2. MAIN LOGIC
// ============================================
window.onload = async function () {
    // ตรวจสอบ URL
    if (API_URL.includes("example-your-script-id")) {
        alert("⚠️ แจ้งเตือน: URL Google Apps Script ไม่ถูกต้อง");
    }

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        alert("ไม่พบรหัสงาน (Job ID) ใน URL");
        return;
    }

    document.title = "ประมาณการ " + jobId;

    try {
        // 🔥 NEW: ตรวจสอบ Cache ก่อน
        const cached = sessionStorage.getItem('REPORT_CACHE');
        let res;

        if (cached) {
            console.log('✅ Loading from cache...');
            res = JSON.parse(cached);
        } else {
            console.log('📡 Fetching from server...');
            // ดึงข้อมูลจาก Google Sheets ผ่าน GAS
            const response = await fetch(API_URL + "?action=getData");
            res = await response.json();

            if (res.status !== 'success') throw new Error(res.message);
        }

        const job = res.jobs.find(j => String(j.jobId) === String(jobId));
        if (!job) throw new Error("ไม่พบข้อมูลงาน ID: " + jobId);

        // เริ่มวาดหน้าจอ
        renderHeader(job);
        renderTable(job, res.materials);
        renderSignatures(job, res.personnel);

        // 🔥 Auto-Fit Page
        setTimeout(autoFitPage, 500); // รอรูปโหลดแป๊บ


    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาด: " + error.message);
        document.getElementById('table-body').innerHTML = `<tr><td colspan="10" class="text-center text-danger">โหลดข้อมูลไม่สำเร็จ: ${error.message}</td></tr>`;
    }
};

// ============================================
// 3. HELPER FUNCTIONS
// ============================================
const fmt = (n) => (parseFloat(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => (parseFloat(n) || 0).toLocaleString('th-TH');

function formatDate(d) {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function ThaiNumberToText(Number) {
    const NumberWord = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const UnitWord = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    Number = parseFloat(Number).toFixed(2);
    if (Number == "0.00") return "ศูนย์บาทถ้วน";
    let Numbers = Number.split(".");
    let Integer = Numbers[0];
    let Decimal = Numbers[1];
    let Text = "";
    if (parseInt(Integer) > 0) {
        let Len = Integer.length;
        for (let i = 0; i < Len; i++) {
            let N = Integer.charAt(i);
            if (N != 0) {
                if (i == (Len - 1) && N == 1 && Len > 1) { Text += "เอ็ด"; }
                else if (i == (Len - 2) && N == 2) { Text += "ยี่"; }
                else if (i == (Len - 2) && N == 1) { /* สิบ */ }
                else { Text += NumberWord[N]; }
                Text += UnitWord[Len - i - 1];
            }
        }
        Text += "บาท";
    }
    if (parseInt(Decimal) > 0) {
        let Len = Decimal.length;
        for (let i = 0; i < Len; i++) {
            let N = Decimal.charAt(i);
            if (N != 0) {
                if (i == (Len - 1) && N == 1 && Len > 1) { Text += "เอ็ด"; }
                else if (i == (Len - 2) && N == 2) { Text += "ยี่"; }
                else if (i == (Len - 2) && N == 1) { /* สิบ */ }
                else { Text += NumberWord[N]; }
                Text += (i == 0) ? "สิบ" : "";
            }
        }
        Text += "สตางค์";
    } else { Text += "ถ้วน"; }
    return Text;
}

function getItemTotal(item) {
    let total = parseFloat(item.totalPrice || 0);
    // Fallback ถ้าไม่มี Total_Price ให้คำนวณเอง
    if (total === 0) {
        const q = parseFloat(item.quantity || 0);
        const m = parseFloat(item.unitPriceMaterial || 0);
        const l = parseFloat(item.unitPriceLabor || 0);
        const sec = String(item.section || '').toLowerCase();

        if (q > 0) {
            if (sec.includes('sec3') || sec.includes('sec4')) {
                // ท่อ: (ค่าของ * 1.1) + แรง
                total = ((m * 1.10) + l) * q;
            } else {
                // ทั่วไป: (ค่าของ + แรง) * จำนวน
                total = (m + l) * q;
            }
        }
    }
    return Math.round(total);
}

// ============================================
// 4. RENDER FUNCTIONS
// ============================================

function renderHeader(job) {
    document.getElementById('val_est_no').innerText = job.estimateNo || "-";
    document.getElementById('val_user_no').innerText = job.userNumber || "-";

    document.getElementById('val_customer_name').innerText = job.customerName || "-";
    document.getElementById('val_house_no').innerText = job.houseNo || "-";
    document.getElementById('val_moo').innerText = job.moo || "-";
    document.getElementById('val_tambon').innerText = job.tambon || "-";
    document.getElementById('val_amphoe').innerText = job.amphoe || "-";
    document.getElementById('val_province').innerText = job.province || "-";
}

function renderTable(job, materials) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    // เรียกใช้ฟังก์ชันคำนวณจาก Utils.js
    const costs = Utils.calculateJobCosts(job.items, materials);
    const sections = costs.sections;
    const items = costs.sections; // Alias for easier refactoring if needed

    // Function สร้างตารางย่อย
    const renderSectionBlock = (sectionNum, sectionTitle, items, showBuffer, suppressTotalRow = false) => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr class="section-header">
                <td class="text-center fw-bold">${sectionNum}.</td>
                <td colspan="9" class="fw-bold">${sectionTitle}</td>
            </tr>
        `);

        let sumMat = 0;
        let sumLabor = 0;
        let sumTotal = 0;

        if (items.length === 0) {
            tbody.insertAdjacentHTML('beforeend', `<tr><td></td><td colspan="9" class="text-center text-muted">ไม่มีรายการ</td></tr>`);

            if (!suppressTotalRow) {
                tbody.insertAdjacentHTML('beforeend', `
                    <tr class="total-section-row">
                        <td></td><td colspan="4" class="text-center">รวมข้อ ${sectionNum}</td>
                        <td colspan="5" class="text-right">-</td>
                    </tr>
                `);
            }
            return 0;
        }

        items.forEach((item) => {
            const qty = parseFloat(item.quantity || 0);
            const matUnit = parseFloat(item.unitPriceMaterial || 0);
            const laborUnit = parseFloat(item.unitPriceLabor || 0);

            // Rounding for consistency
            const matTotal = Math.round(qty * matUnit);
            const laborTotal = Math.round(qty * laborUnit);
            const lineTotal = matTotal + laborTotal;

            sumMat += matTotal;
            sumLabor += laborTotal;
            sumTotal += lineTotal;

            let size = item.size || "-";

            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="col-seq"></td>
                    <td class="col-item">${item.itemName || item.name}</td>
                    <td class="col-size">${size}</td>
                    <td class="col-qty">${fmtInt(qty)}</td>
                    <td class="col-unit">${item.unit}</td>
                    <td class="col-money">${fmt(matUnit)}</td>
                    <td class="col-money">${fmt(matTotal)}</td>
                    <td class="col-money">${laborUnit > 0 ? fmt(laborUnit) : '-'}</td>
                    <td class="col-money">${laborTotal > 0 ? fmt(laborTotal) : '-'}</td>
                    <td class="col-money">${fmt(lineTotal)}</td>
                </tr>
            `);
        });

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="subtotal-row">
                <td></td><td colspan="4" class="text-center">รวม</td>
                <td></td><td class="col-money">${fmt(sumMat)}</td>
                <td></td><td class="col-money">${fmt(sumLabor)}</td>
                <td></td>
            </tr>
        `);

        let bufferVal = 0;
        if (showBuffer) {
            // Sec 1, 2 ไม่คิด Buffer 10% ในตารางนี้
            if (String(sectionNum) !== "1" && String(sectionNum) !== "2") {
                bufferVal = Math.round(sumMat * 0.10);
            }

            tbody.insertAdjacentHTML('beforeend', `
                <tr class="buffer-row">
                    <td></td><td colspan="4" class="text-center">เผื่อขาด 10 % (เฉพาะค่าวัสดุ)</td>
                    <td></td><td class="col-money">${bufferVal > 0 ? fmt(bufferVal) : '-'}</td>
                    <td class="col-money"></td><td class="col-money"></td><td class="col-money"></td>
                </tr>
            `);
        }

        const sectionGrandTotal = sumTotal + bufferVal;

        if (!suppressTotalRow) {
            tbody.insertAdjacentHTML('beforeend', `
                <tr class="total-section-row">
                    <td></td><td colspan="4" class="text-center">รวมข้อ ${sectionNum}</td>
                    <td></td><td class="col-money">${fmt(sumMat + bufferVal)}</td>
                    <td></td><td class="col-money">${fmt(sumLabor)}</td>
                    <td class="col-money">${fmt(sectionGrandTotal)}</td>
                </tr>
            `);
        }

        return sectionGrandTotal;
    };

    // --- วาดตาราง 1-4 ---
    // ถ้าเป็นเหมาจ่าย ให้ซ่อนแถวรวมของข้อ 1 และ 2 (เพราะจะไปแสดงยอดรวมที่บรรทัด "ราคาเหมาจ่าย" แทน)
    const suppressSec12 = costs.isLumpSum;

    const totalSec1 = renderSectionBlock(1, "ส่วนติดตั้งมาตรวัดน้ำ", sections[1], false, suppressSec12);
    let totalSec2 = renderSectionBlock(2, "ส่วนค่าติดตั้งเหมาจ่าย", sections[2], false, suppressSec12);

    // เพิ่มช่องราคาเหมาจ่าย (เฉพาะข้อ 2 ตามโจทย์)
    if (costs.isLumpSum) {
        tbody.insertAdjacentHTML('beforeend', `
                <tr class="total-section-row bg-lump-sum">
                    <td></td><td colspan="4" class="text-center fw-bold">ราคาเหมาจ่าย (มิเตอร์ขนาด ${costs.meterSize}")</td>
                    <td colspan="4"></td>
                    <td class="col-money fw-bold">${fmt(costs.lumpSumPrice)}</td>
                </tr>
            `);
        totalSec2 = costs.lumpSumPrice; // ใช้ราคาเหมาจ่ายในการรวมยอดถัดไป
    }

    const totalSec3 = renderSectionBlock(3, "ส่วนวางท่อภายใน", sections[3], true);
    const totalSec4 = renderSectionBlock(4, "ส่วนวางท่อภายนอก", sections[4], true);

    const sum34 = totalSec3 + totalSec4;

    // --- 5. Factor F ---
    let valFactorF = costs.valFactorF;

    tbody.insertAdjacentHTML('beforeend', `
        <tr>
            <td class="text-center fw-bold">5.</td>
            <td colspan="8" class="fw-bold">ค่าดำเนินการ FACTOR F=1.3642 X ผลรวมของ(ข้อ 3+4)</td>
            <td class="col-money">${fmt(valFactorF)}</td>
        </tr>
    `);

    // --- 6. Survey ---
    let valSurvey = costs.valSurvey;

    tbody.insertAdjacentHTML('beforeend', `
        <tr>
            <td class="text-center fw-bold">6.</td>
            <td colspan="8" class="fw-bold">ค่าสำรวจ 2 % ของ(ข้อ 3+4)</td>
            <td class="col-money">${valSurvey > 0 ? fmt(valSurvey) : '-'}</td>
        </tr>
    `);

    // --- 7. Fee ---
    let totalSec7 = 0;
    let qtySec7 = 0;
    sections[7].forEach(i => {
        totalSec7 += getItemTotal(i);
        qtySec7 += (parseFloat(i.quantity || 0));
    });

    tbody.insertAdjacentHTML('beforeend', `
        <tr>
            <td class="text-center fw-bold">7.</td>
            <td class="fw-bold">ค่าธรรมเนียมประสานท่อ</td>
            <td class="text-center">-</td>
            <td class="text-center">${qtySec7 > 0 ? fmtInt(qtySec7) : '-'}</td>
            <td class="text-center">จุด</td>
            <td class="text-right">-</td><td class="text-right">-</td><td class="text-right">-</td><td class="text-right">-</td>
            <td class="text-right col-money">${totalSec7 > 0 ? fmt(totalSec7) : '-'}</td>
        </tr>
    `);

    // --- 8. Deposit ---
    let totalSec8 = 0;
    let depositLabel = "เงินประกันการใช้มาตรวัดน้ำ";
    let depositSize = "";
    let depositQty = "";
    let depositUnit = "";

    if (sections[8].length > 0) {
        sections[8].forEach(i => totalSec8 += getItemTotal(i));
        const item = sections[8][0];
        depositSize = item.size || '1/2"';
        depositQty = fmtInt(parseFloat(item.quantity || 1));
        depositUnit = item.unit || 'เครื่อง';
    }

    tbody.insertAdjacentHTML('beforeend', `
        <tr>
            <td class="text-center fw-bold">8.</td>
            <td class="fw-bold">${depositLabel}</td>
            <td class="text-center">${depositSize}</td>
            <td class="text-center">${depositQty}</td>
            <td class="text-center">${depositUnit}</td>
            <td class="text-right">-</td><td class="text-right">-</td><td class="text-right">-</td><td class="text-right">-</td>
            <td class="col-money text-right">${fmt(totalSec8)}</td>
        </tr>
    `);

    // --- สรุปยอดรวม (ใช้ค่าจาก Utils) ---
    const grandTotal = costs.grandTotal;

    tbody.insertAdjacentHTML('beforeend', `
        <tr class="grand-total-row">
            <td></td>
            <td colspan="8" class="text-left">ค่าใช้จ่ายทั้งหมด รวมเงิน (ข้อ 1+2+5+6+7+8)</td>
            <td class="col-money">${fmt(grandTotal)}</td>
        </tr>
        <tr class="baht-text-row">
            <td colspan="10">( ${ThaiNumberToText(grandTotal)} )</td>
        </tr>
    `);
}

function renderSignatures(job, personnel) {
    const findPerson = (name) => personnel.find(p => p.name === name) || {};

    // ผู้สำรวจ
    const surveyor = findPerson(job.surveyorName);
    document.getElementById('val_surveyor_name').innerText = job.surveyorName || "..........................................";
    document.getElementById('val_surveyor_pos').innerText = surveyor.position || "..........................................";

    if (surveyor.signatureUrl) {
        const img = document.createElement('img');
        img.src = surveyor.signatureUrl;
        img.className = 'sig-img';
        document.getElementById('sig_surveyor_container').appendChild(img);
    }

    // ผู้ตรวจสอบ/อนุมัติ
    const inspector = findPerson(job.inspectorName);
    document.getElementById('val_approver_name').innerText = job.inspectorName || "..........................................";
    document.getElementById('val_approver_pos').innerText = inspector.position || "..........................................";

    if (inspector.signatureUrl) {
        const img = document.createElement('img');
        img.src = inspector.signatureUrl;
        img.className = 'sig-img';
        document.getElementById('sig_approver_container').appendChild(img);
    }
}

// ============================================
// 5. AUTO-FIT LOGIC
// ============================================
function autoFitPage() {
    const page = document.querySelector('.a4-page');
    // Reset zoom
    page.style.zoom = 1;

    // A4 Height ~ 297mm (approx 1123px @ 96dpi)
    // Safe height ~ 1115px to avoid browser margin issues
    const MAX_HEIGHT = 1115;
    const actualHeight = page.scrollHeight;

    if (actualHeight > MAX_HEIGHT) {
        const scale = MAX_HEIGHT / actualHeight;
        console.log(`⚠️ Content overflow! Scaling down: ${scale.toFixed(4)}`);
        page.style.zoom = scale;
    }
}
