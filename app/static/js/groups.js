/**
 * DoseWise Academy - Training Groups & Scheduling View
 * Groups Roster, Conflict-Free Scheduling, Automated Session Dates Generator
 */

const GroupsView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('groups')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${I18N.t('groups')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'إدارة المجموعات التدريبية، القاعات، جداول المحاضرات، وسعة القبول' : 'Training cohorts management, rooms, session schedules, and capacity'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('calendar')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${I18N.t('calendar')}
          </button>
          <button class="btn btn-primary btn-sm" onclick="GroupsView.openCreateGroupModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18N.currentLang === 'ar' ? 'إنشاء مجموعة جديدة' : 'New Group'}
          </button>
        </div>
      </div>

      <div class="card" id="groupsTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadGroups();
  },

  async loadGroups() {
    const container = document.getElementById('groupsTableContainer');
    try {
      const res = await API.get('/api/groups');
      const groups = res.groups || [];

      if (groups.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = groups.map(g => {
        const occPct = Math.round(((g.enrolled_count || 0) / (g.capacity || 20)) * 100);
        const daysStr = (g.days_of_week_list || []).map(d => {
          const arDays = { Sun: 'أحد', Mon: 'إثنين', Tue: 'ثلاثاء', Wed: 'أربعاء', Thu: 'خميس', Fri: 'جمعة', Sat: 'سبت' };
          return arDays[d] || d;
        }).join('، ');

        return `
          <tr>
            <td><span class="badge badge-navy" style="font-family: monospace;">${g.group_code}</span></td>
            <td>
              <div style="font-weight: 700; color: var(--text-main);">${g.group_name}</div>
              <div style="font-size: 0.78rem; color: var(--brand-turquoise); font-weight: 600;">${g.course_name_ar}</div>
            </td>
            <td>${g.trainer_name || '<span style="color: var(--text-muted);">-</span>'}</td>
            <td>
              <div style="font-size: 0.85rem; font-weight: 600;">${daysStr}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${g.start_time} - ${g.end_time}</div>
            </td>
            <td>${g.classroom_name}</td>
            <td style="min-width: 140px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.2rem;">
                <span>${g.enrolled_count} / ${g.capacity}</span>
                <span style="font-weight: 700;">${occPct}%</span>
              </div>
              <div style="height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                <div style="width: ${Math.min(occPct, 100)}%; height: 100%; background: ${occPct >= 90 ? 'var(--accent-danger)' : 'var(--brand-turquoise)'};"></div>
              </div>
            </td>
            <td>
              <span class="badge badge-purple">${g.completed_sessions_count} / ${g.total_sessions_count}</span>
            </td>
            <td>
              <span class="badge ${g.status==='Active'?'badge-success':'badge-warning'}">${g.status}</span>
            </td>
            <td>
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-sm btn-secondary" onclick="GroupsView.openGroupDetailsModal(${g.id})">
                  ${I18N.t('view')}
                </button>
                <button class="btn btn-sm btn-danger" onclick="GroupsView.deleteGroup(${g.id}, '${g.group_name ? g.group_name.replace(/'/g, "\\'") : ''}')" title="${I18N.t('delete')}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
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
                <th>${I18N.currentLang === 'ar' ? 'المجموعة والدورة' : 'Group & Course'}</th>
                <th>${I18N.currentLang === 'ar' ? 'المحاضر' : 'Trainer'}</th>
                <th>${I18N.currentLang === 'ar' ? 'المواعيد' : 'Schedule'}</th>
                <th>${I18N.currentLang === 'ar' ? 'القاعة' : 'Room'}</th>
                <th>${I18N.currentLang === 'ar' ? 'نسبة الامتلاء' : 'Capacity'}</th>
                <th>${I18N.currentLang === 'ar' ? 'المحاضرات' : 'Sessions'}</th>
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

  async openCreateGroupModal(preselectedCourseId = null) {
    try {
      const [coursesRes, trainersRes] = await Promise.all([
        API.get('/api/courses'),
        API.get('/api/trainers')
      ]);

      const courses = coursesRes.courses || [];
      const trainers = trainersRes.trainers || [];

      const html = `
        <form id="groupCreateForm" class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'الدورة التدريبية المرتبطة *' : 'Related Course *'}</label>
            <select id="grpCourseSelect" class="form-select" required>
              ${courses.map(c => `
                <option value="${c.id}" ${preselectedCourseId === c.id ? 'selected' : ''}>
                  ${c.name_ar} (${c.code}) - ${Number(c.standard_price).toLocaleString('ar-EG')} ج.م
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'كود المجموعة *' : 'Group Code *'}</label>
            <input type="text" id="grpCode" class="form-input" required placeholder="GRP-CLIN-02">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'اسم المجموعة *' : 'Group Name *'}</label>
            <input type="text" id="grpName" class="form-input" required placeholder="مثال: مجموعة الصيدلة المسائية">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'المحاضر المسؤول' : 'Assigned Trainer'}</label>
            <select id="grpTrainerSelect" class="form-select">
              <option value="">${I18N.currentLang === 'ar' ? '-- بدون تعيين حالياً --' : '-- Unassigned --'}</option>
              ${trainers.map(t => `<option value="${t.id}">${t.full_name} (${t.specialization})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'تاريخ البداية *' : 'Start Date *'}</label>
            <input type="date" id="grpStartDate" class="form-input" required value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'تاريخ النهاية التقريبي *' : 'End Date *'}</label>
            <input type="date" id="grpEndDate" class="form-input" required>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'أيام المحاضرات الأسبوعية *' : 'Days of Week *'}</label>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.5rem 0;">
              ${[
                { id: 'Sun', ar: 'الأحد' }, { id: 'Mon', ar: 'الإثنين' }, { id: 'Tue', ar: 'الثلاثاء' },
                { id: 'Wed', ar: 'الأربعاء' }, { id: 'Thu', ar: 'الخميس' }, { id: 'Fri', ar: 'الجمعة' }, { id: 'Sat', ar: 'السبت' }
              ].map(d => `
                <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.88rem;">
                  <input type="checkbox" name="grpDays" value="${d.id}" ${['Sun','Tue','Thu'].includes(d.id)?'checked':''}>
                  ${d.ar}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'وقت البدء *' : 'Start Time *'}</label>
            <input type="time" id="grpStartTime" class="form-input" required value="18:00">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'وقت الانتهاء *' : 'End Time *'}</label>
            <input type="time" id="grpEndTime" class="form-input" required value="21:00">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'القاعة أو المعمل *' : 'Classroom / Lab *'}</label>
            <input type="text" id="grpRoom" class="form-input" required value="قاعة أ - ابن النفيس">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'السعة القصوى للطلاب' : 'Capacity'}</label>
            <input type="number" id="grpCap" class="form-input" value="20" min="1">
          </div>
        </form>
      `;

      openModal(
        I18N.currentLang === 'ar' ? 'إنشاء مجموعة وتوليد الجدول تلقائياً' : 'Create Group & Generate Sessions',
        html,
        async () => {
          const course_id = parseInt(document.getElementById('grpCourseSelect').value);
          const group_code = document.getElementById('grpCode').value.trim();
          const group_name = document.getElementById('grpName').value.trim();
          const start_date = document.getElementById('grpStartDate').value;
          const end_date = document.getElementById('grpEndDate').value || start_date;
          const trainer_id = document.getElementById('grpTrainerSelect').value ? parseInt(document.getElementById('grpTrainerSelect').value) : null;
          
          const selectedDays = Array.from(document.querySelectorAll('input[name="grpDays"]:checked')).map(el => el.value);
          if (selectedDays.length === 0) {
            showToast(I18N.currentLang === 'ar' ? 'يرجى اختيار يوم واحد على الأقل للمحاضرات' : 'Please select at least one day', 'warning');
            throw new Error('No days selected');
          }

          const body = {
            course_id,
            group_code,
            group_name,
            trainer_id,
            start_date,
            end_date,
            days_of_week: selectedDays,
            start_time: document.getElementById('grpStartTime').value,
            end_time: document.getElementById('grpEndTime').value,
            classroom_name: document.getElementById('grpRoom').value.trim(),
            capacity: parseInt(document.getElementById('grpCap').value) || 20,
            status: 'Active'
          };

          const res = await API.post('/api/groups', body);
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          GroupsView.loadGroups();
        },
        I18N.currentLang === 'ar' ? 'إنشاء وتوليد المحاضرات' : 'Generate Group',
        'modal-lg'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async openGroupDetailsModal(groupId) {
    try {
      const data = await API.get(`/api/groups/${groupId}`);
      const g = data.group;
      const roster = data.roster || [];
      const sessions = data.sessions || [];

      const html = `
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
            <span class="badge badge-navy">${g.group_code}</span>
            <span class="badge badge-info">${g.course_name_ar}</span>
            <span class="badge badge-success">${g.status}</span>
          </div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${g.group_name}</h2>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
            المحاضر: <strong>${g.trainer_name || 'غير محدد'}</strong> • القاعة: <strong>${g.classroom_name}</strong> • المواعيد: ${g.start_time} - ${g.end_time}
          </div>
        </div>

        <div class="tab-list">
          <button class="tab-btn active" onclick="GroupsView.switchTab('tabGrpSessions', this)">${I18N.currentLang === 'ar' ? `جدول المحاضرات (${sessions.length})` : 'Sessions'}</button>
          <button class="tab-btn" onclick="GroupsView.switchTab('tabGrpRoster', this)">${I18N.currentLang === 'ar' ? `قائمة الطلاب (${roster.length} / ${g.capacity})` : 'Roster'}</button>
        </div>

        <!-- Sessions List -->
        <div id="tabGrpSessions" class="grp-tab-content">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${I18N.t('date')}</th>
                  <th>${I18N.currentLang === 'ar' ? 'التوقيت' : 'Time'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'القاعة' : 'Room'}</th>
                  <th>${I18N.t('status')}</th>
                  <th>${I18N.t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                ${sessions.map(s => `
                  <tr>
                    <td><strong>#${s.session_number}</strong></td>
                    <td>${s.session_date}</td>
                    <td>${s.start_time} - ${s.end_time}</td>
                    <td>${s.classroom_name}</td>
                    <td><span class="badge ${s.status==='Completed'?'badge-success':(s.status==='Rescheduled'?'badge-warning':'badge-info')}">${s.status}</span></td>
                    <td>
                      <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-sm btn-primary" onclick="AttendanceView.openSessionRoster(${s.id})">
                          ${I18N.currentLang === 'ar' ? 'كشف الحضور' : 'Attendance'}
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Roster List -->
        <div id="tabGrpRoster" class="grp-tab-content" style="display: none;">
          ${roster.length === 0 ? `<p style="color: var(--text-muted); padding: 1rem;">${I18N.currentLang === 'ar' ? 'لا يوجد طلاب مسجلون في هذه المجموعة بعد.' : 'No enrolled students.'}</p>` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${I18N.t('code')}</th>
                    <th>${I18N.t('name')}</th>
                    <th>${I18N.t('phone')}</th>
                    <th>${I18N.t('balanceDue')}</th>
                    <th>${I18N.t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${roster.map(st => `
                    <tr>
                      <td><span class="badge badge-navy">${st.student_code}</span></td>
                      <td><strong>${st.full_name}</strong></td>
                      <td dir="ltr">${st.mobile_number}</td>
                      <td><span class="badge ${st.balance_due > 0 ? 'badge-danger' : 'badge-success'}">${Number(st.balance_due).toLocaleString('ar-EG')} ج.م</span></td>
                      <td><span class="badge badge-info">${st.payment_status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

      openModal(
        I18N.currentLang === 'ar' ? `تفاصيل المجموعة: ${g.group_name}` : `Group Details: ${g.group_name}`,
        html,
        null,
        null,
        'modal-lg'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  switchTab(tabId, btn) {
    document.querySelectorAll('.grp-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');
  },

  async deleteGroup(groupId, groupName) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف المجموعة التدريبية "${groupName || ''}" ومحاضراتها نهائياً؟`
      : `Are you sure you want to delete training group "${groupName || ''}" and its sessions?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/groups/${groupId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف المجموعة بنجاح', 'success');
      closeModal();
      this.loadGroups();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
