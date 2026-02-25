const ReportManager = {
    printQuotation: async (jobData) => {
        localStorage.setItem('reportData', JSON.stringify(jobData));
        window.open('pages/form/reports/r1_detail/r1.html', '_blank');
    },

    printEstimate: async (jobData) => {
        localStorage.setItem('reportData', JSON.stringify(jobData));
        window.open('pages/form/reports/r2_detail/r2.html', '_blank');
    },

    printLayout: async (jobData) => {
        localStorage.setItem('reportData', JSON.stringify(jobData));
        window.open('pages/form/reports/r3_detail/r3.html', '_blank');
    }
};