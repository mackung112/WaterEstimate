/**
 * Personnel Controller
 * จัดการหน้าจอระบุบุคลากร (ผู้สำรวจ, ผู้ตรวจสอบ, ผู้อนุมัติ)
 */
const Personnel = {
    data: [],
    sortState: { column: 'name', direction: 'asc' },
    modal: null,

    // ตั้งค่าสีและไอคอนตามบทบาทบุคลากร
    roleConfig: {
        'Surveyor': { class: 'role-surveyor', label: 'ผู้สำรวจ', icon: 'fa-solid fa-compass', color: '#1565c0' },
        'Inspector': { class: 'role-inspector', label: 'ผู้ตรวจสอบ', icon: 'fa-solid fa-clipboard-check', color: '#2e7d32' },
        'Approver': { class: 'role-approver', label: 'ผู้อนุมัติ', icon: 'fa-solid fa-signature', color: '#f57f17' },
        'default': { class: 'bg-light text-secondary', label: 'ทั่วไป', icon: 'fa-solid fa-user', color: '#9e9e9e' }
    },

    /**
     * เริ่มต้นหน้าจัดการบุคลากร
     * @param {boolean} forceRefresh - บังคับดึงข้อมูลใหม่จากฐานข้อมูล
     */
    init: async (forceRefresh = false) => {
        const el = document.getElementById('personnelModal');
        if (el) Personnel.modal = new bootstrap.Modal(el);

        // 1. แสดง Skeleton ถ้าตารางว่าง
        if (forceRefresh || Personnel.data.length === 0) Personnel.renderSkeleton();

        // 2. โหลดจาก Cache
        const cached = localStorage.getItem('cache_personnel');
        if (cached && !forceRefresh) {
            Personnel.data = JSON.parse(cached);
            Personnel.render(Personnel.data);
            Personnel.fetchData(true); // รีเฟรชเบื้องหลัง
        } else {
            if (forceRefresh) localStorage.removeItem('cache_personnel');
            await Personnel.fetchData();
        }
    },

    /**
     * ดึงข้อมูลบุคลากรจากฐานข้อมูล
     * @param {boolean} isBackground - ดึงแบบเบื้องหลังหรือไม่
     */
    fetchData: async (isBackground = false) => {
        try {
            const res = await DBManager.getDatabase();
            if (res.status === 'success') {
                Personnel.data = res.personnel || [];
                localStorage.setItem('cache_personnel', JSON.stringify(Personnel.data));
                Personnel.render(Personnel.data);
            } else if (!isBackground) {
                const tbody = document.getElementById('personnelTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                    <tr><td colspan="5" class="text-center text-danger py-5">
                        <i class="fa-solid fa-triangle-exclamation mb-2"></i><br>${res.message}
                    </td></tr>`;
                }
            }
        } catch (error) {
            console.error(error);
            if (!isBackground) {
                const tbody = document.getElementById('personnelTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                    <tr><td colspan="5" class="text-center text-danger py-5">
                        ไม่สามารถเชื่อมต่อฐานข้อมูลได้
                    </td></tr>`;
                }
            }
        }
    },

    renderSkeleton: () => {
        const tbody = document.getElementById('personnelTableBody');
        let html = '';
        for (let i = 0; i < 6; i++) {
            html += `
                <tr>
                    <td class="ps-4"><div class="d-flex align-items-center gap-3">
                        <div class="skeleton skeleton-avatar"></div>
                        <div class="skeleton skeleton-text" style="width: 120px;"></div>
                    </div></td>
                    <td class="d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                    <td class="text-center d-none d-md-table-cell"><div class="skeleton skeleton-text" style="width: 40px;"></div></td>
                    <td class="text-end pe-4"><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    },

    render: (list) => {
        const countEl = document.getElementById('perTotalCount');
        if (countEl) countEl.innerText = list ? list.length : 0;

        const tbody = document.getElementById('personnelTableBody');
        const emptyState = document.getElementById('perEmptyState');

        if (!list || list.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('d-none');
            return;
        }
        if (emptyState) emptyState.classList.add('d-none');

        // เรียงลำดับข้อมูล
        list.sort((a, b) => {
            const col = Personnel.sortState.column;
            const dir = Personnel.sortState.direction === 'asc' ? 1 : -1;
            let valA = a[col] || '';
            let valB = b[col] || '';
            return String(valA).localeCompare(String(valB), 'th') * dir;
        });

        // อัพเดตไอคอนเรียงลำดับ
        document.querySelectorAll('.fa-sort, .fa-sort-up, .fa-sort-down').forEach(el => {
            el.className = 'fa-solid fa-sort ms-1 opacity-25';
        });
        const icon = document.getElementById(`sort-${Personnel.sortState.column}`);
        if (icon) {
            icon.className = `fa-solid fa-sort-${Personnel.sortState.direction === 'asc' ? 'up' : 'down'} ms-1 text-primary`;
        }

        if (tbody) {
            tbody.innerHTML = list.map((p, index) => {
                const firstChar = p.name ? p.name.trim().charAt(0) : '?';
                const config = Personnel.roleConfig[p.roleType] || Personnel.roleConfig['default'];
                const delay = Math.min(index * 0.03, 0.5);

                const viewSig = `Personnel.showSig('${p.signatureUrl}')`;

                return `
            <tr class="table-row-anim" style="animation-delay: ${delay}s">
                <td class="ps-4 py-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar-circle shadow-sm" style="background-color: ${config.color}; color: white;">
                            ${firstChar}
                        </div>
                        <div>
                            <div class="fw-bold text-dark text-truncate" style="max-width: 180px;">${p.name}</div>
                            <div class="small text-muted d-md-none text-truncate" style="max-width: 150px;">
                                ${p.position || '-'}
                            </div>
                        </div>
                    </div>
                </td>
                
                <td class="d-none d-md-table-cell text-secondary">${p.position || '-'}</td>
                
                <td>
                    <span class="role-badge ${config.class}">
                        <i class="${config.icon}"></i> ${config.label}
                    </span>
                </td>
                
                <td class="text-center d-none d-md-table-cell">
                    ${p.signatureUrl ?
                        `<img src="${p.signatureUrl}" class="rounded border bg-white p-1" style="height: 32px; cursor: pointer;" onclick="${viewSig}" onerror="this.style.display='none'">` :
                        `<span class="text-muted opacity-25"><i class="fa-solid fa-pen-nib"></i></span>`
                    }
                </td>
                
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-light btn-sm text-primary rounded-circle btn-hover-scale me-2" onclick="Personnel.edit('${p.personnelId}')" title="แก้ไข">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-light btn-sm text-danger rounded-circle btn-hover-scale" onclick="Personnel.delete('${p.personnelId}')" title="ลบ">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
            }).join('');
        }
    },

    filter: () => {
        const textTerm = document.getElementById('searchInput').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value;

        const filtered = Personnel.data.filter(p => {
            const matchesText = (
                (p.name && p.name.toLowerCase().includes(textTerm)) ||
                (p.position && p.position.toLowerCase().includes(textTerm))
            );
            const matchesRole = roleFilter === '' || p.roleType === roleFilter;
            return matchesText && matchesRole;
        });

        Personnel.render(filtered);
    },

    sort: (column) => {
        if (Personnel.sortState.column === column) {
            Personnel.sortState.direction = Personnel.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            Personnel.sortState.column = column;
            Personnel.sortState.direction = 'asc';
        }
        Personnel.filter();
    },

    // ============================================================
    // ฟอร์ม MODAL และ CRUD
    // ============================================================

    openModal: () => {
        document.getElementById('personnelForm').reset();
        document.querySelector('[name="Personnel_ID"]').value = '';
        document.getElementById('sigPreviewBox').style.display = 'none';

        document.querySelectorAll('[name="Role_Type"]').forEach(r => r.checked = false);

        document.getElementById('personnelModalLabel').innerHTML = '<i class="fa-solid fa-user-plus me-2"></i>เพิ่มบุคลากรใหม่';
        Personnel.modal.show();
    },

    edit: (id) => {
        const person = Personnel.data.find(p => String(p.personnelId) === String(id));
        if (!person) return;

        const form = document.getElementById('personnelForm');
        form.querySelector('[name="Personnel_ID"]').value = person.personnelId;
        form.querySelector('[name="Name"]').value = person.name || '';
        form.querySelector('[name="Position"]').value = person.position || '';
        form.querySelector('[name="Signature_URL"]').value = person.signatureUrl || '';

        const radio = form.querySelector(`input[name="Role_Type"][value="${person.roleType}"]`);
        if (radio) radio.checked = true;

        Personnel.previewImage(person.signatureUrl);
        document.getElementById('personnelModalLabel').innerHTML = '<i class="fa-solid fa-user-pen me-2"></i>แก้ไขข้อมูล';
        Personnel.modal.show();
    },

    save: async () => {
        const form = document.getElementById('personnelForm');
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const formData = new FormData(form);
        const rawData = Object.fromEntries(formData.entries());

        const newData = {
            personnelId: rawData.Personnel_ID,
            name: rawData.Name,
            position: rawData.Position,
            signatureUrl: rawData.Signature_URL,
            roleType: rawData.Role_Type
        };

        const isNew = !newData.personnelId;
        if (isNew) newData.personnelId = 'PER-' + Date.now();

        const backupData = [...Personnel.data];

        // อัพเดต UI ทันที (Optimistic)
        if (isNew) {
            Personnel.data.push(newData);
        } else {
            const idx = Personnel.data.findIndex(p => p.personnelId === newData.personnelId);
            if (idx !== -1) Personnel.data[idx] = newData;
        }

        Personnel.render(Personnel.data);
        Personnel.modal.hide();

        try {
            const res = await DBManager.savePersonnel(newData);
            if (res.status === 'success') {
                localStorage.setItem('cache_personnel', JSON.stringify(Personnel.data));
                Utils.showToast("บันทึกข้อมูลเรียบร้อย", 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            console.error("Save Error:", error);
            Utils.showToast("บันทึกไม่สำเร็จ: " + error.message, 'error');
            Personnel.data = backupData;
            Personnel.render(Personnel.data);
        }
    },

    delete: async (id) => {
        if (!confirm("ต้องการลบรายชื่อนี้ใช่หรือไม่?")) return;

        const backupData = [...Personnel.data];

        // อัพเดต UI ทันที (Optimistic)
        Personnel.data = Personnel.data.filter(p => String(p.personnelId) !== String(id));
        Personnel.render(Personnel.data);

        try {
            const res = await DBManager.deletePersonnel(id);
            if (res.status === 'success') {
                localStorage.setItem('cache_personnel', JSON.stringify(Personnel.data));
                Utils.showToast("ลบข้อมูลเรียบร้อย", 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            Utils.showToast("ลบไม่สำเร็จ: " + error.message, 'error');
            Personnel.data = backupData;
            Personnel.render(Personnel.data);
        }
    },

    previewImage: (url) => {
        const box = document.getElementById('sigPreviewBox');
        const img = document.getElementById('sigPreviewImg');
        if (url) {
            img.src = url;
            box.style.display = 'block';
            img.onerror = () => { box.style.display = 'none'; };
        } else {
            box.style.display = 'none';
        }
    },

    showSig: (url) => {
        window.open(url, '_blank');
    }
};

window.Personnel = Personnel;