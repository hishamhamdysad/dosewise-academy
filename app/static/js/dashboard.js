/**
 * DoseWise Academy - Main Dashboard Engine
 * Live KPI Cards, Dynamic Interactive SVG Charts, Operational Tables
 */

const DashboardView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `<div class="card" style="text-align: center; padding: 3rem;">${I18N.t('loading')}</div>`;

    try {
      const [summaryData, chartsData, widgetsData] = await Promise.all([
        API.get('/api/dashboard/summary'),
        API.get('/api/dashboard/charts'),
        API.get('/api/dashboard/live-widgets')
      ]);

      const fin = summaryData.finance;
      const acad = summaryData.academic;
      const stu = summaryData.students;

      content.innerHTML = `
        <div class="page-header">
          <div class="page-title-group">
            <div class="breadcrumbs">
              <span>${I18N.t('appName')}</span>
              <span>/</span>
              <span>${I18N.t('dashboard')}</span>
            </div>
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
              ${I18N.t('dashboard')}
            </h1>
            <p class="page-subtitle">${I18N.t('appSubName')} - ${I18N.currentLang === 'ar' ? 'نظرة شاملة ومباشرة على العمليات والتحصيلات' : 'Live Operations & Financial Overview'}</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary btn-sm" onclick="DashboardView.render()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              ${I18N.currentLang === 'ar' ? 'تحديث البيانات' : 'Refresh'}
            </button>
            <button class="btn btn-primary btn-sm" onclick="StudentsView.openRegisterModal()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              ${I18N.currentLang === 'ar' ? 'تسجيل طالب جديد' : 'New Student'}
            </button>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- Total & Active Students -->
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.t('totalStudents')}</span>
              <div class="kpi-icon-wrap cyan">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>
            <div class="kpi-value">${stu.total}</div>
            <div class="kpi-meta">
              <span class="badge badge-success">${stu.active} ${I18N.t('activeStudents')}</span>
              <span>+${stu.new_this_month} ${I18N.currentLang === 'ar' ? 'هذا الشهر' : 'this month'}</span>
            </div>
          </div>

          <!-- Collections Month -->
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.t('collectionsMonth')}</span>
              <div class="kpi-icon-wrap success">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div class="kpi-value">${fin.collections_month.toLocaleString('ar-EG')} <small style="font-size: 0.95rem;">${fin.currency}</small></div>
            <div class="kpi-meta">
              <span class="badge badge-navy">${I18N.t('collectionsToday')}: ${fin.collections_today.toLocaleString('ar-EG')} ${fin.currency}</span>
            </div>
          </div>

          <!-- Outstanding Debts -->
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.t('outstandingDebts')}</span>
              <div class="kpi-icon-wrap danger">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
            </div>
            <div class="kpi-value" style="color: var(--accent-danger);">${fin.outstanding_debts.toLocaleString('ar-EG')} <small style="font-size: 0.95rem;">${fin.currency}</small></div>
            <div class="kpi-meta">
              <span class="badge badge-danger">${fin.overdue_installments_count} ${I18N.t('overdueInstallments')} (${fin.overdue_installments_amount.toLocaleString('ar-EG')} ${fin.currency})</span>
            </div>
          </div>

          <!-- Net Operating Result -->
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.t('netOperatingResult')}</span>
              <div class="kpi-icon-wrap ${fin.net_operating_result >= 0 ? 'success' : 'danger'}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
            </div>
            <div class="kpi-value" style="color: ${fin.net_operating_result >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">
              ${fin.net_operating_result.toLocaleString('ar-EG')} <small style="font-size: 0.95rem;">${fin.currency}</small>
            </div>
            <div class="kpi-meta">
              <span>${I18N.t('monthlyExpenses')}: ${fin.monthly_expenses.toLocaleString('ar-EG')} ${fin.currency}</span>
            </div>
          </div>

          <!-- Academic KPIs -->
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.currentLang === 'ar' ? 'الدورات والمجموعات النشطة' : 'Courses & Groups'}</span>
              <div class="kpi-icon-wrap purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
            </div>
            <div class="kpi-value">${acad.active_courses} <small style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">(${acad.active_groups} مجموعات)</small></div>
            <div class="kpi-meta">
              <span class="badge badge-purple">${acad.total_trainers} ${I18N.t('totalTrainers')}</span>
              <span>${acad.today_sessions} ${I18N.t('todaySessions')}</span>
            </div>
          </div>

          <!-- Attendance Rate -->
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">${I18N.t('attendanceRate')}</span>
              <div class="kpi-icon-wrap navy">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
            </div>
            <div class="kpi-value">${acad.attendance_rate}%</div>
            <div class="kpi-meta">
              <span class="badge badge-info">${acad.today_sessions} ${I18N.currentLang === 'ar' ? 'محاضرة اليوم' : 'sessions today'}</span>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem; margin-bottom: 1.75rem;">
          <!-- Monthly Revenue vs Expenses Chart -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                ${I18N.currentLang === 'ar' ? 'مقارنة التحصيلات والمصروفات الشهرية' : 'Monthly Collections vs Expenses'}
              </h3>
            </div>
            <div class="chart-box" id="revenueTrendChart">
              ${DashboardView.renderBarChartSvg(chartsData.monthly_trend)}
            </div>
          </div>

          <!-- Course Popularity & Revenue -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-cyan)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                ${I18N.currentLang === 'ar' ? 'توزيع التسجيلات والإيراد حسب الدورات' : 'Enrollment & Revenue by Course'}
              </h3>
            </div>
            <div class="chart-box" id="coursesPopularityChart">
              ${DashboardView.renderCourseBreakdownHtml(chartsData.courses_popularity)}
            </div>
          </div>
        </div>

        <!-- Operational Widgets Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem;">
          <!-- Today's Sessions -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${I18N.currentLang === 'ar' ? 'محاضرات اليوم وجلسات التدريب' : "Today's Sessions"}
              </h3>
              <button class="btn btn-sm btn-secondary" onclick="App.navigate('calendar')">${I18N.t('calendar')}</button>
            </div>
            ${DashboardView.renderTodaySessions(widgetsData.today_sessions)}
          </div>

          <!-- Overdue Installments with WhatsApp link -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="color: var(--accent-danger);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${I18N.currentLang === 'ar' ? 'متابعة الأقساط المتأخرة والتحصيل' : 'Overdue Installments & Collection'}
              </h3>
              <button class="btn btn-sm btn-secondary" onclick="App.navigate('finance')">${I18N.t('finance')}</button>
            </div>
            ${DashboardView.renderOverdueTable(widgetsData.overdue_installments)}
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div class="card" style="color: var(--accent-danger); padding: 2rem;">فشل تحميل لوحة التحكم: ${e.message}</div>`;
    }
  },

  renderBarChartSvg(trend) {
    if (!trend || !trend.labels || trend.labels.length === 0) {
      return `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
    }

    const maxVal = Math.max(...trend.revenue, ...trend.expenses, 10000);
    const barsHtml = trend.labels.map((lbl, idx) => {
      const rev = trend.revenue[idx] || 0;
      const exp = trend.expenses[idx] || 0;
      const revPct = Math.round((rev / maxVal) * 100);
      const expPct = Math.round((exp / maxVal) * 100);

      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 0.5rem;">
          <div style="display: flex; gap: 4px; align-items: flex-end; height: 190px; width: 100%; justify-content: center;">
            <!-- Revenue Bar -->
            <div style="width: 18px; height: ${revPct}%; background: linear-gradient(180deg, var(--brand-turquoise), var(--brand-cyan)); border-radius: 4px 4px 0 0; position: relative; transition: height 0.5s ease;" title="${I18N.t('collectionsMonth')}: ${rev.toLocaleString()} ${I18N.t('currency')}"></div>
            <!-- Expense Bar -->
            <div style="width: 18px; height: ${expPct}%; background: linear-gradient(180deg, var(--accent-danger), #B91C1C); border-radius: 4px 4px 0 0; position: relative; transition: height 0.5s ease;" title="${I18N.t('monthlyExpenses')}: ${exp.toLocaleString()} ${I18N.t('currency')}"></div>
          </div>
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-align: center; white-space: nowrap;">${lbl}</span>
        </div>
      `;
    }).join('');

    return `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <div style="display: flex; gap: 1.5rem; justify-content: flex-end; margin-bottom: 0.5rem; font-size: 0.78rem; font-weight: 700;">
          <span style="display: flex; align-items: center; gap: 0.4rem;"><span style="width: 12px; height: 12px; border-radius: 3px; background: var(--brand-turquoise);"></span> ${I18N.currentLang === 'ar' ? 'التحصيلات' : 'Collections'}</span>
          <span style="display: flex; align-items: center; gap: 0.4rem;"><span style="width: 12px; height: 12px; border-radius: 3px; background: var(--accent-danger);"></span> ${I18N.currentLang === 'ar' ? 'المصروفات' : 'Expenses'}</span>
        </div>
        <div style="display: flex; gap: 0.75rem; flex: 1; align-items: flex-end; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
          ${barsHtml}
        </div>
      </div>
    `;
  },

  renderCourseBreakdownHtml(courses) {
    if (!courses || courses.length === 0) {
      return `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
    }

    const items = courses.slice(0, 5).map(c => {
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">${c.name_ar}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${c.code}</span>
          </div>
          <div style="text-align: end;">
            <span class="badge badge-navy" style="font-size: 0.82rem;">${c.enrollments_count} ${I18N.currentLang === 'ar' ? 'طالب مسجل' : 'students'}</span>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--brand-turquoise); margin-top: 0.2rem;">${Number(c.total_revenue).toLocaleString('ar-EG')} ${I18N.t('currency')}</div>
          </div>
        </div>
      `;
    }).join('');

    return `<div style="overflow-y: auto; max-height: 250px;">${items}</div>`;
  },

  renderTodaySessions(sessions) {
    if (!sessions || sessions.length === 0) {
      return `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <p>${I18N.currentLang === 'ar' ? 'لا توجد محاضرات مجدولة لهذا اليوم' : 'No sessions scheduled for today'}</p>
        </div>
      `;
    }

    const rows = sessions.map(s => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-body); border-radius: var(--radius-md); margin-bottom: 0.6rem; border-inline-start: 4px solid var(--brand-turquoise);">
        <div>
          <div style="font-weight: 700; font-size: 0.9rem;">${s.course_name_ar} (${s.group_name})</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">
            ${s.classroom_name} • ${s.trainer_name || 'غير محدد'} • المحاضرة #${s.session_number}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge badge-info">${s.start_time} - ${s.end_time}</span>
          <button class="btn btn-sm btn-primary" onclick="AttendanceView.openSessionRoster(${s.id})">
            ${I18N.currentLang === 'ar' ? 'تحضير' : 'Attendance'}
          </button>
        </div>
      </div>
    `).join('');

    return `<div style="overflow-y: auto; max-height: 280px;">${rows}</div>`;
  },

  renderOverdueTable(overdueList) {
    if (!overdueList || overdueList.length === 0) {
      return `
        <div style="text-align: center; padding: 2rem; color: var(--accent-success);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <p>${I18N.currentLang === 'ar' ? 'ممتاز! لا توجد أي أقساط متأخرة مستحقة حالياً' : 'Great! No overdue installments at this time'}</p>
        </div>
      `;
    }

    const rows = overdueList.map(item => {
      const cleanPhone = (item.whatsapp_number || item.mobile_number || '').replace(/[^0-9]/g, '');
      const waLink = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`مرحباً أستاذ/ة ${item.student_name}، نود تذكيركم بموعد سداد القسط المستحق لدبلومة ${item.course_name} بقيمة ${item.amount_due} ج.م في أكاديمية دوز وايز.`)}`;

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-body); border-radius: var(--radius-md); margin-bottom: 0.6rem; border-inline-start: 4px solid var(--accent-danger);">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem;">${item.student_name}</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">
              ${item.course_name} • مستحق منذ: <strong style="color: var(--accent-danger);">${item.due_date}</strong>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-danger">${item.amount_due.toLocaleString('ar-EG')} ${I18N.t('currency')}</span>
            <a href="${waLink}" target="_blank" class="btn btn-sm btn-success" title="WhatsApp Reminder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </a>
            <button class="btn btn-sm btn-secondary" onclick="FinanceView.openPaymentModal(${item.enrollment_id})">
              ${I18N.currentLang === 'ar' ? 'سداد' : 'Pay'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `<div style="overflow-y: auto; max-height: 280px;">${rows}</div>`;
  }
};
