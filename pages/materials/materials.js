/**
 * Materials Controller
 * จัดการหน้าจอรายการวัสดุ (CRUD)
 */
const Materials = {
    data: [],
    sortState: { column: 'materialId', direction: 'asc' },
    modal: null,

    // ตั้งค่าสีและไอคอนตามประเภทวัสดุ
    categoryConfig: {
        '1. ส่วนติดตั้งมาตรวัดน้ำ': { class: 'cat-pvc', icon: 'fa-solid fa-faucet' },
        '2. ส่วนค่าติดตั้งเหมาจ่าย': { class: 'cat-pb', icon: 'fa-solid fa-box-open' },
        '3. ส่วนวางท่อภายใน': { class: 'cat-pe', icon: 'fa-solid fa-arrow-right-to-bracket' },
        '4. ส่วนวางท่อภายนอก': { class: 'cat-g', icon: 'fa-solid fa-arrow-right-from-bracket' },
        '7. ส่วนค่าธรรมเนียมประสานท่อ': { class: 'cat-pb', icon: 'fa-solid fa-file-invoice-dollar' },
        '8. เงินประกันมาตรวัดน้ำ': { class: 'cat-pvc', icon: 'fa-solid fa-shield-halved' },
        'default': { class: 'cat-g', icon: 'fa-solid fa-box' }
    },

    /**
     * เริ่มต้นหน้าจัดการวัสดุ
     * @param {boolean} forceRefresh - บังคับดึงข้อมูลใหม่จากฐานข้อมูล
     */
    init: async (forceRefresh = false) => {
        const el = document.getElementById('materialModal');
        if (el) Materials.modal = new bootstrap.Modal(el);

        // 1. แสดง Skeleton ถ้าตารางว่าง
        if (forceRefresh || Materials.data.length === 0) Materials.renderSkeleton();

        // 2. โหลดจาก Cache
        const cached = localStorage.getItem('cache_materials');
        if (cached && !forceRefresh) {
            Materials.data = JSON.parse(cached);
            Materials.render(Materials.data);
            Materials.fetchData(true); // รีเฟรชเบื้องหลัง
        } else {
            if (forceRefresh) localStorage.removeItem('cache_materials');
            await Materials.fetchData();
        }
    },

    /**
     * ดึงข้อมูลวัสดุจากฐานข้อมูล
     * @param {boolean} isBackground - ดึงแบบเบื้องหลังหรือไม่
     */
    fetchData: async (isBackground = false) => {
        try {
            const res = await DBManager.getDatabase();
            if (res.status === 'success') {
                Materials.data = res.materials || [];
                localStorage.setItem('cache_materials', JSON.stringify(Materials.data));
                Materials.render(Materials.data);
            } else if (!isBackground) {
                Utils.showToast(res.message || "โหลดข้อมูลไม่สำเร็จ", 'error');
            }
        } catch (error) {
            console.error(error);
            if (!isBackground) {
                Utils.showToast("ไม่สามารถเชื่อมต่อฐานข้อมูลได้", 'error');
            }
        }
    },

    renderSkeleton: () => {
        const tbody = document.getElementById('materialsTableBody');
        let html = '';
        for (let i = 0; i < 6; i++) {
            html += `
                <tr>
                    <td class="ps-4 d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                    <td>
                        <div class="skeleton skeleton-text" style="width: 70%;"></div>
                        <div class="skeleton skeleton-text d-md-none mt-1" style="width: 40%;"></div>
                    </td>
                    <td class="d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                    <td class="d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
                    <td class="text-end d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                    <td class="text-end d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                    <td class="text-end pe-4"><div class="skeleton skeleton-text" style="width: 60px; display:inline-block"></div></td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    },

    render: (list) => {
        const countEl = document.getElementById('matTotalCount');
        if (countEl) countEl.innerText = list ? list.length : 0;

        const tbody = document.getElementById('materialsTableBody');
        const emptyState = document.getElementById('matEmptyState');

        if (!list || list.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
            return;
        }
        emptyState.classList.add('d-none');

        // เรียงลำดับข้อมูล
        list.sort((a, b) => {
            const col = Materials.sortState.column;
            const dir = Materials.sortState.direction === 'asc' ? 1 : -1;
            let valA = a[col];
            let valB = b[col];

            if (col.includes('Price')) {
                return (parseFloat(valA || 0) - parseFloat(valB || 0)) * dir;
            }
            return String(valA || '').localeCompare(String(valB || ''), 'th') * dir;
        });

        // อัพเดตไอคอนเรียงลำดับ
        document.querySelectorAll('.fa-sort, .fa-sort-up, .fa-sort-down').forEach(el => {
            el.className = 'fa-solid fa-sort ms-1 opacity-25';
        });
        const icon = document.getElementById(`sort-${Materials.sortState.column}`);
        if (icon) {
            icon.className = `fa-solid fa-sort-${Materials.sortState.direction === 'asc' ? 'up' : 'down'} ms-1 text-primary`;
        }

        tbody.innerHTML = list.map((m, index) => {
            const config = Materials.categoryConfig[m.category] || Materials.categoryConfig['default'];
            const delay = Math.min(index * 0.03, 0.5);

            const priceMat = parseFloat(m.unitPriceMaterial || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            const priceLab = parseFloat(m.unitPriceLabor || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            const sizeUnit = `${m.size || '-'} ${m.unit ? '/ ' + m.unit : ''}`;

            return `
            <tr class="table-row-anim" style="animation-delay: ${delay}s">
                <td class="ps-4 text-muted small font-monospace d-none d-md-table-cell">
                    ${m.materialId || '-'}
                </td>
                
                <td>
                    <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${m.itemName}</div>
                    
                    <div class="d-md-none small mt-1">
                        <div class="text-muted mb-1" style="font-size: 0.75rem;">
                            <i class="fa-solid fa-barcode me-1"></i>${m.materialId || '-'} 
                            <span class="mx-1">•</span> 
                            ${sizeUnit}
                        </div>
                        <div style="font-size: 0.75rem;">
                             <span class="text-primary fw-bold">${priceMat}</span> <span class="text-muted">/</span> 
                             <span class="text-success fw-bold">${priceLab}</span> บ.
                        </div>
                    </div>
                </td>
                
                <td class="text-secondary small d-none d-md-table-cell">${sizeUnit}</td>
                
                <td class="d-none d-md-table-cell">
                    <span class="cat-badge ${config.class}">
                        <i class="${config.icon} me-1" style="font-size: 0.7rem;"></i>${m.category || 'General'}
                    </span>
                </td>
                
                <td class="text-end price-tag text-primary d-none d-md-table-cell">${priceMat}</td>
                <td class="text-end price-tag text-success d-none d-md-table-cell">${priceLab}</td>
                
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-light btn-sm text-primary rounded-circle btn-hover-scale me-2" onclick="Materials.edit('${m.materialId}')" title="แก้ไข">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-light btn-sm text-danger rounded-circle btn-hover-scale" onclick="Materials.delete('${m.materialId}')" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    },

    filter: () => {
        const textTerm = document.getElementById('matSearchInput').value.toLowerCase();
        const catFilter = document.getElementById('catFilter').value.toLowerCase();

        const filtered = Materials.data.filter(m => {
            const matchesText = (
                (m.itemName && m.itemName.toLowerCase().includes(textTerm)) ||
                (m.materialId && String(m.materialId).toLowerCase().includes(textTerm)) ||
                (m.category && m.category.toLowerCase().includes(textTerm)) ||
                (m.size && m.size.toLowerCase().includes(textTerm))
            );
            const matchesCat = catFilter === '' || (m.category && m.category.toLowerCase().includes(catFilter));
            return matchesText && matchesCat;
        });

        Materials.render(filtered);
    },

    sort: (column) => {
        if (Materials.sortState.column === column) {
            Materials.sortState.direction = Materials.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            Materials.sortState.column = column;
            Materials.sortState.direction = 'asc';
        }
        Materials.filter();
    },

    // ============================================================
    // ฟอร์ม MODAL และ CRUD
    // ============================================================

    openModal: () => {
        document.getElementById('materialForm').reset();
        const idInput = document.querySelector('[name="Material_ID"]');
        idInput.value = '';
        idInput.readOnly = false;
        idInput.placeholder = "Auto";

        document.getElementById('materialModalLabel').innerHTML = '<i class="fa-solid fa-plus me-2"></i>เพิ่มวัสดุใหม่';
        Materials.modal.show();
    },

    edit: (id) => {
        const mat = Materials.data.find(m => String(m.materialId) === String(id));
        if (!mat) return;

        const form = document.getElementById('materialForm');
        form.querySelector('[name="Material_ID"]').value = mat.materialId;
        form.querySelector('[name="Material_ID"]').readOnly = true;
        form.querySelector('[name="Item_Name"]').value = mat.itemName || '';
        form.querySelector('[name="Category"]').value = mat.category || '';
        form.querySelector('[name="Size"]').value = mat.size || '';
        form.querySelector('[name="Unit"]').value = mat.unit || '';
        form.querySelector('[name="UnitPrice_Material"]').value = mat.unitPriceMaterial || 0;
        form.querySelector('[name="Unit_Price_Labor"]').value = mat.unitPriceLabor || 0;

        document.getElementById('materialModalLabel').innerHTML = '<i class="fa-solid fa-pen-to-square me-2"></i>แก้ไขวัสดุ';
        Materials.modal.show();
    },

    save: async () => {
        const form = document.getElementById('materialForm');
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const formData = new FormData(form);
        const rawData = Object.fromEntries(formData.entries());

        const saveData = {
            materialId: rawData.Material_ID,
            category: rawData.Category,
            itemName: rawData.Item_Name,
            size: rawData.Size,
            unit: rawData.Unit,
            unitPriceMaterial: rawData.UnitPrice_Material,
            unitPriceLabor: rawData.Unit_Price_Labor
        };

        const isNew = !form.querySelector('[name="Material_ID"]').readOnly;
        if (!saveData.materialId) {
            saveData.materialId = 'MAT-' + Date.now().toString().substr(-6);
        }

        const backupData = [...Materials.data];

        // อัพเดต UI ทันที (Optimistic)
        if (isNew) {
            Materials.data.push(saveData);
        } else {
            const idx = Materials.data.findIndex(m => String(m.materialId) === String(saveData.materialId));
            if (idx !== -1) Materials.data[idx] = saveData;
        }

        Materials.render(Materials.data);
        Materials.modal.hide();

        try {
            const res = await DBManager.saveMaterial(saveData);
            if (res.status === 'success') {
                localStorage.setItem('cache_materials', JSON.stringify(Materials.data));
                Utils.showToast("บันทึกข้อมูลสำเร็จ", 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            Utils.showToast("บันทึกไม่สำเร็จ: " + error.message, 'error');
            Materials.data = backupData;
            Materials.render(Materials.data);
        }
    },

    delete: async (id) => {
        if (!confirm("ยืนยันลบรายการนี้?")) return;

        const backupData = [...Materials.data];

        // อัพเดต UI ทันที (Optimistic)
        Materials.data = Materials.data.filter(m => String(m.materialId) !== String(id));
        Materials.render(Materials.data);

        try {
            const res = await DBManager.deleteMaterial(id);
            if (res.status === 'success') {
                localStorage.setItem('cache_materials', JSON.stringify(Materials.data));
                Utils.showToast("ลบข้อมูลสำเร็จ", 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            Utils.showToast("ลบไม่สำเร็จ: " + error.message, 'error');
            Materials.data = backupData;
            Materials.render(Materials.data);
        }
    }
};

window.Materials = Materials;