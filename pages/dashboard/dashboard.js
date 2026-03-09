/**
 * Dashboard Controller
 * จัดการหน้าจอหลัก แสดงรายการงาน, สถานะ, และการค้นหา
 */
const Dashboard = {
    data: [],
    sortState: { column: 'jobId', direction: 'desc' },

    /**
     * ตรวจสอบว่างานมีเลขประมาณการหรือไม่
     * @param {*} val - ค่า estimateNo
     * @returns {boolean}
     */
    _hasEstNo: (val) => {
        const en = (val === null || val === undefined) ? '' : String(val).trim();
        return en !== '' && en !== '-' && en !== 'null' && en !== 'undefined';
    },

    /**
     * เริ่มต้นหน้า Dashboard
     * @param {boolean} forceRefresh - ถ้า true จะดึงข้อมูลใหม่โดยไม่ใช้ cache
     */
    init: async (forceRefresh = false) => {
        console.log("Dashboard Init...");

        // ล้าง session การแก้ไขงาน
        sessionStorage.removeItem('CURRENT_EDIT_JOB');

        // 1. แสดง Skeleton Loading
        Dashboard.renderSkeleton();

        // 2. ลองโหลดจาก Cache
        const cached = localStorage.getItem('cache_dashboard_jobs');
        if (cached && !forceRefresh) {
            try {
                Dashboard.data = JSON.parse(cached);
                Dashboard.render(Dashboard.data);
                Dashboard.updateStats(Dashboard.data);
                // รีเฟรชข้อมูลเบื้องหลัง
                Dashboard.fetchData(true);
                return;
            } catch (e) { localStorage.removeItem('cache_dashboard_jobs'); }
        }

        // 3. ดึงข้อมูลจากฐานข้อมูล
        await Dashboard.fetchData();
    },

    /**
     * ดึงข้อมูลงานจากฐานข้อมูล
     * @param {boolean} isBackground - ถ้า true จะไม่แสดง loading/error บนหน้าจอ
     */
    fetchData: async (isBackground = false) => {
        try {
            if (!isBackground && Dashboard.data.length === 0) Dashboard.renderSkeleton();

            const res = await DBManager.getDatabase();

            if (res.status === 'success') {
                Dashboard.data = res.jobs || [];

                // คำนวณยอดรวมทุกงาน
                Dashboard.data.forEach(job => {
                    const items = job.items || [];
                    if (items.length === 0) {
                        job.totalAmount = 0;
                        return;
                    }
                    const costs = Utils.calculateJobCosts(items, res.materials);
                    job.totalAmount = costs.grandTotal;
                });

                // บันทึกลง Cache
                localStorage.setItem('cache_dashboard_jobs', JSON.stringify(Dashboard.data));

                // แสดงผล
                Dashboard.render(Dashboard.data);
                Dashboard.updateStats(Dashboard.data);
            } else {
                if (!isBackground) {
                    Dashboard.showError(res.message || "โหลดข้อมูลไม่สำเร็จ");
                }
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            if (!isBackground) {
                Dashboard.showError("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
            }
        }
    },

    /**
     * เตรียมข้อมูลงานสำหรับแก้ไข แล้วนำทางไปหน้า Form
     * @param {string} jobId - รหัสงานที่ต้องการแก้ไข
     */
    editJob: (jobId) => {
        const jobToEdit = Dashboard.data.find(j => String(j.jobId) === String(jobId));

        if (jobToEdit) {
            sessionStorage.setItem('CURRENT_EDIT_JOB', JSON.stringify(jobToEdit));
            Router.load('form');
        } else {
            Utils.showToast("ไม่พบข้อมูลรายการนี้ กรุณารีเฟรชหน้าจอ", 'error');
        }
    },

    /**
     * แสดงสถานะ Skeleton Loading ขณะรอข้อมูล
     */
    renderSkeleton: () => {
        const tbody = document.getElementById('jobsTableBody');
        if (!tbody) return;
        let html = '';
        for (let i = 0; i < 5; i++) {
            html += `
                <tr>
                    <td class="ps-4"><div class="skeleton" style="width: 100px; height: 20px;"></div></td>
                    <td><div class="skeleton" style="width: 150px; height: 20px;"></div></td>
                    <td><div class="skeleton" style="width: 100px; height: 26px; border-radius: 20px;"></div></td>
                    <td class="text-end"><div class="skeleton ms-auto" style="width: 80px; height: 20px;"></div></td>
                    <td class="text-center"><div class="skeleton mx-auto" style="width: 80px; height: 30px; border-radius: 20px;"></div></td>
                </tr>`;
        }
        tbody.innerHTML = html;
    },

    /**
     * แสดงผลรายการงานในตาราง
     * @param {Array} list - รายการงานที่จะแสดง
     */
    render: (list) => {
        const tbody = document.getElementById('jobsTableBody');
        const emptyState = document.getElementById('emptyState');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('d-none');
            return;
        }
        if (emptyState) emptyState.classList.add('d-none');

        // ลอจิกเรียงลำดับ
        list.sort((a, b) => {
            const col = Dashboard.sortState.column;
            const dir = Dashboard.sortState.direction === 'asc' ? 1 : -1;

            let valA = a[col];
            let valB = b[col];

            if (col === 'jobId') {
                // ลองเรียงตาม Timestamp ก่อน ถ้าไม่มีจะใช้ ID string แทน
                const timeA = new Date(a.Timestamp || a.timestamp || 0).getTime();
                const timeB = new Date(b.Timestamp || b.timestamp || 0).getTime();
                if (timeA !== timeB) return (timeA - timeB) * dir;
                return String(valA).localeCompare(String(valB)) * dir;
            }

            if (col === 'totalAmount') {
                return (parseFloat(valA || 0) - parseFloat(valB || 0)) * dir;
            }

            return String(valA || '').localeCompare(String(valB || '')) * dir;
        });

        // อัพเดตไอคอนเรียงลำดับ
        document.querySelectorAll('.fa-sort, .fa-sort-up, .fa-sort-down').forEach(el => {
            el.className = 'fa-solid fa-sort ms-1 opacity-25';
        });
        const icon = document.getElementById(`sort-${Dashboard.sortState.column}`);
        if (icon) {
            icon.className = `fa-solid fa-sort-${Dashboard.sortState.direction === 'asc' ? 'up' : 'down'} ms-1 text-primary`;
        }

        // สร้าง HTML สำหรับแต่ละแถว
        tbody.innerHTML = list.map((job, index) => {
            const jobId = job.jobId || '';
            let rawEst = job.estimateNo;
            const estNo = (rawEst === null || rawEst === undefined) ? '' : String(rawEst).trim();

            const name = job.customerName || '';
            const loc = job.tambon || job.amphoe || '-';
            const dateStr = Utils.formatThaiDate(job.requestDate);
            const total = Utils.formatCurrency(job.totalAmount);

            // ตรวจสอบสถานะการปริ้น
            const printDate = job.printDate;
            const isPrinted = printDate && printDate !== '' && printDate !== null;

            // ลอจิก Badge สถานะ
            const hasEstNo = Dashboard._hasEstNo(rawEst);

            let badgeHtml;
            if (!hasEstNo) {
                // ไม่มีเลขประมาณการ - สีเหลือง
                badgeHtml = `<span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill px-3"><i class="fa-regular fa-clock me-1"></i>รอออกเลข</span>`;
            } else if (isPrinted) {
                // มีเลขและปริ้นแล้ว - สีฟ้า
                badgeHtml = `<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 rounded-pill px-3"><i class="fa-solid fa-print me-1"></i>${estNo}</span>`;
            } else {
                // มีเลขแต่ยังไม่ปริ้น - สีเขียว
                badgeHtml = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3"><i class="fa-solid fa-check me-1"></i>${estNo}</span>`;
            }

            const delay = Math.min(index * 0.05, 0.5);

            return `
            <tr class="table-row-anim" style="animation-delay: ${delay}s">
                <td class="ps-4 d-none d-md-table-cell">
                    <div class="fw-bold text-primary font-monospace">${jobId}</div>
                    <div class="small text-muted"><i class="fa-regular fa-calendar me-1"></i>${dateStr}</div>
                </td>
                <td>
                    <div class="fw-bold text-dark text-truncate" style="max-width: 200px;">${name}</div>
                    <div class="small text-muted"><i class="fa-solid fa-location-dot me-1"></i>${loc}</div>
                </td>
                <td>${badgeHtml}</td>
                <td class="text-end fw-bold text-dark d-none d-md-table-cell">${total}</td>
                <td class="text-center pe-4">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-light text-primary rounded-circle me-1 btn-hover-scale" 
                                onclick="Dashboard.editJob('${jobId}')" title="แก้ไข">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-sm btn-light text-danger rounded-circle btn-hover-scale" 
                                onclick="Dashboard.delete('${jobId}')" title="ลบ">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    updateStats: (list) => {
        const total = list.length;
        const issued = list.filter(j => Dashboard._hasEstNo(j.estimateNo)).length;

        // นับงานที่รอปริ้น (ออกเลขแล้วแต่ยังไม่ปริ้น)
        const waitingPrint = list.filter(j => {
            if (!Dashboard._hasEstNo(j.estimateNo)) return false;
            const { printDate } = j;
            return !printDate || printDate === '' || printDate === null;
        }).length;

        const waiting = total - issued;

        Dashboard.animateValue("stat-total", 0, total, 500);
        Dashboard.animateValue("stat-waiting", 0, waiting, 500);
        Dashboard.animateValue("stat-issued", 0, issued, 500);
        Dashboard.animateValue("stat-waiting-print", 0, waitingPrint, 500);
    },

    filter: () => {
        const term = document.getElementById('dashSearchInput').value.toLowerCase();
        // ค้นหาแบบง่ายจาก JSON string ของ object ทั้งหมด
        const filtered = Dashboard.data.filter(j => JSON.stringify(j).toLowerCase().includes(term));
        Dashboard.render(filtered);
    },

    sort: (column) => {
        if (Dashboard.sortState.column === column) {
            Dashboard.sortState.direction = Dashboard.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            Dashboard.sortState.column = column;
            Dashboard.sortState.direction = 'asc';
        }
        Dashboard.filter(); // Re-apply filter which triggers render
    },

    delete: async (id) => {
        if (!confirm("ยืนยันลบรายการนี้?")) return;

        // อัพเดต UI ทันที (Optimistic)
        const originalData = [...Dashboard.data];
        Dashboard.data = Dashboard.data.filter(j => String(j.jobId) !== String(id));
        Dashboard.render(Dashboard.data);
        Dashboard.updateStats(Dashboard.data);

        try {
            const res = await DBManager.deleteJob(id);
            if (res.status === 'success') {
                localStorage.setItem('cache_dashboard_jobs', JSON.stringify(Dashboard.data));
                Utils.showToast("ลบรายการเรียบร้อย", 'success');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            Utils.showToast("ลบไม่สำเร็จ: " + e.message, 'error');
            // ย้อนกลับข้อมูล
            Dashboard.data = originalData;
            Dashboard.render(Dashboard.data);
            Dashboard.updateStats(Dashboard.data);
        }
    },

    animateValue: (id, start, end, duration) => {
        const obj = document.getElementById(id);
        if (!obj) return;
        if (end === undefined || isNaN(end)) { obj.innerHTML = "0"; return; }

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    },

    showError: (msg) => {
        const tbody = document.getElementById('jobsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="5" class="text-center text-danger py-5">
                    <i class="fa-solid fa-circle-exclamation fa-2x mb-3"></i><br>
                    ${msg}
                </td></tr>`;
        }
    }
};

window.Dashboard = Dashboard;