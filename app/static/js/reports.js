/**
 * DoseWise Academy - Reports & Analytics Center View
 */

const ReportsView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('reports')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            ${I18N.t('reports')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'التقارير المالية المجمعة، أداء البرامج التدريبية، وتصدير البيانات' : 'Consolidated financial reports, course performance and data exports'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="ReportsView.exportCollectionsCsv()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${I18N.currentLang === 'ar' ? 'تصدير سجل التحصيلات CSV' : 'Export Collections CSV'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            ${I18N.t('print')}
          </button>
        </div>
      </div>

      <div id="reportsMainContainer">
        <div class="card" style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadReports();
  },

  async loadReports() {
    const container = document.getElementById('reportsMainContainer');
    try {
      const [finRes, courseRes] = await Promise.all([
        API.get('/api/reports/financial-overview'),
        API.get('/api/reports/course-performance')
      ]);

      const fin = finRes.summary;
      const methods = finRes.methods_breakdown || [];
      const categories = finRes.categories_breakdown || [];
      const coursesPerf = courseRes.courses_performance || [];

      container.innerHTML = `
        <!-- Financial Summary Banner -->
        <div class="kpi-grid" style="margin-bottom: 1.5rem;">
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.currentLang === 'ar' ? 'إجمالي الإيراد المحصل' : 'Total Collected'}</span>
              <div class="kpi-icon-wrap success">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div class="kpi-value" style="color: var(--accent-success);">${Number(fin.total_collections).toLocaleString('ar-EG')} ج.م</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.currentLang === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
              <div class="kpi-icon-wrap danger">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
              </div>
            </div>
            <div class="kpi-value" style="color: var(--accent-danger);">${Number(fin.total_expenses).toLocaleString('ar-EG')} ج.م</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.currentLang === 'ar' ? 'صافي الربح التشغيلي' : 'Net Operating Result'}</span>
              <div class="kpi-icon-wrap ${fin.net_operating_result >= 0 ? 'success' : 'danger'}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
              </div>
            </div>
            <div class="kpi-value" style="color: ${fin.net_operating_result >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">
              ${Number(fin.net_operating_result).toLocaleString('ar-EG')} ج.م
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.currentLang === 'ar' ? 'إجمالي ديون الطلاب' : 'Outstanding Debts'}</span>
              <div class="kpi-icon-wrap warning">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
              </div>
            </div>
            <div class="kpi-value">${Number(fin.total_receivables_debts).toLocaleString('ar-EG')} ج.م</div>
          </div>
        </div>

        <!-- Course Performance Table -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header">
            <h3 class="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              ${I18N.currentLang === 'ar' ? 'تقرير ربحية وأداء البرامج والدورات التدريبية' : 'Courses Performance & Profitability'}
            </h3>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${I18N.t('code')}</th>
                  <th>${I18N.currentLang === 'ar' ? 'اسم الدورة' : 'Course Name'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'المجموعات' : 'Groups'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'عدد المسجلين' : 'Enrollments'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'إجمالي الإيراد' : 'Revenue'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'المحصل' : 'Collected'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'الديون المتبقية' : 'Outstanding'}</th>
                </tr>
              </thead>
              <tbody>
                ${coursesPerf.map(cp => `
                  <tr>
                    <td><span class="badge badge-navy">${cp.code}</span></td>
                    <td><strong>${cp.name_ar}</strong></td>
                    <td>${cp.active_groups_count}</td>
                    <td><span class="badge badge-info">${cp.total_enrollments}</span></td>
                    <td><strong>${Number(cp.total_revenue).toLocaleString('ar-EG')} ج.م</strong></td>
                    <td style="color: var(--accent-success); font-weight: 700;">${Number(cp.total_collected).toLocaleString('ar-EG')} ج.م</td>
                    <td style="color: ${cp.total_outstanding_debt > 0 ? 'var(--accent-danger)' : 'var(--text-muted)'}; font-weight: 700;">
                      ${Number(cp.total_outstanding_debt).toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Breakdown Row -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Methods breakdown -->
          <div class="card">
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">${I18N.currentLang === 'ar' ? 'التحصيلات حسب وسيلة الدفع' : 'Collections by Payment Method'}</h4>
            <div class="table-responsive">
              <table class="data-table">
                <tbody>
                  ${methods.map(m => `
                    <tr>
                      <td><span class="badge badge-navy">${m.payment_method}</span></td>
                      <td>${m.count} ${I18N.currentLang === 'ar' ? 'عملية' : 'transactions'}</td>
                      <td><strong>${Number(m.total).toLocaleString('ar-EG')} ج.م</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Expenses by category -->
          <div class="card">
            <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">${I18N.currentLang === 'ar' ? 'المصروفات حسب البند' : 'Expenses by Category'}</h4>
            <div class="table-responsive">
              <table class="data-table">
                <tbody>
                  ${categories.map(c => `
                    <tr>
                      <td><span class="badge badge-danger">${c.category}</span></td>
                      <td>${c.count} ${I18N.currentLang === 'ar' ? 'سند' : 'vouchers'}</td>
                      <td><strong>${Number(c.total).toLocaleString('ar-EG')} ج.م</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-danger); padding: 1.5rem;">${e.message}</div>`;
    }
  },

  async exportCollectionsCsv() {
    try {
      const res = await API.get('/api/reports/export/collections-csv');
      if (res.isBlob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dosewise_collections_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showToast(I18N.currentLang === 'ar' ? 'تم تصدير ملف التحصيلات بنجاح' : 'Collections exported successfully', 'success');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
