/**
 * Utils - ฟังก์ชันอรรถประโยชน์กลาง
 * รวมฟังก์ชันอรรถประโยชน์ที่ใช้บ่อยในระบบ
 */
const Utils = {
    /**
     * แปลงวันที่เป็นรูปแบบภาษาไทย (เช่น 12 ส.ค. 2567)
     * @param {string} dateString - วันที่ในรูปแบบ ISO หรือ Date String
     * @returns {string} วันที่ที่ฟอร์แมตแล้ว หรือ "-"
     */
    formatThaiDate: (dateString) => {
        if (!dateString || dateString === '-') return "-";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";

        const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
    },

    /**
     * แปลงวันที่และเวลาเป็นรูปแบบภาษาไทย (เช่น 13 ก.พ. 2569 เวลา 10:25 น.)
     * @param {string} dateString - วันที่ในรูปแบบ ISO หรือ Date String
     * @returns {string} วันที่และเวลาที่ฟอร์แมตแล้ว หรือ "-"
     */
    formatThaiDateTime: (dateString) => {
        if (!dateString || dateString === '-') return "-";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";

        const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543} เวลา ${hours}:${minutes} น.`;
    },

    /**
     * แปลงตัวเลขเป็นรูปแบบเงิน (มีลูกนํ้าและทศนิยม 2 ตำแหน่ง)
     * @param {number|string} amount - จำนวนเงิน
     * @returns {string} ข้อความรูปแบบเงิน (เช่น "1,200.00")
     */
    formatCurrency: (amount) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return "0.00";
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    /**
     * แสดงข้อความแจ้งเตือน (Toast Message)
     * @param {string} message - ข้อความที่ต้องการแสดง
     * @param {'success'|'error'|'info'} type - ประเภทการแจ้งเตือน
     */
    showToast: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-message ${type}`;

        let iconClass = 'fa-solid fa-check';
        if (type === 'error') iconClass = 'fa-solid fa-circle-danger';
        if (type === 'info') iconClass = 'fa-solid fa-circle-info';

        toast.innerHTML = `
            <div class="toast-icon"><i class="${iconClass}"></i></div>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // บังคับ reflow เพื่อเริ่ม animation
        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    /**
     * คำนวณค่าใช้จ่ายทั้งหมดของงาน
     * @param {Array} items - รายการสินค้า/บริการ
     * @param {Array} materials - ข้อมูลวัสดุทั้งหมด (เพื่ออ้างอิงราคาสำรอง)
     * @param {string} explicitMeterSize - ขนาดมิเตอร์ที่ระบุ (เช่น "1/2")
     * @returns {Object} ผลลัพธ์การคำนวณแยกตาม Section
     */
    calculateJobCosts: (items, materials, explicitMeterSize = null) => {
        const sections = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
        // breakdowns tracks { mat, labor, buffer, total } for each section
        const breakdowns = {
            1: { mat: 0, labor: 0, buffer: 0, total: 0 },
            2: { mat: 0, labor: 0, buffer: 0, total: 0 },
            3: { mat: 0, labor: 0, buffer: 0, total: 0 },
            4: { mat: 0, labor: 0, buffer: 0, total: 0 },
            5: { mat: 0, labor: 0, buffer: 0, total: 0 },
            6: { mat: 0, labor: 0, buffer: 0, total: 0 },
            7: { mat: 0, labor: 0, buffer: 0, total: 0 },
            8: { mat: 0, labor: 0, buffer: 0, total: 0 }
        };

        let meterSize = explicitMeterSize || "";

        // ฟังก์ชันช่วยปัดเศษเป็นจำนวนเต็ม
        const round = (n) => Math.round(n);

        // 1. จัดกลุ่มรายการและคำนวณยอด
        (items || []).forEach(item => {
            const rawSec = String(item.section || '').toLowerCase().replace(/\s/g, '');
            let secNum = 0;

            if (rawSec.includes('sec1') || rawSec === '1') secNum = 1;
            else if (rawSec.includes('sec2') || rawSec === '2') secNum = 2;
            else if (rawSec.includes('sec3') || rawSec === '3') secNum = 3;
            else if (rawSec.includes('sec4') || rawSec === '4') secNum = 4;
            else if (rawSec.includes('factor') || rawSec.includes('sec5') || rawSec === '5') secNum = 5;
            else if (rawSec.includes('survey') || rawSec.includes('sec6') || rawSec === '6') secNum = 6;
            else if (rawSec.includes('fee') || rawSec.includes('sec7') || rawSec === '7') secNum = 7;
            else if (rawSec.includes('deposit') || rawSec.includes('sec8') || rawSec === '8') secNum = 8;

            if (secNum === 0) {
                const match = rawSec.match(/(\d+)/);
                if (match) {
                    const n = parseInt(match[0]);
                    if (n >= 1 && n <= 8) secNum = n;
                }
            }

            if (secNum > 0) {
                sections[secNum].push(item);

                const qty = parseFloat(item.quantity || 0);
                let mat = parseFloat(item.unitPriceMaterial || 0);
                let labor = parseFloat(item.unitPriceLabor || 0);

                // Track raw costs
                breakdowns[secNum].mat += (mat * qty);
                breakdowns[secNum].labor += (labor * qty);

                let lineTotal = parseFloat(item.totalPrice || 0);

                // If totalPrice is missing, calculate it
                if (!lineTotal && qty > 0) {
                    if (secNum === 3 || secNum === 4) {
                        // Include 10% buffer on material
                        lineTotal = ((mat * 1.10) + labor) * qty;
                    } else {
                        lineTotal = (mat + labor) * qty;
                    }
                }

                // Round line total to integer
                lineTotal = round(lineTotal);
                breakdowns[secNum].total += lineTotal;

                // ตรวจหาขนาดมาตรถ้าไม่ระบุไว้
                if (!explicitMeterSize && (secNum === 1 || secNum === 8)) {
                    if (item.materialId === 'MAT-000197') meterSize = "1/2";
                    else if (item.materialId === 'MAT-000198') meterSize = "3/4";
                    else if (item.itemName) {
                        if (item.itemName.includes('1/2')) meterSize = "1/2";
                        else if (item.itemName.includes('3/4')) meterSize = "3/4";
                    }
                }
            }
        });

        // คำนวณค่าสำรองวัสดุ 10% สำหรับ Section 3 และ 4
        breakdowns[3].buffer = round(breakdowns[3].mat * 0.10);
        breakdowns[4].buffer = round(breakdowns[4].mat * 0.10);

        // ตรวจยอดรวมใหม่สำหรับ Section 3 และ 4
        breakdowns[3].total = breakdowns[3].mat + breakdowns[3].labor + breakdowns[3].buffer;
        breakdowns[4].total = breakdowns[4].mat + breakdowns[4].labor + breakdowns[4].buffer;

        // 2. คำนวณ Factor F และ ค่าสำรวจ
        const sum34 = breakdowns[3].total + breakdowns[4].total;
        let valFactorF = breakdowns[5].total;
        let valSurvey = breakdowns[6].total;

        // คำนวณอัตโนมัติถ้าไม่มีค่า
        if (sections[5].length === 0 && sum34 > 0) {
            valFactorF = round(sum34 * 1.3642);
        }
        if (sections[6].length === 0 && sum34 > 0) {
            valSurvey = round(sum34 * 0.02);
        }

        // 3. ลอจิกราคาเหมาจ่าย
        let lumpSumPrice = 0;
        let isLumpSum = false;

        const cleanSize = String(meterSize).replace(/"/g, '').trim();

        if (cleanSize === '1/2') {
            lumpSumPrice = 3600;
            isLumpSum = true;
        } else if (cleanSize === '3/4') {
            lumpSumPrice = 4700;
            isLumpSum = true;
        }

        const s12_total = isLumpSum ? lumpSumPrice : (breakdowns[1].total + breakdowns[2].total);
        let totalConstruction = s12_total + valFactorF + valSurvey + breakdowns[7].total;
        const totalDeposit = breakdowns[8].total;
        const grandTotal = totalConstruction + totalDeposit;

        return {
            sections,
            breakdowns,
            summedSections: { // Backward compatibility
                1: breakdowns[1].total,
                2: breakdowns[2].total,
                3: breakdowns[3].total,
                4: breakdowns[4].total,
                5: breakdowns[5].total,
                6: breakdowns[6].total,
                7: breakdowns[7].total,
                8: breakdowns[8].total
            },
            valFactorF,
            valSurvey,
            totalConstruction,
            totalDeposit,
            grandTotal,
            isLumpSum,
            lumpSumPrice,
            meterSize
        };
    },

    /**
     * แปลงไฟล์เป็น Base64
     */
    fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    /**
     * ย่อขนาดรูปภาพ
     */
    resizeImage: (file, maxSize, quality) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(file.type, quality));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }
};
