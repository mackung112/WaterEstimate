/**
 * Router - Core Navigation Logic
 * จัดการการเปลี่ยนหน้า (Routing) และโหลด Resource แบบ Dynamic
 */
const Router = {
    /**
     * Load a page dynamically
     * @param {string} pageName - Name of the folder/file (e.g. 'dashboard', 'form')
     * @param {any} param - Optional parameter to pass to the page's init function
     */
    load: async (pageName, param = null) => {
        Router.toggleLoading(true);

        try {
            // 1. Navbar Active State
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            const navBtn = document.getElementById(`nav-${pageName}`);
            if (navBtn) navBtn.classList.add('active');

            // 2. Load HTML
            const response = await fetch(`pages/${pageName}/${pageName}.html`);
            if (!response.ok) throw new Error("Page not found");
            const html = await response.text();
            document.getElementById('app-content').innerHTML = html;

            // 3. Load Page CSS
            const style = document.getElementById('page-style');
            if (style) style.href = `pages/${pageName}/${pageName}.css`;

            // 4. Load Page JS
            const oldScript = document.getElementById('page-script');
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.src = `pages/${pageName}/${pageName}.js`;
            script.id = 'page-script';

            // Execute init() after script loads
            script.onload = () => {
                // Convention: Module name matches Page name (PascalCase)
                // e.g. dashboard -> Dashboard, form -> Form
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