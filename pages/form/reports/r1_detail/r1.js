// ============================================
// 1. ตั้งค่า (Configuration)
// ============================================

window.onload = async function () {
    // 1. ดึง ID จาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        alert("❌ ไม่พบรหัสงาน (Job ID) ใน URL\nกรุณาเข้าใช้งานผ่านหน้าแบบฟอร์มแล้วกดพิมพ์รายงานใหม่");
        return;
    }

    // 2. แสดงสถานะกำลังโหลด
    document.body.style.opacity = '0.5';
    document.title = "ใบแจ้งราคา " + jobId;

    try {
        // 3. ตรวจสอบ Cache ก่อน
        const cached = sessionStorage.getItem('REPORT_CACHE');
        let res;

        if (cached) {
            console.log('✅ Loading from cache...');
            res = JSON.parse(cached);
        } else {
            console.log('📡 Fetching from Supabase...');
            res = await DBManager.getDatabase();

            if (res.status !== 'success') throw new Error(res.message);
        }

        // 6. ค้นหา Job ที่ตรงกับ ID
        const job = res.jobs.find(j => String(j.jobId) === String(jobId));

        if (!job) {
            throw new Error(`ไม่พบข้อมูลงาน ID: ${jobId} (อาจยังไม่ได้บันทึกหรือบันทึกไม่สำเร็จ)`);
        }

        // 7. หาข้อมูลผู้อนุมัติเพื่อดึงลายเซ็น
        const approverName = job.approverName || "";
        const approverData = res.personnel.find(p => p.name === approverName);
        const approverSigUrl = approverData ? approverData.signatureUrl : "";

        // 8. ส่งข้อมูลไปแสดงผล
        renderReport(job, approverSigUrl, res.materials);

    } catch (error) {
        console.error("Error loading report:", error);
        alert(`เกิดข้อผิดพลาด:\n${error.message}\n\nคำแนะนำ: ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือสิทธิ์การเข้าถึง Script (Deploy as Anyone)`);
    } finally {
        document.body.style.opacity = '1';
    }
};

