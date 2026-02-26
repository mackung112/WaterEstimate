/**
 * DBManager - Supabase Database Service
 * จัดการการเชื่อมต่อกับ Supabase (แทนที่ Google Apps Script)
 */
const DBManager = (() => {
    // สร้าง Supabase Client
    const supabase = window.supabase.createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_ANON_KEY
    );

    // ============================================================
    // Helper: แปลง snake_case (DB) ↔ camelCase (Frontend)
    // ============================================================

    const SNAKE_TO_CAMEL = {
        'job_id': 'jobId', 'request_no': 'requestNo', 'request_date': 'requestDate',
        'estimate_no': 'estimateNo', 'customer_name': 'customerName', 'house_no': 'houseNo',
        'meter_size': 'meterSize', 'user_number': 'userNumber',
        'map_url': 'mapUrl', 'image_url': 'imageUrl', 'gis_image_url': 'gisImageUrl',
        'surveyor_name': 'surveyorName', 'surveyor_pos': 'surveyorPos',
        'inspector_name': 'inspectorName', 'inspector_pos': 'inspectorPos',
        'approver_name': 'approverName', 'approver_pos': 'approverPos',
        'print_date': 'printDate',
        'transaction_id': 'transactionId', 'material_id': 'materialId',
        'item_name': 'itemName', 'unit_price_mat': 'unitPriceMaterial',
        'unit_price_labor': 'unitPriceLabor', 'total_price': 'totalPrice',
        'price_material': 'unitPriceMaterial', 'price_labor': 'unitPriceLabor',
        'personnel_id': 'personnelId', 'role_type': 'roleType',
        'signature_url': 'signatureUrl'
    };

    const CAMEL_TO_SNAKE = {};
    for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL)) {
        // หลีกเลี่ยง duplicate: ถ้า camel key ซ้ำ ให้ใช้ตัวแรก
        if (!CAMEL_TO_SNAKE[camel]) CAMEL_TO_SNAKE[camel] = snake;
    }

    /**
     * แปลง record จาก snake_case → camelCase
     */
    function toCamel(record) {
        if (!record) return record;
        const result = {};
        for (const [key, val] of Object.entries(record)) {
            result[SNAKE_TO_CAMEL[key] || key] = val;
        }
        return result;
    }

    /**
     * แปลง record จาก camelCase → snake_case
     */
    function toSnake(record, allowedKeys) {
        if (!record) return record;
        const result = {};
        for (const [key, val] of Object.entries(record)) {
            const snakeKey = CAMEL_TO_SNAKE[key] || key;
            if (!allowedKeys || allowedKeys.includes(snakeKey)) {
                result[snakeKey] = val === undefined ? null : val;
            }
        }
        return result;
    }

    // คอลัมน์ที่อนุญาตในแต่ละตาราง
    const JOB_COLS = [
        'job_id', 'timestamp', 'request_no', 'request_date', 'estimate_no',
        'customer_name', 'house_no', 'moo', 'tambon', 'amphoe', 'province',
        'meter_size', 'status', 'user_number', 'map_url', 'image_url', 'gis_image_url',
        'surveyor_name', 'surveyor_pos', 'inspector_name', 'inspector_pos',
        'approver_name', 'approver_pos', 'print_date'
    ];

    const ITEM_COLS = [
        'transaction_id', 'job_id', 'section', 'material_id', 'item_name',
        'quantity', 'unit', 'unit_price_mat', 'unit_price_labor', 'total_price'
    ];

    const MATERIAL_COLS = [
        'material_id', 'item_name', 'category', 'size', 'unit',
        'price_material', 'price_labor'
    ];

    const PERSONNEL_COLS = [
        'personnel_id', 'name', 'role_type', 'position', 'signature_url'
    ];

    // ============================================================
    // Public API
    // ============================================================

    return {
        // เปิดให้ report pages เข้าถึง supabase client
        _supabase: supabase,

        /**
         * Normalize record (สำหรับ backward compatibility)
         */
        normalizeRecord: toCamel,

        // ============================================================
        // 1. ดึงข้อมูลทั้งหมด
        // ============================================================

        getDatabase: async (limit = 0) => {
            try {
                // ดึง 4 ตารางพร้อมกัน
                const [matRes, perRes, jobRes, itemRes] = await Promise.all([
                    supabase.from('master_materials').select('*'),
                    supabase.from('master_personnel').select('*'),
                    limit > 0
                        ? supabase.from('jobs').select('*').order('timestamp', { ascending: false }).limit(limit)
                        : supabase.from('jobs').select('*').order('timestamp', { ascending: false }),
                    supabase.from('job_items').select('*')
                ]);

                // ตรวจสอบ error
                for (const res of [matRes, perRes, jobRes, itemRes]) {
                    if (res.error) throw res.error;
                }

                const materials = (matRes.data || []).map(toCamel);
                const personnel = (perRes.data || []).map(toCamel);
                const rawItems = (itemRes.data || []).map(toCamel);

                // รวม items เข้ากับ jobs
                const itemsMap = {};
                rawItems.forEach(item => {
                    const jId = String(item.jobId);
                    if (!itemsMap[jId]) itemsMap[jId] = [];
                    itemsMap[jId].push(item);
                });

                const jobs = (jobRes.data || []).map(job => {
                    const normJob = toCamel(job);
                    normJob.items = itemsMap[String(normJob.jobId)] || [];
                    return normJob;
                });

                return { status: 'success', materials, personnel, jobs };
            } catch (error) {
                console.error("Supabase getDatabase Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        // Alias สำหรับ backward compatibility
        getDatbase: async (limit = 0) => {
            return await DBManager.getDatabase(limit);
        },

        // ============================================================
        // 2. Jobs CRUD
        // ============================================================

        saveJob: async (jobData) => {
            try {
                // เตรียมข้อมูล Job
                const jobRow = toSnake(jobData, JOB_COLS);
                if (!jobRow.timestamp) jobRow.timestamp = new Date().toISOString();

                // Upsert Job
                const { error: jobError } = await supabase
                    .from('jobs')
                    .upsert(jobRow, { onConflict: 'job_id' });

                if (jobError) throw jobError;

                // ลบ Items เดิม แล้วเพิ่มใหม่
                await supabase.from('job_items').delete().eq('job_id', jobData.jobId);

                if (jobData.items && jobData.items.length > 0) {
                    const itemRows = jobData.items.map((item, idx) => {
                        item.jobId = jobData.jobId;
                        if (!item.transactionId) item.transactionId = `${jobData.jobId}-${idx + 1}`;
                        return toSnake(item, ITEM_COLS);
                    });

                    const { error: itemError } = await supabase
                        .from('job_items')
                        .insert(itemRows);

                    if (itemError) throw itemError;
                }

                return { status: 'success', message: 'บันทึกงานเรียบร้อย' };
            } catch (error) {
                console.error("Supabase saveJob Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        deleteJob: async (jobId) => {
            try {
                // job_items จะถูกลบอัตโนมัติผ่าน ON DELETE CASCADE
                const { error } = await supabase
                    .from('jobs')
                    .delete()
                    .eq('job_id', jobId);

                if (error) throw error;
                return { status: 'success', message: 'ลบงานเรียบร้อย' };
            } catch (error) {
                console.error("Supabase deleteJob Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        // ============================================================
        // 3. Personnel CRUD
        // ============================================================

        savePersonnel: async (personnelData) => {
            try {
                const row = toSnake(personnelData, PERSONNEL_COLS);
                const { error } = await supabase
                    .from('master_personnel')
                    .upsert(row, { onConflict: 'personnel_id' });

                if (error) throw error;
                return { status: 'success', message: 'บันทึกบุคลากรเรียบร้อย' };
            } catch (error) {
                console.error("Supabase savePersonnel Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        deletePersonnel: async (id) => {
            try {
                const { error } = await supabase
                    .from('master_personnel')
                    .delete()
                    .eq('personnel_id', id);

                if (error) throw error;
                return { status: 'success', message: 'ลบบุคลากรเรียบร้อย' };
            } catch (error) {
                console.error("Supabase deletePersonnel Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        // ============================================================
        // 4. Materials CRUD
        // ============================================================

        saveMaterial: async (materialData) => {
            try {
                const row = toSnake(materialData, MATERIAL_COLS);
                const { error } = await supabase
                    .from('master_materials')
                    .upsert(row, { onConflict: 'material_id' });

                if (error) throw error;
                return { status: 'success', message: 'บันทึกวัสดุเรียบร้อย' };
            } catch (error) {
                console.error("Supabase saveMaterial Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        deleteMaterial: async (id) => {
            try {
                const { error } = await supabase
                    .from('master_materials')
                    .delete()
                    .eq('material_id', id);

                if (error) throw error;
                return { status: 'success', message: 'ลบวัสดุเรียบร้อย' };
            } catch (error) {
                console.error("Supabase deleteMaterial Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        // ============================================================
        // 5. Print Status
        // ============================================================

        updatePrintStatus: async (jobId, isPrinted) => {
            try {
                const { error } = await supabase
                    .from('jobs')
                    .update({ print_date: isPrinted ? new Date().toISOString() : null })
                    .eq('job_id', jobId);

                if (error) throw error;
                return { status: 'success', message: 'อัพเดตสถานะปริ้นเรียบร้อย' };
            } catch (error) {
                console.error("Supabase updatePrintStatus Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        // ============================================================
        // 6. File Upload (Cloudinary)
        // ============================================================

        /**
         * อัปโหลดรูปภาพไปยัง Cloudinary (unsigned upload)
         * รองรับการส่ง File object โดยตรง (ประหยัด memory ไม่ต้องแปลง base64)
         * @param {File|Object} fileOrData - File object หรือ { file: File }
         * @returns {Object} { status, url, message }
         */
        uploadFile: async (fileOrData) => {
            try {
                // รองรับทั้ง File object ตรงๆ และ { file: File }
                const file = fileOrData instanceof File ? fileOrData : fileOrData.file;

                if (!file || !(file instanceof File)) {
                    throw new Error('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง');
                }

                // ตรวจสอบประเภทไฟล์
                if (!file.type.startsWith('image/')) {
                    throw new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
                }

                // ตรวจสอบขนาดไฟล์ (สูงสุด 10MB — Cloudinary free plan)
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 10MB)');
                }

                // สร้าง FormData สำหรับ Cloudinary Upload API
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
                formData.append('folder', 'water-estimate/gis');

                // Cloudinary Upload API (unsigned)
                const cloudName = CONFIG.CLOUDINARY_CLOUD_NAME;
                const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error('Cloudinary response error:', errorBody);
                    throw new Error('Cloudinary อัปโหลดไม่สำเร็จ (HTTP ' + response.status + ')');
                }

                const result = await response.json();

                if (!result.secure_url) {
                    throw new Error('ไม่ได้รับ URL กลับจาก Cloudinary');
                }

                // สร้าง Optimized URL ด้วย Transformation
                // f_webp = แปลงเป็น WebP, q_auto:eco = คุณภาพประหยัด, w_800,c_limit = จำกัดความกว้าง 800px
                const optimizedUrl = result.secure_url.replace(
                    '/upload/',
                    '/upload/f_webp,q_auto:eco,w_800,c_limit/'
                );

                return { status: 'success', url: optimizedUrl };
            } catch (error) {
                console.error("Cloudinary uploadFile Error:", error);
                return { status: 'error', message: 'อัปโหลดไม่สำเร็จ: ' + error.message };
            }
        },

        /**
         * ดึง URL ของรูปภาพ (รองรับทั้ง Cloudinary, Supabase เดิม, และ URL ภายนอก)
         */
        getImage: async (imageId) => {
            try {
                // ถ้าเป็น URL อยู่แล้ว ส่งกลับตรงๆ
                if (imageId && (imageId.startsWith('http://') || imageId.startsWith('https://'))) {
                    return { status: 'success', data: imageId };
                }

                // ไม่มี URL
                return { status: 'error', message: 'ไม่พบรูปภาพ' };
            } catch (error) {
                console.error("getImage Error:", error);
                return { status: 'error', message: error.message };
            }
        },

        // ============================================================
        // 7. Report Generation (ยังไม่ใช้บน Supabase - คงไว้สำหรับ API compatibility)
        // ============================================================

        createQuotation: async (jobData) => {
            return { status: 'info', message: 'รายงานถูกสร้างฝั่ง client แล้ว' };
        },

        createEstimate: async (jobData) => {
            return { status: 'info', message: 'รายงานถูกสร้างฝั่ง client แล้ว' };
        },

        createLayout: async (jobData) => {
            return { status: 'info', message: 'รายงานถูกสร้างฝั่ง client แล้ว' };
        }
    };
})();