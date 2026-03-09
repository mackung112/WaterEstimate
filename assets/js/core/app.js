/**
 * Router - ลอจิกการนำทางหลัก
 * จัดการการเปลี่ยนหน้า (Routing) และโหลด Resource แบบ Dynamic
 */
const Router = {
    /**
     * โหลดหน้าแบบ Dynamic
     * @param {string} pageName - ชื่อโฟลเดอร์/ไฟล์ (เช่น 'dashboard', 'form')
     * @param {any} param - พารามิเตอร์ที่จะส่งไปยังฟังก์ชัน init ของหน้า
     */
    load: async (pageName, param = null) => {
        Router.toggleLoading(true);

        try {
            // 1. อัพเดตสถานะ Navbar
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            const navBtn = document.getElementById(`nav-${pageName}`);
            if (navBtn) navBtn.classList.add('active');

            // 2. โหลด HTML
            const response = await fetch(`pages/${pageName}/${pageName}.html`);
            if (!response.ok) throw new Error("Page not found");
            const html = await response.text();
            document.getElementById('app-content').innerHTML = html;

            // 3. โหลด CSS ของหน้า
            const style = document.getElementById('page-style');
            if (style) style.href = `pages/${pageName}/${pageName}.css`;

            // 4. โหลด JS ของหน้า
            const oldScript = document.getElementById('page-script');
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.src = `pages/${pageName}/${pageName}.js`;
            script.id = 'page-script';

            // เรียก init() หลังจากโหลด script เสร็จ
            script.onload = () => {
                // ชื่อ Module ตรงกับชื่อหน้า (PascalCase)
                // เช่น dashboard -> Dashboard, form -> Form
                const moduleName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

                if (window[moduleName] && typeof window[moduleName].init === 'function') {
                    window[moduleName].init(param);
                }
            };
            document.body.appendChild(script);

        } catch (error) {
            console.error(error);
            const content = document.getElementById('app-content');
            if (content) content.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        } finally {
            Router.toggleLoading(false);
        }
    },

    /**
     * แสดง/ซ่อน Loading Spinner ระดับ Global
     * @param {boolean} show - true = แสดง, false = ซ่อน
     */
    toggleLoading: (show) => {
        const el = document.getElementById('loading');
        if (el) show ? el.classList.remove('d-none') : el.classList.add('d-none');
    }
};

// โหลดหน้า Dashboard เมื่อทุกอย่างพร้อม
window.onload = () => Router.load('dashboard');