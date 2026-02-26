/**
 * Form Controller
 * จัดการหน้าฟอร์มบันทึกข้อมูลงาน (Create/Edit Job)
 */
var Form = {
    personnelData: [],

    installImages: [
        { name: "แบบมาตรฐาน 1 (ท่อลอย)", url: "https://img.lazcdn.com/g/p/3c730a52fdb8a1dba2c435418b4ee28c.jpg_960x960q80.jpg_.webp1" },
        { name: "แบบมาตรฐาน 2 (ฝังดิน)", url: "https://chopanich.com/wp-content/uploads/2020/02/angle_ball_valves5.jpg" },
        { name: "ตัวอย่างหน้างาน (Pinterest)", url: "https://i.pinimg.com/236x/1a/c2/ab/1ac2ab6d4990efd031a1a1b7e66471f0.jpg" },
        { name: "แบบมาตรฐาน 3 (ท่อลอย)", url: "https://i.ytimg.com/vi/xtxF4ibCzug/maxresdefault.jpg" },
        { name: "แบบมาตรฐาน 4 (ท่อลอย)", url: "https://i.ytimg.com/vi/bxbFQjpfi6U/hq720.jpg" },
    ],

    // Global Leaflet map instance and marker
    mapInstance: null,
    mapMarker: null,

    // ============================================================
    // 1. INITIALIZATION
    // ============================================================

    /**
     * Initialize Form Page
     */
    init: async () => {
        console.log("Form Init: Checking Data Source...");

        // Clear old cache เพื่อให้ได้ข้อมูลล่าสุดจาก database
        sessionStorage.removeItem('REPORT_CACHE');

        await Form.loadItemsTemplate();

        try {
            // Load Database (Personnel/Materials)
            const res = await DBManager.getDatabase();

            if (res.status === 'success') {
                Form.personnelData = res.personnel || [];
                if (window.ItemsComponent) await ItemsComponent.init(res.materials || []);

                // Prepare Dropdowns
                Form.populatePersonnel();
                Form.renderImagesList();

                // Event Listener for GIS Image Upload
                const gisInput = document.getElementById('gisFileInput');
                if (gisInput) {
                    gisInput.addEventListener('change', Form.handleGisUpload);
                }

                // Setup Drag & Drop for GIS Image
                Form.setupGisDragDrop();

                // Initialize Leaflet Map
                Form.initMap();

                // Check Data Source (Priority: Session -> URL -> New)
                const sessionData = sessionStorage.getItem('CURRENT_EDIT_JOB');
                const params = new URLSearchParams(window.location.search);
                let urlId = params.get('id');

                if (!urlId && window.location.hash.includes('id=')) {
                    urlId = window.location.hash.split('id=')[1];
                }

                if (sessionData) {
                    console.log("Source: Session Storage");
                    const job = JSON.parse(sessionData);
                    Form.fillFormData(job);
                }
                else if (urlId) {
                    console.log("Source: URL ID ->", urlId);
                    const job = res.jobs.find(j => String(j.jobId || j.Job_ID) === String(urlId));
                    if (job) {
                        Form.fillFormData(job);
                    } else {
                        Utils.showToast("ไม่พบข้อมูลงาน ID: " + urlId, 'error');
                        Form.setDefaults();
                    }
                }
                else {
                    console.log("Source: New Job");
                    Form.setDefaults();
                }

            } else {
                Utils.showToast("โหลดข้อมูลพื้นฐานไม่สำเร็จ: " + res.message, 'error');
            }
        } catch (e) {
            console.error(e);
            Utils.showToast("Error: " + e.message, 'error');
        }
    },

    loadItemsTemplate: async () => {
        const container = document.getElementById('items-component-container');
        if (!container) return;
        try {
            const response = await fetch('pages/form/items/items.html');
            if (response.ok) container.innerHTML = await response.text();
        } catch (e) { console.error("Load items failed", e); }
    },

    // ============================================================
    // 2. FORM DATA HANDLING
    // ============================================================

    /**
     * Fill form with existing job data
     * @param {Object} job 
     */
    fillFormData: (job) => {
        const jobId = job.jobId;
        document.getElementById('form-mode-label').innerText = `แก้ไขรายการ: ${jobId}`;
        const printGroup = document.getElementById('printButtonGroup');
        if (printGroup) { printGroup.classList.remove('d-none'); printGroup.classList.add('d-flex'); }

        const form = document.getElementById('jobForm');

        const setInput = (name, value) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (el) {
                el.value = value;
                if (name === 'Job_ID') {
                    el.setAttribute('readonly', true);
                    el.classList.add('bg-warning', 'bg-opacity-10');
                }
            }
        };

        // --- Fill Data ---
        setInput('Job_ID', jobId);
        setInput('Request_No', job.requestNo || '');
        setInput('Estimate_No', job.estimateNo || '');
        setInput('User_Number', job.userNumber || '');

        const dateStr = job.requestDate;
        setInput('Request_Date', dateStr ? dateStr.split('T')[0] : '');

        setInput('Customer_Name', job.customerName || '');
        setInput('House_No', job.houseNo || '');
        setInput('Moo', job.moo || '');
        setInput('Tambon', job.tambon || '');
        setInput('Amphoe', job.amphoe || '');
        setInput('Province', job.province || '');

        // Map & Images
        const mapUrl = job.mapUrl || '';
        setInput('Map_URL', mapUrl);
        setTimeout(() => Form.previewMap(mapUrl), 100);

        const imgUrl = job.imageUrl || '';
        setInput('Image_URL', imgUrl);
        Form.previewInstallImage(imgUrl);

        // GIS Image
        const gisUrl = job.gisImageUrl || job.Gis_Image_URL || '';
        if (gisUrl) {
            setInput('Gis_Image_URL', gisUrl);
            Form.previewGisImage(gisUrl);
        }

        // Re-run signature updates for all roles
        Form.updateSignature('surveyor');
        Form.updateSignature('inspector');
        Form.updateSignature('approver');
        Form.updatePrintButtonsVisibility();

        // แสดงสถานะการปริ้น
        const printDate = job.printDate; // Use 'job' instead of 'data'
        if (printDate) {
            document.getElementById('printStatusSection').classList.remove('d-none');
            document.getElementById('printStatusDivider').classList.remove('d-none');
            document.getElementById('printDateDisplay').innerText = Utils.formatThaiDate(printDate);
        } else {
            document.getElementById('printStatusSection').classList.add('d-none');
            document.getElementById('printStatusDivider').classList.add('d-none');
        }

        // Personnel
        const loadPerson = (role, nameKey, posKey) => {
            const name = job[nameKey] || '';
            const pos = job[posKey] || '';

            setInput(`${role}_Name`, name);
            Form.updateSignature(role.toLowerCase());
            if (pos) setInput(`${role}_Pos`, pos);
        };

        loadPerson('Surveyor', 'surveyorName', 'surveyorPos');
        loadPerson('Inspector', 'inspectorName', 'inspectorPos');
        loadPerson('Approver', 'approverName', 'approverPos');

        // Items
        if (window.ItemsComponent) {
            // Determine size from Job ID Prefix or fallback
            let sizeToSet = '';
            if (jobId.startsWith('12')) {
                sizeToSet = '1/2';
            } else if (jobId.startsWith('34')) {
                sizeToSet = '3/4';
            } else {
                sizeToSet = job.meterSize;
            }

            if (sizeToSet) ItemsComponent.setMeterSize(sizeToSet);

            // Load Items (triggers calculation)
            if (job.items && job.items.length > 0) ItemsComponent.setItems(job.items);
        }

        // Update print buttons visibility based on Estimate No
        Form.updatePrintButtonsVisibility();

        // Cache report data for faster loading
        Form.cacheReportData();
    },

    setDefaults: () => {
        const autoId = 'JOB-' + Date.now();
        const now = new Date();
        document.querySelector('[name="Job_ID"]').value = autoId;
        document.querySelector('[name="Request_Date"]').value = now.toISOString().split('T')[0];
        document.getElementById('form-mode-label').innerText = `สร้างรายการใหม่ (${autoId})`;
        const printGroup = document.getElementById('printButtonGroup');
        if (printGroup) { printGroup.classList.remove('d-flex'); printGroup.classList.add('d-none'); }
    },

    submit: async () => {
        const form = document.getElementById('jobForm');
        const formData = new FormData(form);
        const rawData = Object.fromEntries(formData.entries());

        let finalJobId = rawData.Job_ID;
        if (!finalJobId || finalJobId.trim() === "") {
            finalJobId = 'JOB-' + Date.now();
        }

        const jobData = {
            jobId: finalJobId,
            requestNo: rawData.Request_No,
            estimateNo: rawData.Estimate_No,
            requestDate: rawData.Request_Date,
            userNumber: rawData.User_Number,
            customerName: rawData.Customer_Name,
            houseNo: rawData.House_No,
            moo: rawData.Moo,
            tambon: rawData.Tambon,
            amphoe: rawData.Amphoe,
            province: rawData.Province,
            mapUrl: rawData.Map_URL,
            imageUrl: rawData.Image_URL,
            gisImageUrl: rawData.Gis_Image_URL,

            // Standardize variables for DB/Report compatibility
            Map_URL: rawData.Map_URL,
            Image_URL: rawData.Image_URL,
            Gis_Image_URL: rawData.Gis_Image_URL,

            // Personnel
            surveyorName: rawData.Surveyor_Name, surveyorPos: rawData.Surveyor_Pos,
            inspectorName: rawData.Inspector_Name, inspectorPos: rawData.Inspector_Pos,
            approverName: rawData.Approver_Name, approverPos: rawData.Approver_Pos,

            status: rawData.Status || 'Pending'
        };

        if (window.ItemsComponent) {
            jobData.items = window.ItemsComponent.getItems();
            jobData.meterSize = window.ItemsComponent.getMeterSize();
        } else {
            jobData.items = [];
            jobData.meterSize = '';
        }

        const btn = document.querySelector('button[onclick="Form.submit()"]');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';
        btn.disabled = true;

        try {
            const res = await DBManager.saveJob(jobData);
            if (res.status === 'success') {
                localStorage.removeItem('cache_dashboard_jobs');
                sessionStorage.removeItem('CURRENT_EDIT_JOB');
                Form.cacheReportData(); // Update cache after save (fire-and-forget, no await)
                Utils.showToast("บันทึกข้อมูลเรียบร้อย!");
                setTimeout(() => Router.load('dashboard'), 500);
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            Utils.showToast("บันทึกไม่สำเร็จ: " + e.message, 'error');
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    },

    // ============================================================
    // 3. HELPER FUNCTIONS
    // ============================================================

    /**
     * Populate Personnel Dropdowns
     */
    populatePersonnel: () => {
        const createOpt = p => `<option value="${p.name}"> (${p.position || '-'})</option>`;

        const setList = (targetRole, listId) => {
            let sortedList = [...Form.personnelData];
            sortedList.sort((a, b) => {
                const aMatch = a.roleType === targetRole;
                const bMatch = b.roleType === targetRole;
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
            });

            const el = document.getElementById(listId);
            if (el) el.innerHTML = sortedList.map(createOpt).join('');
        };

        setList('Surveyor', 'list-surveyor');
        setList('Inspector', 'list-inspector');
        setList('Approver', 'list-approver');
    },

    updateSignature: (role) => {
        const nameInput = document.getElementById(`sel-${role}`);
        const val = nameInput.value;
        const person = Form.personnelData.find(p => p.name === val);
        const sigBox = document.getElementById(`sig-${role}`);
        const posInput = document.getElementById(`pos-${role}`);

        if (person) {
            sigBox.innerHTML = person.signatureUrl
                ? `<img src="${person.signatureUrl}" class="h-100 w-100 object-fit-contain">`
                : `<span class="text-muted small">ไม่มีลายเซ็น</span>`;

            if (person.position) posInput.value = person.position; // Auto-fill position
        } else {
            sigBox.innerHTML = '';
        }
    },

    printAllReports: async () => {
        const jobIdInput = document.querySelector('[name="Job_ID"]');
        const jobId = jobIdInput ? jobIdInput.value : '';

        if (!jobId) {
            Utils.showToast("ไม่พบรหัสงาน (Job ID) กรุณาบันทึกข้อมูลก่อนพิมพ์", 'error');
            return;
        }

        // เปิด 3 หน้าต่างพร้อมกัน (หน่วงเวลา 100ms ป้องกันเบราว์เซอร์บล็อก popup หรือเปิดไม่ครบ)
        window.open(`pages/form/reports/r1_detail/r1.html?id=${jobId}`, '_blank');

        setTimeout(() => {
            window.open(`pages/form/reports/r2_detail/r2.html?id=${jobId}`, '_blank');
        }, 100);

        setTimeout(() => {
            window.open(`pages/form/reports/r3_detail/r3.html?id=${jobId}`, '_blank');
        }, 200);

        // อัพเดตสถานะการปริ้น
        try {
            const res = await DBManager.updatePrintStatus(jobId, true);
            if (res.status === 'success') {
                localStorage.removeItem('cache_dashboard_jobs');
                document.getElementById('printStatusSection').classList.remove('d-none');
                document.getElementById('printStatusDivider').classList.remove('d-none');
                document.getElementById('printDateDisplay').innerText = Utils.formatThaiDate(new Date().toISOString());
                Utils.showToast('📄 ออกรายงาน 3 ฉบับเรียบร้อย', 'success');
            }
        } catch (e) {
            console.error('อัพเดตสถานะการปริ้นไม่สำเร็จ:', e);
        }
    },

    resetPrintStatus: async () => {
        const jobId = document.querySelector('[name="Job_ID"]').value;
        if (!jobId) {
            Utils.showToast('ไม่พบรหัสงาน', 'error');
            return;
        }

        if (!confirm('ต้องการรีเซ็ตสถานะการปริ้นหรือไม่?')) return;

        try {
            const res = await DBManager.updatePrintStatus(jobId, false);
            if (res.status === 'success') {
                localStorage.removeItem('cache_dashboard_jobs');
                document.getElementById('printStatusSection').classList.add('d-none');
                document.getElementById('printStatusDivider').classList.add('d-none');
                Utils.showToast('รีเซ็ตสถานะการปริ้นเรียบร้อย', 'success');
            } else {
                Utils.showToast('เกิดข้อผิดพลาด: ' + res.message, 'error');
            }
        } catch (e) {
            Utils.showToast('รีเซ็ตไม่สำเร็จ: ' + e.message, 'error');
        }
    },

    /**
     * อัพเดตการแสดงปุ่มพิมพ์รายงานตามเงื่อนไข Estimate No
     */
    updatePrintButtonsVisibility: () => {
        const estimateNoInput = document.querySelector('[name="Estimate_No"]');
        const printGroup = document.getElementById('printButtonGroup');

        if (!estimateNoInput || !printGroup) return;

        const estimateNo = estimateNoInput.value.trim();

        if (estimateNo && estimateNo !== '') {
            // มีเลขประมาณการ -> แสดงปุ่ม
            printGroup.classList.remove('d-none');
            printGroup.classList.add('d-flex');
        } else {
            // ไม่มีเลขประมาณการ -> ซ่อนปุ่ม
            printGroup.classList.remove('d-flex');
            printGroup.classList.add('d-none');
        }
    },

    /**
     * บันทึกข้อมูลสำหรับรายงานลง sessionStorage
     * เพื่อให้หน้ารายงานโหลดเร็วขึ้นโดยไม่ต้อง fetch ใหม่
     */
    cacheReportData: async () => {
        try {
            const res = await DBManager.getDatabase();
            if (res.status === 'success') {
                const cacheData = {
                    jobs: res.jobs,
                    materials: res.materials,
                    personnel: res.personnel,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('REPORT_CACHE', JSON.stringify(cacheData));
                console.log('✅ Report data cached successfully');
            }
        } catch (e) {
            console.warn('Failed to cache report data:', e);
        }
    },

    initMap: () => {
        const leafletMapDiv = document.getElementById('leafletMap');
        if (!leafletMapDiv) return;

        // Default to Thailand center
        const defaultLat = 14.3532;
        const defaultLng = 100.5691;

        Form.mapInstance = L.map('leafletMap').setView([defaultLat, defaultLng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(Form.mapInstance);

        // Click event to place marker
        Form.mapInstance.on('click', function (e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            const coordsUrl = `${lat.toFixed(6)},${lng.toFixed(6)}`;

            document.querySelector('[name="Map_URL"]').value = coordsUrl;
            Form.previewMap(coordsUrl);
        });

        // Wait for modal/container to be fully visible before invalidating size
        setTimeout(() => {
            Form.mapInstance.invalidateSize();
        }, 500);
    },

    getCurrentLocation: () => {
        if (!navigator.geolocation) return Utils.showToast("อุปกรณ์นี้ไม่รองรับ GPS", 'error');
        const btn = document.querySelector('button[onclick="Form.getCurrentLocation()"]');
        const oldIcon = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
                document.querySelector('[name="Map_URL"]').value = coords;
                Form.previewMap(coords);
                btn.innerHTML = oldIcon;
            },
            (err) => {
                Utils.showToast("ไม่สามารถดึงพิกัดได้: " + err.message, 'error');
                btn.innerHTML = oldIcon;
            }
        );
    },

    previewMap: (val) => {
        const holder = document.getElementById('mapPlaceholder');
        const box = document.querySelector('.map-preview-box');

        if (!val || val.trim() === "") {
            if (holder) holder.classList.remove('d-none');
            if (box) box.style.borderStyle = 'dashed';
            if (Form.mapMarker && Form.mapInstance) {
                Form.mapInstance.removeLayer(Form.mapMarker);
                Form.mapMarker = null;
            }
            return;
        }

        if (box) box.style.borderStyle = 'solid';
        if (holder) holder.classList.add('d-none');

        // Ensure map is initialized
        if (!Form.mapInstance) {
            Form.initMap();
        }

        // Try extracting coordinates
        let lat, lng;

        // Match exact coordinates like 14.35,100.55
        const coordMatch = val.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);

        if (coordMatch) {
            lat = parseFloat(coordMatch[1]);
            lng = parseFloat(coordMatch[3]);
        } else if (val.includes('maps.google.com')) {
            // Try to extract q=lat,lng from URL
            const urlMatch = val.match(/[?&]q=(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
            if (urlMatch) {
                lat = parseFloat(urlMatch[1]);
                lng = parseFloat(urlMatch[3]);
            }
        }

        if (lat !== undefined && lng !== undefined) {
            // Update Leaflet map
            Form.mapInstance.setView([lat, lng], 15);

            if (Form.mapMarker) {
                Form.mapMarker.setLatLng([lat, lng]);
            } else {
                Form.mapMarker = L.marker([lat, lng]).addTo(Form.mapInstance);
            }

            // Invalidate size in case map div was hidden
            setTimeout(() => Form.mapInstance.invalidateSize(), 100);
        }
    },

    previewInstallImage: (url) => {
        const img = document.getElementById('installPreviewImg');
        const holder = document.getElementById('installPlaceholder');
        const box = document.querySelector('.install-preview-box');
        if (url) {
            if (img) { img.src = url; img.classList.remove('d-none'); }
            if (holder) holder.classList.add('d-none');
            if (box) box.style.borderStyle = 'solid';
        } else {
            if (img) img.classList.add('d-none');
            if (holder) holder.classList.remove('d-none');
            if (box) box.style.borderStyle = 'dashed';
        }
    },

    previewGisImage: (url) => {
        const img = document.getElementById('gisPreviewImg');
        const holder = document.getElementById('gisPlaceholder');
        const box = document.querySelector('.gis-preview-box');
        if (url) {
            if (img) {
                img.src = url;
                img.classList.remove('d-none');
                img.onerror = () => {
                    console.error("Failed to load image:", url);
                    img.src = 'https://via.placeholder.com/400x300?text=Load+Error';
                };
            }
            if (holder) holder.classList.add('d-none');
            if (box) box.style.borderStyle = 'solid';
        } else {
            if (img) img.classList.add('d-none');
            if (holder) holder.classList.remove('d-none');
            if (box) box.style.borderStyle = 'dashed';
        }
    },

    handleGisUpload: async (event) => {
        const file = event.target.files ? event.target.files[0] : event;
        if (!file || !(file instanceof File)) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            Utils.showToast("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP)", 'error');
            const input = document.getElementById('gisFileInput');
            if (input) input.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB (Cloudinary free limit)
            Utils.showToast("ขนาดไฟล์ใหญ่เกินไป (สูงสุด 10MB)", 'error');
            const input = document.getElementById('gisFileInput');
            if (input) input.value = '';
            return;
        }

        // Show Loading
        const overlay = document.getElementById('gisLoadingOverlay');
        const loadingText = overlay ? overlay.querySelector('small') : null;
        overlay?.classList.remove('d-none');
        document.getElementById('gisFileInput').disabled = true;
        if (loadingText) loadingText.textContent = 'กำลังอัปโหลดไปยัง Cloud...';

        try {
            // ส่ง File object ตรงๆ ไปยัง Cloudinary (ไม่ต้องแปลง base64)
            const res = await DBManager.uploadFile({ file });

            if (res.status === 'success') {
                const publicUrl = res.url;
                document.getElementById('gisImgUrl').value = publicUrl;
                Form.previewGisImage(publicUrl);
                Utils.showToast("อัปโหลดรูปภาพสำเร็จ (WebP optimized) ✅");
            } else {
                throw new Error(res.message);
            }

        } catch (e) {
            console.error("Upload Error:", e);
            Utils.showToast("อัปโหลดไม่สำเร็จ: " + e.message, 'error');
            document.getElementById('gisImgUrl').value = '';
        } finally {
            // Hide Loading
            overlay?.classList.add('d-none');
            document.getElementById('gisFileInput').disabled = false;
            if (loadingText) loadingText.textContent = 'กำลังอัปโหลด...';
        }
    },

    /**
     * ตั้งค่า Drag & Drop สำหรับ GIS Image upload
     */
    setupGisDragDrop: () => {
        const dropZone = document.querySelector('.gis-preview-box');
        if (!dropZone) return;

        // Prevent default drag behaviors on document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight on drag over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-primary', 'bg-primary', 'bg-opacity-10');
            });
        });

        // Remove highlight on drag leave/drop
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-primary', 'bg-primary', 'bg-opacity-10');
            });
        });

        // Handle drop
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                Form.handleGisUpload({ target: { files } });
            }
        });

        // Click to open file dialog
        dropZone.addEventListener('click', (e) => {
            // ไม่ trigger ถ้าคลิกที่รูป preview (เพื่อให้สามารถคลิกขวาดูรูปได้)
            if (e.target.tagName === 'IMG') return;
            document.getElementById('gisFileInput')?.click();
        });
        dropZone.style.cursor = 'pointer';
    },



    renderImagesList: () => {
        const list = document.getElementById('installImageList');
        if (!list) return;
        list.innerHTML = Form.installImages.map(img => `
            <button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-2" onclick="Form.selectImage('${img.url}')">
                <img src="${img.url}" width="50" height="50" class="rounded object-fit-cover">
                <div><div class="fw-bold small">${img.name}</div></div>
            </button>
        `).join('');
    },

    selectImage: (url) => {
        document.querySelector('[name="Image_URL"]').value = url;
        Form.previewInstallImage(url);
        const modalEl = document.getElementById('imageSelectModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
};