// ============================================
// 2. ฟังก์ชันแสดงผล (Render Logic)
// ============================================
function renderReport(data, approverSigUrl, materials) {
    console.log("Rendering Job Data:", data);

    // --- Helper Functions ---
    function formatDate(d) {
        if (!d) return "................................";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "................................";
        const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
    }

    function fmtNum(n) {
        return (parseFloat(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    // --- A. คำนวณเงิน (Logic รวมอยู่ที่ Utils.js) ---
    const costs = Utils.calculateJobCosts(data.items, materials);
    const constructionCost = costs.totalConstruction;
    const depositCost = costs.totalDeposit;
    const grandTotal = costs.grandTotal;



    // --- B. หยอดข้อมูลลงหน้าเว็บ ---
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    // 1. วันที่
    setText('val_date', formatDate(new Date()));
    setText('val_req_date', formatDate(data.requestDate));

    // 2. ข้อมูลลูกค้า
    setText('val_customer', data.customerName || "........................................");
    setText('val_req_no', data.requestNo || "....................");

    // 3. ที่อยู่
    const addr = `บ้านเลขที่ ${data.houseNo || '-'} หมู่ ${data.moo || '-'} ต.${data.tambon || '-'} อ.${data.amphoe || '-'} จ.${data.province || '-'}`;
    setText('val_address', addr);

    // 4. ตัวเลขการเงิน
    // - ข้อ 1: ส่วนติดตั้งมาตรวัดน้ำ
    setText('val_cost_meter', fmtNum(constructionCost));
    // - ข้อ 2: เงินประกัน (sec8)
    setText('val_cost_deposit', fmtNum(depositCost));
    // - รวมค่าใช้จ่าย (ทั้งหมดบวกกัน)
    setText('val_total', fmtNum(grandTotal));
    // - รวมในย่อหน้า
    setText('val_total_inline', fmtNum(grandTotal));

    // 5. บาทถ้วน
    const elTotalText = document.getElementById('val_total_text');
    if (elTotalText) {
        elTotalText.innerText = (grandTotal > 0) ? ThaiNumberToText(grandTotal) : "...........................................................";
    }

    // 6. ลายเซ็น
    const sigSpace = document.querySelector('.signature-space');
    if (sigSpace) {
        if (approverSigUrl) {
            sigSpace.innerHTML = `<img src="${approverSigUrl}" style="height: 100%; max-width: 100%; object-fit: contain;">`;
        } else {
            sigSpace.innerHTML = '';
        }
    }

    // 7. ผู้ลงนาม
    setText('val_approver', data.approverName || "........................................");
    setText('val_position', data.approverPos || "ผู้จัดการการประปาส่วนภูมิภาค(ชั้นพิเศษ) สาขาพระนครศรีอยุธยา");

    // --- C. จัดรูปแบบเอกสาร ---
    if (typeof enableBlockSplit === 'function') enableBlockSplit();
    if (typeof fixThaiLineBreaks === 'function') setTimeout(fixThaiLineBreaks, 500);
}

// --- ฟังก์ชันเสริม (คงเดิม) ---
function enableBlockSplit() {
    document.body.addEventListener('keydown', function (e) {
        if (e.shiftKey && e.key === 'Enter') {
            const el = e.target;
            if (el.isContentEditable && el.classList.contains('paragraph')) {
                e.preventDefault();
                const selection = window.getSelection();
                if (!selection.rangeCount) return;
                const range = selection.getRangeAt(0);
                range.setEndAfter(el.lastChild);
                const contentAfter = range.extractContents();
                const newBlock = document.createElement('div');
                newBlock.className = 'paragraph split-paragraph-bottom';
                newBlock.setAttribute('contenteditable', 'true');
                newBlock.appendChild(contentAfter);
                el.classList.add('split-paragraph-top');
                el.parentNode.insertBefore(newBlock, el.nextSibling);
                const newRange = document.createRange();
                newRange.selectNodeContents(newBlock);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                setTimeout(fixThaiLineBreaks, 100);
            }
        }
    });
}

// ============================================
// 3. Thai Distributed Text (Micro-Library)
// ============================================
const ThaiDistributed = (() => {
    // Configuration
    const CLASS_NAME = 'thai-distributed';
    const ZWSP = '\u200B';

    // Core Logic
    function processElement(el) {
        if (!('Intl' in window) || !('Segmenter' in window.Intl)) {
            console.warn('Intl.Segmenter is not supported in this browser.');
            return;
        }

        // Avoid reprocessing if already processed (optional, but good for performance)
        // For now, we allow reprocessing to handle dynamic updates

        // Use TreeWalker to handle nested nodes (like spans)
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        const segmenter = new Intl.Segmenter('th', { granularity: 'word' });

        let node;
        const textNodes = [];
        while (node = walker.nextNode()) textNodes.push(node);

        let isFirstNode = true;

        textNodes.forEach(node => {
            const text = node.textContent;
            if (!text.trim()) return; // Skip empty whitespace nodes

            // Optimization: check if already has ZWSP
            // But user might have edited text, so reliable re-segmentation is better.
            // We strip existing ZWSP first to ensure clean segmentation
            let cleanText = text.replace(/\u200B/g, '');

            // Fix: Strip leading whitespace from the first valid text node
            // This prevents double indentation from HTML source code (newlines + spaces)
            if (isFirstNode) {
                cleanText = cleanText.trimStart();
                isFirstNode = false;
            }

            const segments = segmenter.segment(cleanText);
            let distributedText = '';

            for (const { segment } of segments) {
                // If segment is whitespace, just add it (it breaks naturally)
                // Appending ZWSP to space might cause double-spacing artifacts in some browsers with 'justify'
                if (segment.trim().length === 0) {
                    distributedText += segment;
                } else {
                    distributedText += segment + ZWSP;
                }
            }

            // Only update if changed
            if (node.textContent !== distributedText) {
                node.textContent = distributedText;
            }
        });
    }

    function scan() {
        const elements = document.querySelectorAll(`.${CLASS_NAME}`);
        elements.forEach(processElement);
        console.log(`ThaiDistributed: Processed ${elements.length} elements.`);
    }

    // Auto-init
    function init() {
        scan();

        // Optional: Observer for dynamic content changes
        // const observer = new MutationObserver((mutations) => { ... });
        // observer.observe(document.body, { childList: true, subtree: true });
    }

    return {
        init,
        scan,
        process: processElement
    };
})();

// Expose to window for button access
window.fixThaiLineBreaks = function () {
    // ThaiDistributed.scan(); // Disabled by user request
    console.log("Thai Distributed is currently disabled.");
}

// Auto-run when DOM is ready (called from renderReport)
// We also add a listener for DOMContentLoaded just in case
document.addEventListener('DOMContentLoaded', () => {
    // ThaiDistributed.init(); // We call this in renderReport after data is loaded
});

window.ThaiDistributed = ThaiDistributed;
