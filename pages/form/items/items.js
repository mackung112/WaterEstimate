/**
 * ItemsComponent
 * จัดการรายการวัสดุ การคำนวณราคา และการแสดงผลในหน้าฟอร์ม
 */
var ItemsComponent = {
    currentItems: [],
    materials: [],

    // Mapping Section Name -> ID
    SECTION_MAPPING: {
        "1. ส่วนติดตั้งมาตรวัดน้ำ": "sec1",
        "2. ส่วนค่าติดตั้งเหมาจ่าย": "sec2",
        "3. ส่วนวางท่อภายใน": "sec3",
        "4. ส่วนวางท่อภายนอก": "sec4",
        "7. ส่วนค่าธรรมเนียมประสานท่อ": "sec7",
        "8. เงินประกันมาตรวัดน้ำ": "sec8"
    },

    // Default Configuration for New Jobs
    defaults: {
        "1/2": {
            sec1: ["MAT-000197"],
            sec2: ["MAT-000102", "MAT-000187", "MAT-000213", "MAT-000130", "MAT-000140", "MAT-000150",
                "MAT-000191", "MAT-000196"],
            sec4: ["MAT-000213", "MAT-000102", "MAT-000005", "MAT-000130", "MAT-000140"]
        },
        "3/4": {
            sec1: ["MAT-000198"],
            sec2: ["MAT-000102", "MAT-000187", "MAT-000213", "MAT-000130", "MAT-000140", "MAT-000151",
                "MAT-000194", "MAT-000097", "MAT-000223", "MAT-000224", "MAT-000225", "MAT-000226", "MAT-000227"],
            sec4: ["MAT-000213", "MAT-000102", "MAT-000005", "MAT-000130", "MAT-000140"]
        }
    },

    /**
     * Initialize Component
     * @param {Array} materialsData - List of available materials
     */
    init: async (materialsData) => {
        console.log("ItemsComponent Init");
        ItemsComponent.materials = materialsData || [];
        ItemsComponent.currentItems = [];
        ItemsComponent.renderAllSections();
        ItemsComponent.setupClickOutsideListener();
    },

    // ============================================================
    // 1. DATA MANAGEMENT (LOAD/SAVE)
    // ============================================================

    /**
     * Load items into the form (e.g. from Edit Mode)
     * @param {Array} items 
     */
    setItems: (items) => {
        // Filter out auto-calculated items (Factor F, Survey) as they are regenerated
        const realItems = (items || []).filter(i => {
            const s = i.section;
            return s !== 'sec5' && s !== 'sec6';
        });

        ItemsComponent.currentItems = realItems.map((item, index) => ({
            id: item.id || (Date.now() + index),
            section: item.section,
            materialId: item.materialId,
            name: item.itemName || item.name, // Support both keys
            quantity: parseFloat(item.quantity || item.qty || 0),
            unit: item.unit,
            unitPriceMaterial: parseFloat(item.unitPriceMaterial || 0),
            unitPriceLabor: parseFloat(item.unitPriceLabor || 0)
        }));

        ItemsComponent.renderAllSections();
        ItemsComponent.calculateTotals();
    },

    /**
     * Prepare items for saving/exporting
     * @returns {Array} List of items with calculated totals
     */
    getItems: () => {
        // Calculate costs using central Utils
        const costs = Utils.calculateJobCosts(
            ItemsComponent.currentItems,
            ItemsComponent.materials,
            ItemsComponent.getMeterSize()
        );

        const currentJobId = document.querySelector('[name="Job_ID"]')?.value || ('JOB-' + Date.now());

        // 1. Map existing items
        const exportItems = ItemsComponent.currentItems.map((item, index) => {
            const rawMat = parseFloat(item.unitPriceMaterial || 0);
            const labor = parseFloat(item.unitPriceLabor || 0);
            const qty = parseFloat(item.quantity || 0);

            let finalLineTotal = 0;

            if (item.section === 'sec3' || item.section === 'sec4') {
                const matWithBuffer = rawMat * 1.10;
                finalLineTotal = Math.round((matWithBuffer + labor) * qty);
            } else {
                finalLineTotal = Math.round((rawMat + labor) * qty);
            }

            return {
                transactionId: `${currentJobId}-${index + 1}`,
                jobId: currentJobId,
                section: item.section,
                materialId: item.materialId,
                itemName: item.name,
                quantity: qty,
                unit: item.unit,
                unitPriceMaterial: rawMat,
                unitPriceLabor: labor,
                totalPrice: finalLineTotal
            };
        });

        let nextIndex = exportItems.length + 1;

        // 2. Add Factor F (Auto-calculated)
        if (costs.valFactorF > 0) {
            exportItems.push({
                transactionId: `${currentJobId}-${nextIndex++}`,
                jobId: currentJobId,
                section: 'sec5',
                materialId: 'FACTOR-F',
                itemName: 'ค่าดำเนินการ FACTOR F (1.3642)',
                quantity: 1,
                unit: 'งาน',
                unitPriceMaterial: costs.valFactorF,
                unitPriceLabor: 0,
                totalPrice: costs.valFactorF
            });
        }

        // 3. Add Survey Fee (Auto-calculated)
        if (costs.valSurvey > 0) {
            exportItems.push({
                transactionId: `${currentJobId}-${nextIndex++}`,
                jobId: currentJobId,
                section: 'sec6',
                materialId: 'SURVEY-FEE',
                itemName: 'ค่าสำรวจ 2%',
                quantity: 1,
                unit: 'งาน',
                unitPriceMaterial: costs.valSurvey,
                unitPriceLabor: 0,
                totalPrice: costs.valSurvey
            });
        }

        return exportItems;
    },

    // ============================================================
    // 2. LOGIC & INTERACTION
    // ============================================================

    setMeterSize: (size) => {
        if (!size) return;
        const cleanSize = size.replace(/"/g, '');
        const radio = document.querySelector(`input[name="meterSize"][value="${cleanSize}"]`);
        if (radio) radio.checked = true;
    },

    getMeterSize: () => {
        const radio = document.querySelector('input[name="meterSize"]:checked');
        return radio ? radio.value : '';
    },

    /**
     * Apply default items based on meter size
     * @param {string} size - "1/2" or "3/4"
     */
    applyDefaultItems: (size) => {
        if (ItemsComponent.currentItems.length > 0) {
            if (!confirm(`มีข้อมูลอยู่แล้ว ต้องการล้างและใช้ชุดมาตรฐาน ${size}" หรือไม่?`)) return;
        }

        // Update Job ID Prefix Logic
        const jobIdInput = document.querySelector('[name="Job_ID"]');
        if (jobIdInput) {
            let currentId = jobIdInput.value || '';
            let newPrefix = '';

            if (size === '1/2') newPrefix = '12';
            else if (size === '3/4') newPrefix = '34';

            if (newPrefix) {
                if (currentId.match(/^\d{2}-/)) {
                    jobIdInput.value = newPrefix + currentId.substring(2);
                } else if (currentId.startsWith('JOB-')) {
                    jobIdInput.value = newPrefix + '-' + currentId.substring(4);
                } else {
                    jobIdInput.value = newPrefix + '-' + currentId;
                }
            }
        }

        // Apply Items
        ItemsComponent.currentItems = [];
        let missingCount = 0;
        const config = ItemsComponent.defaults[size];

        if (config) {
            for (const [section, ids] of Object.entries(config)) {
                ids.forEach(id => {
                    let mat = ItemsComponent.materials.find(m => String(m.materialId) === String(id));

                    // Fallback removed as IDs are corrected in defaults
                    if (mat) {
                        ItemsComponent.addItemInternal(section, mat, 1);
                    } else {
                        console.warn(`Material not found for default set: ${id}`);
                        missingCount++;
                    }
                });
            }
        }

        // Notify user if materials are missing (Fix for Calculation Issue)
        if (missingCount > 0) {
            Utils.showToast(`ไม่พบข้อมูลวัสดุตั้งต้นจำนวน ${missingCount} รายการ (อาจทำให้การคำนวณผิดพลาด)`, 'error');
        }

        ItemsComponent.renderAllSections();
        ItemsComponent.calculateTotals();
    },

    addItemInternal: (sectionKey, mat, qty = 1) => {
        console.log("Adding Item from Internal:", mat);
        ItemsComponent.currentItems.push({
            id: Date.now() + Math.random(),
            section: sectionKey,
            materialId: mat.materialId,
            name: mat.itemName,
            quantity: parseFloat(qty),
            unit: mat.unit || '',
            unitPriceMaterial: parseFloat(mat.unitPriceMaterial || 0),
            unitPriceLabor: parseFloat(mat.unitPriceLabor || 0)
        });
    },

    addItemFromSearch: (materialId, sectionKey) => {
        const mat = ItemsComponent.materials.find(m => String(m.materialId) === String(materialId));
        if (mat) {
            // เช็คว่ามีรายการซ้ำในหมวดเดียวกันหรือไม่
            const existingItem = ItemsComponent.currentItems.find(item =>
                String(item.materialId) === String(materialId) && item.section === sectionKey
            );

            if (existingItem) {
                // ถ้าซ้ำ ให้เพิ่มจำนวนแทน
                existingItem.quantity += 1;
            } else {
                // ถ้าไม่ซ้ำ ให้เพิ่มรายการใหม่
                ItemsComponent.addItemInternal(sectionKey, mat, 1);
            }

            ItemsComponent.renderSection(sectionKey);
            ItemsComponent.calculateTotals();

            // Clear Search
            const searchInput = document.getElementById(`search-${sectionKey}`);
            if (searchInput) { searchInput.value = ''; searchInput.focus(); }
            document.getElementById(`results-${sectionKey}`).style.display = 'none';
        }
    },

    adjustQty: (id, delta) => {
        const item = ItemsComponent.currentItems.find(i => String(i.id) === String(id));
        if (item) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                ItemsComponent.removeItem(id);
            } else {
                item.quantity = newQty;
                ItemsComponent.renderSection(item.section);
                ItemsComponent.calculateTotals();
            }
        }
    },

    removeItem: (id) => {
        ItemsComponent.currentItems = ItemsComponent.currentItems.filter(i => String(i.id) !== String(id));
        ItemsComponent.renderAllSections();
        ItemsComponent.calculateTotals();
    },

    // ============================================================
    // 3. RENDERING
    // ============================================================

    renderAllSections: () => {
        ['sec1', 'sec2', 'sec3', 'sec4', 'sec7', 'sec8'].forEach(sec => ItemsComponent.renderSection(sec));
    },

    renderSection: (sectionKey) => {
        const container = document.getElementById(`list-${sectionKey}`);
        if (!container) return;

        const items = ItemsComponent.currentItems.filter(i => i.section === sectionKey);

        let html = items.map(item => `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2 border-bottom">
                <button type="button" class="btn btn-sm text-danger me-2" onclick="ItemsComponent.removeItem('${item.id}')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="flex-grow-1">
                    <div class="fw-bold text-dark small">${item.name}</div>
                    <div class="text-muted text-small-75">
                        (วัสดุ ${item.unitPriceMaterial} + แรง ${item.unitPriceLabor}) / ${item.unit}
                    </div>
                </div>
                <div class="input-group input-group-sm qty-input-group">
                    <button type="button" class="btn btn-outline-secondary" onclick="ItemsComponent.adjustQty('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
                    <input type="text" class="form-control text-center bg-white px-0 fw-bold" value="${item.quantity}" readonly>
                    <button type="button" class="btn btn-outline-secondary" onclick="ItemsComponent.adjustQty('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>`).join('');

        if (items.length === 0) html += `<div class="text-center text-muted small py-3 opacity-50 fst-italic">ไม่มีรายการ</div>`;

        html += `
        <div class="mt-2 pt-2 border-top bg-light rounded-3 p-2 position-relative search-container">
            <div class="input-group input-group-sm">
                <span class="input-group-text bg-white border-end-0 text-muted"><i class="fa-solid fa-magnifying-glass"></i></span>
                <input type="text" class="form-control border-start-0" id="search-${sectionKey}" placeholder="ค้นหาวัสดุ..." 
                    onkeyup="ItemsComponent.searchLocal(this.value, '${sectionKey}')" 
                    onfocus="ItemsComponent.searchLocal(this.value, '${sectionKey}')" autocomplete="off">
            </div>
            <div id="results-${sectionKey}" class="list-group position-absolute w-100 shadow start-0 mt-1 search-results-dropdown"></div>
        </div>`;

        container.innerHTML = html;

        // Note: Event listener here might duplicate if renderSection called multiple times.
        // Better to attach once in init, but for now keeping logic contained.
        // Ideally should remove old listener or check if exists.
    },

    /**
     * Calculate and Update UI Totals
     */
    calculateTotals: () => {
        console.log("Calculating Totals for:", ItemsComponent.currentItems);
        const t = Utils.calculateJobCosts(
            ItemsComponent.currentItems,
            ItemsComponent.materials,
            ItemsComponent.getMeterSize()
        );
        console.log("Calculation Result:", t);

        const fmt = (n) => Utils.formatCurrency(n);
        const update = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        // Update Section Totals
        update('total-sec1', fmt(t.breakdowns[1].total));
        update('total-sec2', fmt(t.breakdowns[2].total));
        update('total-sec7', fmt(t.breakdowns[7].total));
        update('total-sec8', fmt(t.breakdowns[8].total));

        // Update Complex Sections (3 & 4)
        update('total-sec3', fmt(t.breakdowns[3].total));
        update('sum-sec3-mat', fmt(t.breakdowns[3].mat));
        update('sum-sec3-buffer', fmt(t.breakdowns[3].buffer));
        update('sum-sec3-labor', fmt(t.breakdowns[3].labor));

        update('total-sec4', fmt(t.breakdowns[4].total));
        update('sum-sec4-mat', fmt(t.breakdowns[4].mat));
        update('sum-sec4-buffer', fmt(t.breakdowns[4].buffer));
        update('sum-sec4-labor', fmt(t.breakdowns[4].labor));

        // Update Auto-Calculated Fields
        update('total-sec5', fmt(t.valFactorF));
        update('total-sec6', fmt(t.valSurvey));

        // Update Lump Sum & Grand Total
        update('lumpSumPrice', fmt(t.lumpSumPrice));
        update('items-grand-total', fmt(t.grandTotal) + ' บาท');

        // Toggle Lump Sum Indicator
        const sec2Header = document.getElementById('total-sec2');
        if (sec2Header) {
            if (t.isLumpSum) {
                sec2Header.title = `ราคาเหมาจ่ายจริงที่ใช้คำนวณ = ${fmt(t.lumpSumPrice)}`;
                sec2Header.classList.add('bg-success', 'text-dark');
            } else {
                sec2Header.title = "";
                sec2Header.classList.remove('bg-success', 'text-dark');
            }
        }
    },

    searchLocal: (query, sectionKey) => {
        const resultsDiv = document.getElementById(`results-${sectionKey}`);
        const lowerQ = query ? query.toLowerCase() : "";
        let matches = ItemsComponent.materials.filter(m =>
            !lowerQ ||
            (m.itemName && m.itemName.toLowerCase().includes(lowerQ)) ||
            (m.materialId && String(m.materialId).toLowerCase().includes(lowerQ))
        ).slice(0, 20);

        matches.sort((a, b) => {
            const secA = ItemsComponent.SECTION_MAPPING[a.category] === sectionKey ? 1 : 0;
            const secB = ItemsComponent.SECTION_MAPPING[b.category] === sectionKey ? 1 : 0;
            return secB - secA;
        });

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(m => `
                <button type="button" class="list-group-item list-group-item-action ${ItemsComponent.SECTION_MAPPING[m.category] === sectionKey ? 'list-group-item-light' : ''} d-flex justify-content-between align-items-center small" 
                    onclick="ItemsComponent.addItemFromSearch('${m.materialId}', '${sectionKey}')">
                    <div>
                        <span class="fw-bold text-dark">${m.itemName}</span>
                        <div class="text-muted d-flex gap-2 text-small-70"><span>${m.materialId}</span></div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-light text-dark border">วัสดุ ${m.unitPriceMaterial}</span>
                        <br><span class="badge bg-light text-secondary border mt-1">แรง ${m.unitPriceLabor}</span>
                    </div>
                </button>`).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    },

    /**
     * ปิด dropdown รายการค้นหาเมื่อคลิกนอกพื้นที่
     */
    setupClickOutsideListener: () => {
        document.addEventListener('click', (event) => {
            // ตรวจสอบว่าคลิกนอก search container หรือไม่
            const searchContainers = document.querySelectorAll('.search-container');
            let clickedInside = false;

            searchContainers.forEach(container => {
                if (container.contains(event.target)) {
                    clickedInside = true;
                }
            });

            // ถ้าคลิกนอกพื้นที่ ให้ปิด dropdown ทั้งหมด
            if (!clickedInside) {
                ['sec1', 'sec2', 'sec3', 'sec4', 'sec7', 'sec8'].forEach(sec => {
                    const resultsDiv = document.getElementById(`results-${sec}`);
                    if (resultsDiv) resultsDiv.style.display = 'none';
                });
            }
        });
    }
};
