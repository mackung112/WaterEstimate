// ============================================
// 1. CONFIGURATION
// ============================================

window.onload = async function () {
    // 1. ตรวจสอบ URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        alert("ไม่พบรหัสงาน (Job ID) ใน URL");
        return;
    }

    document.title = "ผังการติดตั้ง " + jobId;

    try {
        // 2. ตรวจสอบ Cache ก่อน
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

        const job = res.jobs.find(j => String(j.jobId) === String(jobId));
        if (!job) throw new Error("ไม่พบข้อมูลงาน ID: " + jobId);

        // 3. วาดหน้าจอ
        renderReport(job, res.personnel || []);

    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
};

function renderReport(job, personnel) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const setSrc = (id, src) => {
        const el = document.getElementById(id);
        if (el) {
            if (src && src.trim() !== "") {
                el.src = src;
                el.classList.remove('d-none');
            } else {
                el.classList.add('d-none');
            }
        }
    };

    // Helper to find value case-insensitively
    const getValue = (obj, key) => {
        if (!obj) return null;
        if (obj[key]) return obj[key]; // Exact match
        const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase().replace(/_/g, ''));
        return found ? obj[found] : null;
    };

    // 1. ข้อมูลลูกค้า & ที่อยู่ (Compact)
    const cName = job.customerName || job.Customer_Name || "-";

    // Construct Address
    const getVal = (k) => job[k] || getValue(job, k) || "-";

    const house = getVal('houseNo') || getVal('House_No');
    const moo = getVal('moo') || getVal('Moo');
    const tambon = getVal('tambon') || getVal('Tambon');
    const amphoe = getVal('amphoe') || getVal('Amphoe');
    const province = getVal('province') || getVal('Province');

    // สร้าง String สำหรับที่อยู่
    // ใช้ &nbsp; เพื่อเว้นวรรคให้สวยงาม
    setText('val_customer_name', cName);

    const addressStr = `${house}  ม. ${moo}  ต. ${tambon}  อ. ${amphoe}  จ. ${province}`;
    setText('val_address', addressStr);


    // 2. ข้อมูลการสำรวจ (Survey Info)
    // ใช้วันที่ขอ (Request Date) หรือวันที่ปัจจุบันหากไม่มี
    const surveyDate = job.requestDate ? new Date(job.requestDate) : new Date();
    const thaiDate = surveyDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    setText('val_survey_date', thaiDate); // วันที่สำรวจ

    // ชื่อผู้สำรวจ (ด้านบน)
    setText('val_surveyor_name_top', job.surveyorName || "..................................................");


    // 3. แผนที่ (Map) - Logic ใหม่: GIS Image > Map URL
    const gisVal = getValue(job, 'gisimageurl') || getValue(job, 'gis_image_url');
    const mapVal = getValue(job, 'mapurl') || getValue(job, 'map_url');

    const mapImg = document.getElementById('val_map_img');
    const mapFrame = document.getElementById('val_map_frame');
    const mapPlace = document.getElementById('map_placeholder');
    const leafletBox = document.getElementById('val_map_leaflet');

    // Reset All
    if (mapImg) mapImg.classList.add('d-none');
    if (mapFrame) mapFrame.classList.add('d-none');
    if (leafletBox) leafletBox.classList.add('d-none');
    if (mapPlace) mapPlace.classList.remove('d-none');

    // Prepare QR URL (Always based on Map/GPS)
    let qrUrl = "";
    if (mapVal && mapVal.trim() !== "") {
        const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(mapVal.trim());
        if (isCoords) {
            qrUrl = `https://maps.google.com/maps?q=${mapVal.replace(/\s/g, '')}`;
        } else {
            qrUrl = mapVal;
        }
    }

    // Display Logic: GIS Image vs GPS Map
    if (gisVal && gisVal.trim() !== "") {
        // Option A: Show GIS Image
        if (mapPlace) mapPlace.classList.add('d-none');
        if (mapImg) {
            mapImg.src = gisVal;
            mapImg.classList.remove('d-none');

            mapImg.onerror = () => {
                // Fallback if image fails? Maybe show map instead? 
                // For now, let's just log it.
                console.error("Failed to load GIS Image");
            };
        }
    } else if (mapVal && mapVal.trim() !== "") {
        // Option B: Show GPS Map (Leaflet)
        if (mapPlace) mapPlace.classList.add('d-none');

        const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(mapVal.trim());

        if (isCoords && leafletBox) {
            leafletBox.classList.remove('d-none');
            try {
                const parts = mapVal.split(',');
                const lat = parseFloat(parts[0].trim());
                const lng = parseFloat(parts[1].trim());

                if (!isNaN(lat) && !isNaN(lng)) {
                    if (window.myLeafletMap) window.myLeafletMap.remove();
                    const map = L.map('val_map_leaflet', {
                        center: [lat, lng],
                        zoom: 15,
                        zoomControl: false,
                        attributionControl: false
                    });
                    window.myLeafletMap = map;
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                    L.marker([lat, lng]).addTo(map);
                    setTimeout(() => { map.invalidateSize(); }, 500);
                }
            } catch (e) { console.error("Leaflet Error", e); }
        } else if (mapImg) {
            // Old Map Image URL
            mapImg.classList.remove('d-none');
            mapImg.src = mapVal;
        }
    }

    // Generate QR Code (Always Show if QR URL exists)
    const qrBox = document.getElementById('map_qr_code');
    if (qrBox && window.QRCode) {
        qrBox.innerHTML = '';
        if (qrUrl) {
            qrBox.classList.remove('d-none');
            try {
                new QRCode(qrBox, {
                    text: qrUrl,
                    width: 70,
                    height: 70,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
            } catch (e) { console.error("QR Error", e); }
        } else {
            qrBox.classList.add('d-none');
        }
    }



    // 4. รูปแบบการติดตั้ง (Standard Drawing)
    const imgVal = getValue(job, 'imageurl') || getValue(job, 'image_url');
    // console.log("Image Value:", imgVal);
    setSrc('val_install_img', imgVal);

    // Toggle placeholder for Install img
    const installPlace = document.getElementById('install_placeholder');
    if (imgVal && imgVal.trim() !== "") {
        if (installPlace) installPlace.classList.add('d-none');
    } else {
        if (installPlace) installPlace.classList.remove('d-none');
    }


    // 5. Signatures
    const findPerson = (name) => personnel.find(p => p.name === name) || {};

    // Surveyor
    const surveyor = findPerson(job.surveyorName);
    setText('val_surveyor_name', job.surveyorName || "........................................................");
    setText('val_surveyor_pos', surveyor.position || "........................................................"); // Default/Fallback

    const surveyorContainer = document.getElementById('sig_surveyor_container');
    if (surveyorContainer) {
        surveyorContainer.innerHTML = '';
        if (surveyor.signatureUrl) {
            surveyorContainer.innerHTML = `<img src="${surveyor.signatureUrl}" class="sig-img">`;
        }
    }

    // Inspector
    const inspector = findPerson(job.inspectorName);
    setText('val_inspector_name', job.inspectorName || "........................................................");
    setText('val_inspector_pos', inspector.position || "........................................................"); // Default/Fallback

    const inspectorContainer = document.getElementById('sig_inspector_container');
    if (inspectorContainer) {
        inspectorContainer.innerHTML = '';
        if (inspector.signatureUrl) {
            inspectorContainer.innerHTML = `<img src="${inspector.signatureUrl}" class="sig-img">`;
        }
    }
}
