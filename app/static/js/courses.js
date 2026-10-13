/**
 * DoseWise Academy - Courses Management View
 * Course Catalog, Pricing, Capacity, Syllabus & Trainer Allocation
 */

const CoursesView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('courses')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            ${I18N.t('courses')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'كتالوج البرامج التدريبية المعتمدة، الرسوم، المناهج، والسعة المقررة' : 'Accredited training programs catalog, prices, syllabus, and capacities'}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="CoursesView.openCreateModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${I18N.currentLang === 'ar' ? 'إضافة دورة تدريبية' : 'Add Course'}
        </button>
      </div>

      <div id="coursesGridContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
        <div class="card" style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadCourses();
  },

  async loadCourses() {
    const container = document.getElementById('coursesGridContainer');
    try {
      const res = await API.get('/api/courses');
      const courses = res.courses || [];

      if (courses.length === 0) {
        container.innerHTML = `<div class="card" style="text-align: center; padding: 3rem; grid-column: 1 / -1;">${I18N.t('noData')}</div>`;
        return;
      }

      container.innerHTML = courses.map(c => `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <span class="badge badge-navy" style="font-family: monospace;">${c.code}</span>
              <span class="badge ${c.status==='Active'?'badge-success':'badge-warning'}">${c.status}</span>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">
              ${c.name_ar}
            </h3>
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--brand-turquoise); margin-bottom: 0.65rem;">
              ${c.name_en}
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              ${c.description || '-'}
            </p>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem;">
              <span class="badge badge-info">${c.category}</span>
              <span class="badge badge-navy">${c.training_type}</span>
              <span class="badge badge-purple">${c.total_hours} ${I18N.currentLang === 'ar' ? 'ساعة' : 'hrs'} (${c.sessions_count} ${I18N.currentLang === 'ar' ? 'محاضرة' : 'sessions'})</span>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'سعر الاشتراك القياسي' : 'Standard Price'}</div>
              <div style="font-size: 1.2rem; font-weight: 800; color: var(--brand-turquoise);">
                ${Number(c.standard_price).toLocaleString('ar-EG')} <small style="font-size: 0.85rem;">${I18N.t('currency')}</small>
              </div>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-secondary" onclick="CoursesView.viewCourse(${c.id})">
                ${I18N.t('view')}
              </button>
              <button class="btn btn-sm btn-primary" onclick="GroupsView.openCreateGroupModal(${c.id})">
                ${I18N.currentLang === 'ar' ? 'فتح مجموعة' : 'New Group'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="CoursesView.deleteCourse(${c.id}, '${c.name_ar ? c.name_ar.replace(/'/g, "\\'") : ''}')" title="${I18N.t('delete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="card" style="color: var(--accent-danger);">${e.message}</div>`;
    }
  },

  openCreateModal() {
    const html = `
      <form id="courseCreateForm" class="form-grid">
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'كود الدورة (e.g. CLIN-101) *' : 'Course Code *'}</label>
          <input type="text" id="courseCode" class="form-input" required placeholder="CLIN-101">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'التصنيف / المجال *' : 'Category *'}</label>
          <input type="text" id="courseCat" class="form-input" required placeholder="مثال: Clinical Pharmacy">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'اسم الدورة بالعربية *' : 'Course Name (Arabic) *'}</label>
          <input type="text" id="courseNameAr" class="form-input" required placeholder="مثال: دبلومة الصيدلة الإكلينيكية">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'اسم الدورة بالإنجليزية *' : 'Course Name (English) *'}</label>
          <input type="text" id="courseNameEn" class="form-input" required placeholder="e.g. Advanced Clinical Pharmacy">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'سعر الدورة القياسي (ج.م) *' : 'Standard Price (EGP) *'}</label>
          <input type="number" id="coursePrice" class="form-input" required min="0" placeholder="6000">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'نوع التدريب' : 'Training Type'}</label>
          <select id="courseType" class="form-select">
            <option value="In-person">${I18N.currentLang === 'ar' ? 'حضوري بمقر الأكاديمية' : 'In-person'}</option>
            <option value="Online">${I18N.currentLang === 'ar' ? 'أونلاين بث مباشر (Zoom)' : 'Online'}</option>
            <option value="Hybrid">${I18N.currentLang === 'ar' ? 'مدمج (حضوري + أونلاين)' : 'Hybrid'}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'إجمالي الساعات' : 'Total Hours'}</label>
          <input type="number" id="courseHours" class="form-input" value="30">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'عدد المحاضرات' : 'Sessions Count'}</label>
          <input type="number" id="courseSessions" class="form-input" value="10">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الحد الأقصى للطلاب' : 'Max Capacity'}</label>
          <input type="number" id="courseCap" class="form-input" value="25">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'المستوى' : 'Level'}</label>
          <select id="courseLevel" class="form-select">
            <option value="Beginner">مبتدئ (Beginner)</option>
            <option value="Intermediate" selected>متوسط (Intermediate)</option>
            <option value="Advanced">متقدم (Advanced)</option>
          </select>
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الوصف ومحاور الدورة' : 'Description'}</label>
          <textarea id="courseDesc" class="form-textarea" placeholder="أهداف البرنامج والمحاور الرئيسية..."></textarea>
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'إضافة دورة تدريبية جديدة' : 'Add New Course',
      html,
      async () => {
        const body = {
          code: document.getElementById('courseCode').value.trim(),
          category: document.getElementById('courseCat').value.trim(),
          name_ar: document.getElementById('courseNameAr').value.trim(),
          name_en: document.getElementById('courseNameEn').value.trim(),
          standard_price: parseFloat(document.getElementById('coursePrice').value) || 0,
          training_type: document.getElementById('courseType').value,
          total_hours: parseInt(document.getElementById('courseHours').value) || 30,
          sessions_count: parseInt(document.getElementById('courseSessions').value) || 10,
          max_capacity: parseInt(document.getElementById('courseCap').value) || 25,
          level: document.getElementById('courseLevel').value,
          description: document.getElementById('courseDesc').value.trim() || null,
          status: 'Active'
        };

        const res = await API.post('/api/courses', body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        CoursesView.loadCourses();
      },
      I18N.t('save')
    );
  },

  async viewCourse(courseId) {
    try {
      const data = await API.get(`/api/courses/${courseId}`);
      const c = data.course;
      const groups = data.groups || [];

      const html = `
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="badge badge-navy">${c.code}</span>
            <span class="badge badge-info">${c.category}</span>
            <span class="badge badge-success">${c.status}</span>
          </div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.2rem;">${c.name_ar}</h2>
          <div style="font-size: 0.9rem; color: var(--brand-turquoise); font-weight: 600; margin-bottom: 0.75rem;">${c.name_en}</div>
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">${c.description || '-'}</p>
        </div>

        <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'السعر القياسي' : 'Price'}</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--brand-turquoise);">${Number(c.standard_price).toLocaleString('ar-EG')} ${I18N.t('currency')}</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'الساعات والمحاضرات' : 'Hours'}</div>
            <div style="font-size: 1.15rem; font-weight: 800;">${c.total_hours} س (${c.sessions_count} م)</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'المجموعات النشطة' : 'Active Groups'}</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-success);">${groups.length}</div>
          </div>
        </div>

        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">${I18N.currentLang === 'ar' ? 'المجموعات التدريبية المفتوحة' : 'Training Groups'}</h3>
        ${groups.length === 0 ? `<p style="color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'لا توجد مجموعات حالية لهذه الدورة.' : 'No active groups.'}</p>` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${I18N.t('code')}</th>
                  <th>${I18N.currentLang === 'ar' ? 'المجموعة' : 'Group'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'المحاضر' : 'Trainer'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'الطلاب المقيدين' : 'Students'}</th>
                  <th>${I18N.currentLang === 'ar' ? 'المحاضرات' : 'Sessions'}</th>
                  <th>${I18N.t('status')}</th>
                </tr>
              </thead>
              <tbody>
                ${groups.map(g => `
                  <tr>
                    <td><span class="badge badge-navy">${g.group_code}</span></td>
                    <td><strong>${g.group_name}</strong></td>
                    <td>${g.trainer_name || '-'}</td>
                    <td><span class="badge badge-info">${g.enrolled_students} / ${g.capacity}</span></td>
                    <td>${g.completed_sessions} / ${g.total_sessions}</td>
                    <td><span class="badge ${g.status==='Active'?'badge-success':'badge-warning'}">${g.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;

      openModal(
        I18N.currentLang === 'ar' ? `تفاصيل الدورة: ${c.name_ar}` : `Course Details: ${c.name_ar}`,
        html,
        null,
        null,
        'modal-lg'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteCourse(courseId, courseName) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف الدورة "${courseName || ''}" ومجموعاتها التدريبية نهائياً؟`
      : `Are you sure you want to delete course "${courseName || ''}" and its training groups?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/courses/${courseId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف الدورة بنجاح', 'success');
      closeModal();
      this.loadCourses();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
