/**
 * DBManager - Database Service
 * จัดการการเชื่อมต่อกับ Google Apps Script Web App (Backend)
 */
const DBManager = {
    /**
     * Helper Function for sending HTTP Requests
     * @param {string} action - Action name (e.g. 'getData', 'saveJob')
     * @param {Object} payload - Data to be sent
     * @returns {Promise<Object>} Response JSON
     */
    /**
     * สร้าง payload สำหรับส่งไป API (ฝัง action เข้าไปใน body)
     * @param {string} action - ชื่อ action
     * @param {Object} data - ข้อมูลที่ต้องการส่ง
     * @returns {Object} payload ที่พร้อมส่ง
     */
    _buildPayload: (action, data) => ({ ...data, action }),

    async sendRequest(action, payload = {}) {
        // ใช้เทคนิค text/plain เพื่อเลี่ยง CORS preflight ในบางกรณี
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=${action}`, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(DBManager._buildPayload(action, payload)),
                redirect: "follow"
            });
            return await response.json();
        } catch (error) {
            console.error("DB Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // ============================================================
    // 1. JOBS MANAGEMENT
    // ============================================================

    /**
     * ดึงข้อมูลทั้งหมดจากฐานข้อมูล (Job, Material, Personnel)
     * @param {number} limit - จำกัดจำนวนรายการ (0 = ทั้งหมด)
     */
    getDatabase: async (limit = 0) => {
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getData&limit=${limit}&t=${Date.now()}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();

            // Normalize Data Keys (PascalCase/SnakeCase -> camelCase)
            // เพื่อรองรับทั้ง Backend เก่า และ ใหม่
            if (data.materials) data.materials = data.materials.map(DBManager.normalizeRecord);
            if (data.personnel) data.personnel = data.personnel.map(DBManager.normalizeRecord);
            if (data.jobs) {
                data.jobs = data.jobs.map(job => {
                    const normJob = DBManager.normalizeRecord(job);
                    if (normJob.items && Array.isArray(normJob.items)) {
                        normJob.items = normJob.items.map(DBManager.normalizeRecord);
                    }
                    return normJob;
                });
            }

            return data;
        } catch (error) {
            console.error("Get Database Error:", error);
            return { status: "error", message: error.message };
        }
    },

    // Alias for backward compatibility (Typos in some files)
    getDatbase: async (limit = 0) => {
        return await DBManager.getDatabase(limit);
    },

    saveJob: async (jobData) => {
        return await DBManager.sendRequest("saveJob", jobData);
    },

    deleteJob: async (jobId) => {
        return await DBManager.sendRequest("deleteJob", { jobId });
    },

    // ============================================================
    // 2. PERSONNEL MANAGEMENT
    // ============================================================

    savePersonnel: async (personnelData) => {
        return await DBManager.sendRequest("savePersonnel", personnelData);
    },

    deletePersonnel: async (id) => {
        return await DBManager.sendRequest("deletePersonnel", { id });
    },

    // ============================================================
    // 3. MATERIALS MANAGEMENT
    // ============================================================

    saveMaterial: async (materialData) => {
        return await DBManager.sendRequest("saveMaterial", materialData);
    },

    deleteMaterial: async (id) => {
        return await DBManager.sendRequest("deleteMaterial", { id });
    },

    // ============================================================
    // 4. REPORT GENERATION
    // ============================================================

    createQuotation: async (jobData) => {
        return await DBManager.sendRequest("createQuotation", jobData);
    },

    createEstimate: async (jobData) => {
        return await DBManager.sendRequest("createEstimate", jobData);
    },

    createLayout: async (jobData) => {
        return await DBManager.sendRequest("createLayout", jobData);
    },

    updatePrintStatus: async (jobId, isPrinted) => {
        return await DBManager.sendRequest("updatePrintStatus", {
            jobId,
            isPrinted
        });
    },

    // ============================================================
    // 6. FILE MANAGEMENT
    // ============================================================

    uploadFile: async (fileData) => {
        return await DBManager.sendRequest("uploadFile", fileData);
    },

    /**
     * ดึงข้อมูลรูปภาพ (Base64) จาก Image ID
     */
    getImage: async (imageId) => {
        return await DBManager.sendRequest("getImage", { id: imageId });
    },

    // ============================================================
    // 5. HELPER FUNCTIONS
    // ============================================================

    /**
     * Map Legacy Headers (SnakeCase/PascalCase) to camelCase
     */
    normalizeRecord: (record) => {
        const MAP = {
            // Common
            'Timestamp': 'timestamp',
            // Job
            'Job_ID': 'jobId', 'Request_No': 'requestNo', 'Request_Date': 'requestDate',
            'Estimate_No': 'estimateNo', 'Customer_Name': 'customerName', 'House_No': 'houseNo',
            'Moo': 'moo', 'Tambon': 'tambon', 'Amphoe': 'amphoe', 'Province': 'province',
            'Meter_Size': 'meterSize', 'Status': 'status', 'User_Number': 'userNumber',
            'Map_URL': 'mapUrl', 'Image_URL': 'imageUrl',
            'Surveyor_Name': 'surveyorName', 'Surveyor_Pos': 'surveyorPos',
            'Inspector_Name': 'inspectorName', 'Inspector_Pos': 'inspectorPos',
            'Approver_Name': 'approverName', 'Approver_Pos': 'approverPos',
            'Print_Date': 'printDate',
            'Gis_Image_URL': 'gisImageUrl', // [NEW] GIS Image
            // Items
            'Transaction_ID': 'transactionId', 'Section': 'section',
            'Material_ID': 'materialId', 'Item_Name': 'itemName', 'Quantity': 'quantity',
            'Unit': 'unit', 'Total_Price': 'totalPrice',
            'Unit_Price_Mat': 'unitPriceMaterial', 'Unit_Price_Labor': 'unitPriceLabor', // Items Sheet
            'Price_Material': 'unitPriceMaterial', 'Price_Labor': 'unitPriceLabor',       // Master Sheet
            'Category': 'category', 'Size': 'size',
            // Personnel
            'Personnel_ID': 'personnelId', 'Name': 'name', 'Role_Type': 'roleType',
            'Position': 'position', 'Signature_URL': 'signatureUrl'
        };

        const newRec = {};
        for (const [key, val] of Object.entries(record)) {
            // Priority: Detailed Map > Lowecase (fallback) -> Original
            let newKey = MAP[key];
            if (!newKey) {
                // Keep original if it looks like camelCase already (starts with lowercase)
                if (key.charAt(0).toLowerCase() === key.charAt(0)) {
                    newKey = key;
                } else {
                    // Try simple lowercase conversion for other keys? 
                    // No, risky. Better to preserve unknown keys as-is.
                    newKey = key;
                }
            }
            newRec[newKey] = val;
        }
        return newRec;
    }
};