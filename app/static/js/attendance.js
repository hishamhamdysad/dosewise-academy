/**
 * DoseWise Academy - Attendance Management View
 * Session Attendance Taking, Absence Threshold Alerts, Printable Sheets
 */

const AttendanceView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('attendance')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ${I18N.t('attendance')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'تسجيل الحضور والغياب، تنبيهات الغياب المتكرر، وكشوفات التوقيع المطبوعة' : 'Session attendance tracking, repeated absence alerts, and printable rosters'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('calendar')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${I18N.t('calendar')}
          </button>
        </div>
      </div>

      <div class="tab-list">
        <button class="tab-btn active" onclick="AttendanceView.switchTab('attToday', this)">${I18N.currentLang === 'ar' ? 'محاضرات اليوم والمجدولة' : 'Today & Upcoming Sessions'}</button>
        <button class="tab-btn" onclick="AttendanceView.switchTab('attRepeated', this)">
          ${I18N.currentLang === 'ar' ? 'تنبيهات الغياب المتكرر (3 غيابات فأكثر)' : 'Repeated Absences Alerts'}
        </button>
      </div>

      <!-- Tab 1: Today's Sessions -->
      <div id="attToday" class="att-view-tab">
        <div class="card" id="todaySessionsContainer">
          <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
        </div>
      </div>

      <!-- Tab 2: Repeated Absences -->
      <div id="attRepeated" class="att-view-tab" style="display: none;">
        <div class="card" id="repeatedAbsencesContainer">
          <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
        </div>
      </div>
    `;

    await this.loadTodaySessions();
  },

  async loadTodaySessions() {
    const container = document.getElementById('todaySessionsContainer');
    try {
      const widgets = await API.get('/api/dashboard/live-widgets');
      const sessions = widgets.today_sessions || [];

      if (sessions.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem; opacity: 0.5;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p>${I18N.currentLang === 'ar' ? 'لا توجد محاضرات مجدولة لهذا اليوم. يمكنك مراجعة التقويم للمحاضرات القادمة.' : 'No sessions scheduled for today.'}</p>
          </div>
        `;
        return;
      }

      const rows = sessions.map(s => `
        <tr>
          <td>#${s.session_number}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${s.course_name_ar}</div>
            <div style="font-size: 0.78rem; color: var(--brand-turquoise); font-weight: 600;">${s.group_name}</div>
          </td>
          <td>${s.trainer_name || '<span style="color: var(--text-muted);">-</span>'}</td>
          <td>${s.classroom_name}</td>
          <td><span class="badge badge-info">${s.start_time} - ${s.end_time}</span></td>
          <td><span class="badge ${s.status==='Completed'?'badge-success':'badge-warning'}">${s.status}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="AttendanceView.openSessionRoster(${s.id})">
              ${I18N.currentLang === 'ar' ? 'فتح كشف الحضور' : 'Open Roster'}
            </button>
          </td>
        </tr>
      `).join('');

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${I18N.t('courses')}</th>
                <th>${I18N.currentLang === 'ar' ? 'المحاضر' : 'Trainer'}</th>
                <th>${I18N.currentLang === 'ar' ? 'القاعة' : 'Room'}</th>
                <th>${I18N.currentLang === 'ar' ? 'الموعد' : 'Time'}</th>
                <th>${I18N.t('status')}</th>
                <th>${I18N.t('actions')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-danger); padding: 1.5rem;">${e.message}</div>`;
    }
  },

  async loadRepeatedAbsences() {
    const container = document.getElementById('repeatedAbsencesContainer');
    try {
      const res = await API.get('/api/attendance/repeated-absences');
      const list = res.absentees || [];

      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--accent-success);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>${I18N.currentLang === 'ar' ? 'ممتاز! لا يوجد أي طلاب متجاوزين لنسبة الغياب الحرجة حالياً.' : 'No repeated absences alerts.'}</p>
          </div>
        `;
        return;
      }

      const rows = list.map(item => {
        const cleanPhone = (item.whatsapp_number || item.mobile_number || '').replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`مرحباً أستاذ/ة ${item.full_name}، نود إحاطتكم بتجاوزكم عدد ${item.absences_count} غيابات في دورة ${item.course_name} بأكاديمية دوز وايز. يرجى مراجعة إدارة المركز لتفادي الحرمان من الشهادة.`)}`;

        return `
          <tr>
            <td><span class="badge badge-navy">${item.student_code}</span></td>
            <td><strong>${item.full_name}</strong></td>
            <td>${item.course_name} (${item.group_name})</td>
            <td><span class="badge badge-danger">${item.absences_count} ${I18N.currentLang === 'ar' ? 'غيابات' : 'absences'}</span></td>
            <td dir="ltr">${item.mobile_number}</td>
            <td>
              <a href="${waLink}" target="_blank" class="btn btn-sm btn-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                WhatsApp
              </a>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.t('code')}</th>
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('courses')}</th>
                <th>${I18N.currentLang === 'ar' ? 'عدد مرات الغياب' : 'Absences'}</th>
                <th>${I18N.t('phone')}</th>
                <th>${I18N.t('actions')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-danger); padding: 1.5rem;">${e.message}</div>`;
    }
  },

  switchTab(tabId, btn) {
    document.querySelectorAll('.att-view-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');

    if (tabId === 'attRepeated') {
      this.loadRepeatedAbsences();
    }
  },

  async openSessionRoster(sessionId) {
    try {
      const data = await API.get(`/api/attendance/session/${sessionId}`);
      const session = data.session;
      const students = data.students || [];

      if (students.length === 0) {
        showToast(I18N.currentLang === 'ar' ? 'لا يوجد طلاب مقيدين في هذه المجموعة حتى الآن' : 'No students enrolled yet', 'warning');
        return;
      }

      const rows = students.map(st => `
        <tr data-student-id="${st.student_id}">
          <td>
            <div style="font-weight: 700;">${st.full_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${st.student_code}</div>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
                <input type="radio" name="attStatus_${st.student_id}" value="Present" ${st.status === 'Present' ? 'checked' : ''}>
                <span class="badge badge-success">${I18N.t('present')}</span>
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
                <input type="radio" name="attStatus_${st.student_id}" value="Absent" ${st.status === 'Absent' ? 'checked' : ''}>
                <span class="badge badge-danger">${I18N.t('absent')}</span>
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
                <input type="radio" name="attStatus_${st.student_id}" value="Late" ${st.status === 'Late' ? 'checked' : ''}>
                <span class="badge badge-warning">${I18N.t('late')}</span>
              </label>
              <label style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
                <input type="radio" name="attStatus_${st.student_id}" value="Excused" ${st.status === 'Excused' ? 'checked' : ''}>
                <span class="badge badge-info">${I18N.t('excused')}</span>
              </label>
            </div>
          </td>
          <td>
            <input type="text" class="form-input" style="padding: 0.35rem 0.6rem; font-size: 0.82rem;" 
                   id="attNotes_${st.student_id}" value="${st.notes || ''}" placeholder="ملاحظة أو سبب التأخر...">
          </td>
        </tr>
      `).join('');

      const html = `
        <div style="margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
          <div style="font-weight: 800; font-size: 1.15rem; color: var(--brand-turquoise);">${session.course_name_ar} (${session.group_name})</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
            المحاضرة #${session.session_number} • التاريخ: <strong>${session.session_date}</strong> • القاعة: ${session.classroom_name}
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('status')}</th>
                <th>${I18N.t('notes')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      openModal(
        I18N.currentLang === 'ar' ? `كشف حضور المحاضرة #${session.session_number}` : `Session #${session.session_number} Attendance`,
        html,
        async () => {
          const payload = [];
          document.querySelectorAll('tr[data-student-id]').forEach(tr => {
            const stuId = parseInt(tr.getAttribute('data-student-id'));
            const checkedRadio = tr.querySelector(`input[name="attStatus_${stuId}"]:checked`);
            const statusVal = checkedRadio ? checkedRadio.value : 'Present';
            const notesVal = document.getElementById(`attNotes_${stuId}`).value.trim() || null;

            payload.push({
              student_id: stuId,
              status: statusVal,
              notes: notesVal
            });
          });

          const res = await API.post(`/api/attendance/session/${sessionId}`, { attendances: payload });
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          AttendanceView.loadTodaySessions();
        },
        I18N.currentLang === 'ar' ? 'حفظ الحضور واعتماد المحاضرة' : 'Save Attendance',
        'modal-lg'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
