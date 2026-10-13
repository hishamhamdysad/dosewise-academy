/**
 * DoseWise Academy - Student Management View
 * Searchable Table, Multi-tab Profile, Registration with Duplicate Check, Export & Print
 */

const StudentsView = {
  currentPage: 1,
  searchQuery: '',
  selectedStatus: '',
  hasDebtFilter: false,

  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('students')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${I18N.t('students')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'سجل الطلاب المقيدين، الأرصدة المالية، وسجلات الحضور والشهادات' : 'Enrolled students records, financial debts, attendance and certificates'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="StudentsView.exportCsv()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${I18N.t('export')}
          </button>
          <button class="btn btn-primary btn-sm" onclick="StudentsView.openRegisterModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            ${I18N.t('add')}
          </button>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="margin-bottom: 1.5rem; padding: 1.15rem;">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 2; min-width: 250px;">
            <input type="text" id="studentSearchInput" class="form-input" 
                   placeholder="${I18N.currentLang === 'ar' ? 'بحث بالاسم، كود الطالب، رقم الهاتف، أو الرقم القومي...' : 'Search by name, code, phone, national ID...'}"
                   value="${this.searchQuery}" onkeyup="if(event.key==='Enter') StudentsView.applySearch()">
          </div>
          <div style="flex: 1; min-width: 150px;">
            <select id="studentStatusFilter" class="form-select" onchange="StudentsView.applySearch()">
              <option value="">${I18N.currentLang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="Active" ${this.selectedStatus==='Active'?'selected':''}>${I18N.t('activeStudents')}</option>
              <option value="Completed" ${this.selectedStatus==='Completed'?'selected':''}>متخرج / مكتمل</option>
              <option value="Suspended" ${this.selectedStatus==='Suspended'?'selected':''}>معلق</option>
              <option value="Withdrawn" ${this.selectedStatus==='Withdrawn'?'selected':''}>منسحب</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem; font-weight: 600; cursor: pointer;">
              <input type="checkbox" id="studentHasDebtFilter" ${this.hasDebtFilter?'checked':''} onchange="StudentsView.applySearch()">
              ${I18N.currentLang === 'ar' ? 'الطلاب المدينون فقط' : 'Students with debts only'}
            </label>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="StudentsView.applySearch()">
            ${I18N.currentLang === 'ar' ? 'تطبيق الفلتر' : 'Filter'}
          </button>
        </div>
      </div>

      <!-- Student Data Table Container -->
      <div class="card" id="studentsTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadData();
  },

  applySearch() {
    this.searchQuery = document.getElementById('studentSearchInput').value.trim();
    this.selectedStatus = document.getElementById('studentStatusFilter').value;
    this.hasDebtFilter = document.getElementById('studentHasDebtFilter').checked;
    this.currentPage = 1;
    this.loadData();
  },

  async loadData() {
    const container = document.getElementById('studentsTableContainer');
    try {
      const res = await API.get('/api/students', {
        q: this.searchQuery,
        status: this.selectedStatus,
        has_debt: this.hasDebtFilter ? true : undefined,
        page: this.currentPage,
        limit: 12
      });

      if (!res.items || res.items.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem; opacity: 0.5;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p>${I18N.t('noData')}</p>
          </div>
        `;
        return;
      }

      const rows = res.items.map(s => {
        const cleanPhone = (s.whatsapp_number || s.mobile_number || '').replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/2${cleanPhone}`;
        const hasDebt = (s.total_debt || 0) > 0;

        return `
          <tr>
            <td>
              <span class="badge badge-navy" style="font-family: monospace; font-size: 0.8rem;">${s.student_code}</span>
            </td>
            <td>
              <div style="font-weight: 700; color: var(--text-main);">${s.full_name}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${s.qualification || '-'}</div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span dir="ltr">${s.mobile_number}</span>
                <a href="${waLink}" target="_blank" style="color: #25D366;" title="WhatsApp">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </a>
              </div>
            </td>
            <td>
              <div style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;" title="${s.enrolled_courses_ar || '-'}">
                ${s.enrolled_courses_ar || '<span style="color: var(--text-muted);">-</span>'}
              </div>
            </td>
            <td>
              ${hasDebt 
                ? `<span class="badge badge-danger">${Number(s.total_debt).toLocaleString('ar-EG')} ${I18N.t('currency')}</span>`
                : `<span class="badge badge-success">${I18N.currentLang === 'ar' ? 'خالص' : 'Paid in full'}</span>`}
            </td>
            <td>
              <span class="badge ${s.status === 'Active' ? 'badge-success' : (s.status === 'Completed' ? 'badge-info' : 'badge-warning')}">
                ${s.status}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-sm btn-secondary" onclick="StudentsView.openProfileModal(${s.id})" title="${I18N.t('view')}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ${I18N.t('view')}
                </button>
                <button class="btn btn-sm btn-primary" onclick="FinanceView.openEnrollModal(${s.id})" title="${I18N.currentLang === 'ar' ? 'تسجيل بدورة' : 'Enroll'}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button class="btn btn-sm btn-danger" onclick="StudentsView.deleteStudent(${s.id}, '${s.full_name ? s.full_name.replace(/'/g, "\\'") : ''}')" title="${I18N.t('delete')}">
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
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('phone')}</th>
                <th>${I18N.t('courses')}</th>
                <th>${I18N.t('balanceDue')}</th>
                <th>${I18N.t('status')}</th>
                <th>${I18N.t('actions')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1.25rem; font-size: 0.85rem; color: var(--text-secondary);">
          <span>${I18N.currentLang === 'ar' ? `إجمالي الطلاب: ${res.total} (صفحة ${res.page} من ${res.total_pages})` : `Total: ${res.total} (Page ${res.page} of ${res.total_pages})`}</span>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-secondary" ${res.page <= 1 ? 'disabled' : ''} onclick="StudentsView.changePage(${res.page - 1})">
              ${I18N.currentLang === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <button class="btn btn-sm btn-secondary" ${res.page >= res.total_pages ? 'disabled' : ''} onclick="StudentsView.changePage(${res.page + 1})">
              ${I18N.currentLang === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-danger); padding: 1.5rem;">خطأ في تحميل بيانات الطلاب: ${e.message}</div>`;
    }
  },

  changePage(newPage) {
    this.currentPage = newPage;
    this.loadData();
  },

  async exportCsv() {
    try {
      const res = await API.get('/api/students/export');
      if (res.isBlob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dosewise_students_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showToast(I18N.currentLang === 'ar' ? 'تم تصدير ملف الطلاب بنجاح' : 'Students exported successfully', 'success');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  openRegisterModal() {
    const html = `
      <form id="studentRegisterForm" class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الاسم الكامل للطالب (رباعي) *' : 'Full Name *'}</label>
          <input type="text" id="regFullName" class="form-input" required placeholder="مثال: أحمد محمد علي إبراهيم">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الاسم بالإنجليزية (للشهادة)' : 'Full Name (English)'}</label>
          <input type="text" id="regFullNameEn" class="form-input" placeholder="e.g. Ahmed Mohamed Ali">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الرقم القومي (14 رقم)' : 'National ID (14 digits)'}</label>
          <input type="text" id="regNationalId" class="form-input" maxlength="14" placeholder="مثال: 29801011501234">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم الهاتف الأساسي *' : 'Mobile Number *'}</label>
          <input type="text" id="regMobile" class="form-input" required placeholder="مثال: 01012345678">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
          <input type="text" id="regWhatsapp" class="form-input" placeholder="01012345678">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
          <input type="email" id="regEmail" class="form-input" placeholder="student@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'المؤهل الدراسي / الكلية' : 'Education Qualification'}</label>
          <input type="text" id="regQualification" class="form-input" placeholder="مثال: بكالوريوس صيدلة، كلية علوم...">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'النوع' : 'Gender'}</label>
          <select id="regGender" class="form-select">
            <option value="Male">${I18N.currentLang === 'ar' ? 'ذكر' : 'Male'}</option>
            <option value="Female">${I18N.currentLang === 'ar' ? 'أنثى' : 'Female'}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
          <input type="date" id="regDob" class="form-input">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'العنوان بالتفصيل' : 'Address'}</label>
          <input type="text" id="regAddress" class="form-input" placeholder="المحافظة، المدينة، الشارع...">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'جهة اتصال للطوارئ (الاسم)' : 'Emergency Contact Name'}</label>
          <input type="text" id="regEmergName" class="form-input" placeholder="ولي الأمر / صلة القرابة">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'هاتف الطوارئ' : 'Emergency Phone'}</label>
          <input type="text" id="regEmergPhone" class="form-input" placeholder="011...">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.t('notes')}</label>
          <textarea id="regNotes" class="form-textarea" placeholder="أي ملاحظات خاصة بالتسجيل..."></textarea>
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'تسجيل طالب جديد في الأكاديمية' : 'Register New Student',
      html,
      async () => {
        const full_name = document.getElementById('regFullName').value.trim();
        const mobile_number = document.getElementById('regMobile').value.trim();
        if (!full_name || !mobile_number) {
          showToast(I18N.currentLang === 'ar' ? 'يرجى إدخال اسم الطالب ورقم الهاتف' : 'Name and mobile are required', 'warning');
          throw new Error('Validation failed');
        }

        const body = {
          full_name,
          full_name_en: document.getElementById('regFullNameEn').value.trim() || null,
          national_id: document.getElementById('regNationalId').value.trim() || null,
          mobile_number,
          whatsapp_number: document.getElementById('regWhatsapp').value.trim() || null,
          email: document.getElementById('regEmail').value.trim() || null,
          qualification: document.getElementById('regQualification').value.trim() || null,
          gender: document.getElementById('regGender').value,
          date_of_birth: document.getElementById('regDob').value || null,
          address: document.getElementById('regAddress').value.trim() || null,
          emergency_name: document.getElementById('regEmergName').value.trim() || null,
          emergency_phone: document.getElementById('regEmergPhone').value.trim() || null,
          notes: document.getElementById('regNotes').value.trim() || null,
          status: 'Active'
        };

        const res = await API.post('/api/students', body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        StudentsView.loadData();
      },
      I18N.currentLang === 'ar' ? 'إتمام التسجيل' : 'Submit Registration',
      'modal-lg'
    );
  },

  async openProfileModal(studentId) {
    try {
      const data = await API.get(`/api/students/${studentId}`);
      const s = data.student;
      const enrollments = data.enrollments || [];
      const payments = data.payments || [];
      const installments = data.installments || [];
      const attendance = data.attendance || {};
      const certificates = data.certificates || [];

      const cleanPhone = (s.whatsapp_number || s.mobile_number || '').replace(/[^0-9]/g, '');
      const waLink = `https://wa.me/2${cleanPhone}`;

      const html = `
        <div style="display: flex; gap: 1.25rem; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1.25rem; margin-bottom: 1.25rem;">
          <div class="user-avatar-badge" style="width: 60px; height: 60px; font-size: 1.5rem;">
            ${s.full_name ? s.full_name.slice(0, 2) : 'DW'}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0;">${s.full_name}</h2>
              <span class="badge badge-navy" style="font-family: monospace;">${s.student_code}</span>
              <span class="badge badge-success">${s.status}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
              ${s.qualification || ''} • ${s.mobile_number} • <a href="${waLink}" target="_blank" style="color: #25D366; font-weight: 700;">WhatsApp</a>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="StudentsView.printStudentProfile(${s.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            ${I18N.t('print')}
          </button>
        </div>

        <!-- Multi-Tab Navigation -->
        <div class="tab-list">
          <button class="tab-btn active" onclick="StudentsView.switchProfileTab('tabBio', this)">${I18N.currentLang === 'ar' ? 'البيانات الشخصية' : 'Personal Info'}</button>
          <button class="tab-btn" onclick="StudentsView.switchProfileTab('tabEnrollments', this)">${I18N.currentLang === 'ar' ? 'الدورات والتسجيل' : 'Enrollments'}</button>
          <button class="tab-btn" onclick="StudentsView.switchProfileTab('tabFinance', this)">${I18N.currentLang === 'ar' ? 'الحساب المالي والأقساط' : 'Financials'}</button>
          <button class="tab-btn" onclick="StudentsView.switchProfileTab('tabAttendance', this)">${I18N.currentLang === 'ar' ? 'الحضور والغياب' : 'Attendance'}</button>
          <button class="tab-btn" onclick="StudentsView.switchProfileTab('tabCerts', this)">${I18N.currentLang === 'ar' ? 'الشهادات والتقييم' : 'Certificates'}</button>
        </div>

        <!-- Tab 1: Bio -->
        <div id="tabBio" class="profile-tab-content">
          <div class="form-grid" style="font-size: 0.9rem;">
            <div><strong>${I18N.currentLang === 'ar' ? 'الرقم القومي:' : 'National ID:'}</strong> ${s.national_id || '-'}</div>
            <div><strong>${I18N.currentLang === 'ar' ? 'تاريخ الميلاد:' : 'Birth Date:'}</strong> ${s.date_of_birth || '-'}</div>
            <div><strong>${I18N.currentLang === 'ar' ? 'النوع:' : 'Gender:'}</strong> ${s.gender || 'Male'}</div>
            <div><strong>${I18N.currentLang === 'ar' ? 'تاريخ التسجيل:' : 'Registration Date:'}</strong> ${s.registration_date}</div>
            <div><strong>${I18N.currentLang === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</strong> ${s.email || '-'}</div>
            <div><strong>${I18N.currentLang === 'ar' ? 'جهة الطوارئ:' : 'Emergency Contact:'}</strong> ${s.emergency_name || '-'} (${s.emergency_phone || '-'})</div>
            <div style="grid-column: 1 / -1;"><strong>${I18N.currentLang === 'ar' ? 'العنوان:' : 'Address:'}</strong> ${s.address || '-'}</div>
            <div style="grid-column: 1 / -1;"><strong>${I18N.t('notes')}:</strong> ${s.notes || '-'}</div>
          </div>
        </div>

        <!-- Tab 2: Enrollments -->
        <div id="tabEnrollments" class="profile-tab-content" style="display: none;">
          ${enrollments.length === 0 ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${I18N.t('courses')}</th>
                    <th>${I18N.t('groups')}</th>
                    <th>${I18N.currentLang === 'ar' ? 'المحاضر' : 'Trainer'}</th>
                    <th>${I18N.t('finalPrice')}</th>
                    <th>${I18N.t('balanceDue')}</th>
                    <th>${I18N.t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${enrollments.map(e => `
                    <tr>
                      <td><strong>${e.course_name_ar}</strong></td>
                      <td>${e.group_name}</td>
                      <td>${e.trainer_name || '-'}</td>
                      <td>${Number(e.final_price).toLocaleString('ar-EG')} ${I18N.t('currency')}</td>
                      <td><span class="badge ${e.balance_due > 0 ? 'badge-danger' : 'badge-success'}">${Number(e.balance_due).toLocaleString('ar-EG')} ${I18N.t('currency')}</span></td>
                      <td><span class="badge badge-info">${e.payment_status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Tab 3: Finance & Installments -->
        <div id="tabFinance" class="profile-tab-content" style="display: none;">
          <h4 style="margin-bottom: 0.75rem; font-size: 1rem;">${I18N.currentLang === 'ar' ? 'سجل المدفوعات المسددة' : 'Payments Received'}</h4>
          ${payments.length === 0 ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
            <div class="table-responsive" style="margin-bottom: 1.5rem;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${I18N.t('receiptNumber')}</th>
                    <th>${I18N.t('date')}</th>
                    <th>${I18N.t('amount')}</th>
                    <th>${I18N.t('paymentMethod')}</th>
                    <th>${I18N.currentLang === 'ar' ? 'المحصل' : 'Cashier'}</th>
                    <th>${I18N.t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(p => `
                    <tr>
                      <td><span class="badge badge-navy">${p.receipt_number}</span></td>
                      <td>${p.payment_date}</td>
                      <td><strong>${Number(p.amount).toLocaleString('ar-EG')} ${I18N.t('currency')}</strong></td>
                      <td>${p.payment_method}</td>
                      <td>${p.recorded_by_name || '-'}</td>
                      <td>
                        <button class="btn btn-sm btn-secondary" onclick="FinanceView.printReceipt('${p.receipt_number}')">
                          ${I18N.t('print')}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}

          <h4 style="margin-bottom: 0.75rem; font-size: 1rem;">${I18N.t('installmentPlan')}</h4>
          ${installments.length === 0 ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${I18N.t('amount')}</th>
                    <th>${I18N.currentLang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                    <th>${I18N.t('status')}</th>
                    <th>${I18N.t('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${installments.map(i => `
                    <tr>
                      <td>#${i.installment_number}</td>
                      <td>${Number(i.amount).toLocaleString('ar-EG')} ${I18N.t('currency')}</td>
                      <td>${i.due_date}</td>
                      <td><span class="badge ${i.status==='Paid'?'badge-success':(i.status==='Overdue'?'badge-danger':'badge-warning')}">${i.status}</span></td>
                      <td>${i.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Tab 4: Attendance -->
        <div id="tabAttendance" class="profile-tab-content" style="display: none;">
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <div class="badge badge-info" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
              ${I18N.t('attendanceRate')}: <strong>${attendance.attendance_rate || 100}%</strong>
            </div>
            <div class="badge badge-navy" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
              ${I18N.currentLang === 'ar' ? 'الجلسات المسجلة:' : 'Recorded Sessions:'} <strong>${attendance.total_sessions_recorded || 0}</strong>
            </div>
          </div>
          ${(!attendance.records || attendance.records.length === 0) ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${I18N.t('courses')}</th>
                    <th>${I18N.t('date')}</th>
                    <th>${I18N.currentLang === 'ar' ? 'المحاضرة' : 'Session'}</th>
                    <th>${I18N.t('status')}</th>
                    <th>${I18N.t('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendance.records.map(r => `
                    <tr>
                      <td>${r.course_name}</td>
                      <td>${r.session_date}</td>
                      <td>#${r.session_number}</td>
                      <td><span class="badge ${r.status==='Present'?'badge-success':(r.status==='Absent'?'badge-danger':'badge-warning')}">${r.status}</span></td>
                      <td>${r.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Tab 5: Certs -->
        <div id="tabCerts" class="profile-tab-content" style="display: none;">
          ${certificates.length === 0 ? `<p style="color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'لم تصدر أي شهادات لهذا الطالب بعد.' : 'No certificates issued yet.'}</p>` : `
            <div style="display: grid; gap: 1rem;">
              ${certificates.map(c => `
                <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-body); display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h4 style="font-weight: 800; color: var(--brand-turquoise);">${c.course_name_ar}</h4>
                    <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;">
                      كود الشهادة: <strong>${c.certificate_code}</strong> • التقدير: ${c.grade_label} • تاريخ الإصدار: ${c.issue_date}
                    </div>
                  </div>
                  <button class="btn btn-sm btn-primary" onclick="AssessmentsView.printCertificate('${c.certificate_code}')">
                    ${I18N.currentLang === 'ar' ? 'عرض وطباعة الشهادة' : 'View Certificate'}
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      openModal(
        I18N.currentLang === 'ar' ? `ملف الطالب: ${s.full_name}` : `Student Profile: ${s.full_name}`,
        html,
        null,
        null,
        'modal-xl'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  switchProfileTab(tabId, btn) {
    document.querySelectorAll('.profile-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');
  },

  async printStudentProfile(studentId) {
    window.print();
  },

  async deleteStudent(studentId, studentName) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف الطالب "${studentName || ''}" وكافة سجلاته نهائياً من النظام؟`
      : `Are you sure you want to permanently delete student "${studentName || ''}" and all related records?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/students/${studentId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف الطالب بنجاح', 'success');
      closeModal();
      this.loadData();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
