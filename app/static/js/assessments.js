/**
 * DoseWise Academy - Assessments, Grades & Verifiable Certificates Engine
 */

const AssessmentsView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('assessments')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            ${I18N.t('assessments')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'إدارة الاختبارات والتقييمات، رصد الدرجات، وإصدار الشهادات المعتمدة ذات الأكواد التأكيدية' : 'Exams management, grades recording, and verifiable accredited certificate issuance'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="AssessmentsView.openIssueCertificateModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            ${I18N.currentLang === 'ar' ? 'إصدار شهادة تخرج معتمدة' : 'Issue Certificate'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="AssessmentsView.openCreateAssessmentModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18N.currentLang === 'ar' ? 'إنشاء اختبار جديد' : 'New Assessment'}
          </button>
        </div>
      </div>

      <div class="card" id="assessmentsTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadAssessments();
  },

  async loadAssessments() {
    const container = document.getElementById('assessmentsTableContainer');
    try {
      const res = await API.get('/api/assessments');
      const assessments = res.assessments || [];

      if (assessments.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = assessments.map(a => `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${a.title}</div>
            <div style="font-size: 0.78rem; color: var(--brand-turquoise); font-weight: 600;">${a.course_name_ar} ${a.group_name ? `(${a.group_name})` : ''}</div>
          </td>
          <td><span class="badge badge-navy">${a.assessment_type}</span></td>
          <td><strong>${a.max_score}</strong></td>
          <td><span class="badge badge-info">${a.passing_score}</span></td>
          <td>
            <span class="badge ${a.passed_students_count > 0 ? 'badge-success' : 'badge-warning'}">
              ${a.passed_students_count} / ${a.graded_students_count} ${I18N.currentLang === 'ar' ? 'ناجح' : 'passed'}
            </span>
          </td>
          <td>${a.assessment_date || '-'}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-primary" onclick="AssessmentsView.openGradesModal(${a.id})">
                ${I18N.currentLang === 'ar' ? 'رصد الدرجات' : 'Grade Roster'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="AssessmentsView.deleteExam(${a.id}, '${a.title ? a.title.replace(/'/g, "\\'") : ''}')" title="${I18N.t('delete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.currentLang === 'ar' ? 'عنوان الاختبار والدورة' : 'Assessment & Course'}</th>
                <th>${I18N.currentLang === 'ar' ? 'نوع التقييم' : 'Type'}</th>
                <th>${I18N.currentLang === 'ar' ? 'الدرجة العظمى' : 'Max Score'}</th>
                <th>${I18N.currentLang === 'ar' ? 'درجة النجاح' : 'Passing Score'}</th>
                <th>${I18N.currentLang === 'ar' ? 'الطلاب والنجاح' : 'Graded'}</th>
                <th>${I18N.t('date')}</th>
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

  async openCreateAssessmentModal() {
    try {
      const [coursesRes, groupsRes] = await Promise.all([
        API.get('/api/courses'),
        API.get('/api/groups')
      ]);

      const courses = coursesRes.courses || [];
      const groups = groupsRes.groups || [];

      const html = `
        <form id="asmCreateForm" class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'عنوان الاختبار أو التقييم *' : 'Assessment Title *'}</label>
            <input type="text" id="asmTitle" class="form-input" required placeholder="مثال: الاختبار العملي النهائي لدبلومة الصيدلة">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('courses')} *</label>
            <select id="asmCourse" class="form-select">
              ${courses.map(c => `<option value="${c.id}">${c.name_ar} (${c.code})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('groups')}</label>
            <select id="asmGroup" class="form-select">
              <option value="">${I18N.currentLang === 'ar' ? '-- لجميع مجموعات الدورة --' : '-- All Groups --'}</option>
              ${groups.map(g => `<option value="${g.id}">${g.group_name} (${g.course_name_ar})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'نوع الاختبار' : 'Type'}</label>
            <select id="asmType" class="form-select">
              <option value="Final">اختبار نهائي (Final)</option>
              <option value="Midterm">اختبار نصفي (Midterm)</option>
              <option value="Practical">امتحان عملي معملي (Practical)</option>
              <option value="Quiz">اختبار قصير (Quiz)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'الدرجة العظمى' : 'Max Score'}</label>
            <input type="number" id="asmMax" class="form-input" value="100">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'درجة النجاح الدنيا' : 'Passing Score'}</label>
            <input type="number" id="asmPass" class="form-input" value="70">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('date')}</label>
            <input type="date" id="asmDate" class="form-input" value="${new Date().toISOString().slice(0,10)}">
          </div>
        </form>
      `;

      openModal(
        I18N.currentLang === 'ar' ? 'إنشاء اختبار / تقييم جديد' : 'New Assessment',
        html,
        async () => {
          const body = {
            title: document.getElementById('asmTitle').value.trim(),
            course_id: parseInt(document.getElementById('asmCourse').value),
            group_id: document.getElementById('asmGroup').value ? parseInt(document.getElementById('asmGroup').value) : null,
            assessment_type: document.getElementById('asmType').value,
            max_score: parseFloat(document.getElementById('asmMax').value) || 100,
            passing_score: parseFloat(document.getElementById('asmPass').value) || 70,
            assessment_date: document.getElementById('asmDate').value
          };

          const res = await API.post('/api/assessments', body);
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          AssessmentsView.loadAssessments();
        },
        I18N.t('save')
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async openGradesModal(asmId) {
    try {
      const data = await API.get(`/api/assessments/${asmId}/grades`);
      const asm = data.assessment;
      const students = data.students || [];

      if (students.length === 0) {
        showToast(I18N.currentLang === 'ar' ? 'لا يوجد طلاب مسجلون في هذه الدورة/المجموعة بعد' : 'No students enrolled', 'warning');
        return;
      }

      const rows = students.map(st => `
        <tr data-student-id="${st.student_id}">
          <td>
            <div style="font-weight: 700;">${st.full_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${st.student_code}</div>
          </td>
          <td style="width: 140px;">
            <input type="number" class="form-input" style="padding: 0.35rem 0.6rem; font-weight: 700;"
                   id="gradeScore_${st.student_id}" value="${st.score !== null ? st.score : ''}" 
                   min="0" max="${asm.max_score}" placeholder="من ${asm.max_score}">
          </td>
          <td>
            <input type="text" class="form-input" style="padding: 0.35rem 0.6rem; font-size: 0.82rem;"
                   id="gradeFb_${st.student_id}" value="${st.feedback || ''}" placeholder="تقييم أو ملاحظات الأداء...">
          </td>
        </tr>
      `).join('');

      const html = `
        <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--brand-turquoise); margin: 0;">${asm.title}</h3>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">
            الدرجة العظمى: ${asm.max_score} • درجة النجاح: ${asm.passing_score} • الدورة: ${asm.course_name}
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.t('name')}</th>
                <th>${I18N.currentLang === 'ar' ? 'الدرجة المحصلة' : 'Score'}</th>
                <th>${I18N.currentLang === 'ar' ? 'التقييم والملاحظات' : 'Feedback'}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      openModal(
        I18N.currentLang === 'ar' ? `رصد درجات: ${asm.title}` : `Grades: ${asm.title}`,
        html,
        async () => {
          const payload = [];
          document.querySelectorAll('tr[data-student-id]').forEach(tr => {
            const sId = parseInt(tr.getAttribute('data-student-id'));
            const scoreVal = document.getElementById(`gradeScore_${sId}`).value;
            if (scoreVal !== '') {
              payload.push({
                student_id: sId,
                score: parseFloat(scoreVal),
                feedback: document.getElementById(`gradeFb_${sId}`).value.trim() || null
              });
            }
          });

          if (payload.length === 0) {
            showToast(I18N.currentLang === 'ar' ? 'يرجى إدخال درجة طالب واحد على الأقل' : 'Enter at least one score', 'warning');
            throw new Error('No grades entered');
          }

          const res = await API.post(`/api/assessments/${asmId}/grades`, { grades: payload });
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          AssessmentsView.loadAssessments();
        },
        I18N.currentLang === 'ar' ? 'حفظ الدرجات والتقييم' : 'Save Grades',
        'modal-lg'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async openIssueCertificateModal() {
    try {
      const [stuRes, coursesRes] = await Promise.all([
        API.get('/api/students', { limit: 100 }),
        API.get('/api/courses')
      ]);

      const students = stuRes.items || [];
      const courses = coursesRes.courses || [];

      const html = `
        <form id="issueCertForm" class="form-grid">
          <div style="grid-column: 1 / -1; padding: 0.75rem; background: rgba(13, 148, 136, 0.08); border-radius: var(--radius-md); font-size: 0.82rem; color: var(--brand-turquoise); border-inline-start: 4px solid var(--brand-turquoise);">
            <strong>معايير الاعتماد الإلزامية:</strong> يفحص النظام تلقائياً سداد كامل الرسوم (عدم وجود متبقيات مالية)، واجتياز نسبة الحضور المطلوبة (75% فأكثر).
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'اختر الطالب المتخرج *' : 'Student *'}</label>
            <select id="certStudent" class="form-select">
              ${students.map(s => `<option value="${s.id}">${s.full_name} (${s.student_code})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.t('courses')} *</label>
            <select id="certCourse" class="form-select">
              ${courses.map(c => `<option value="${c.id}">${c.name_ar} (${c.code})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'التقدير العام' : 'Grade / Distinction'}</label>
            <select id="certGrade" class="form-select">
              <option value="ممتاز مع مرتبة الشرف (Distinction)">ممتاز مع مرتبة الشرف (Distinction)</option>
              <option value="ممتاز (Excellent)">ممتاز (Excellent)</option>
              <option value="جيد جداً مرتفع (Very Good)">جيد جداً مرتفع (Very Good)</option>
              <option value="جيد جداً (Good Plus)">جيد جداً (Good Plus)</option>
              <option value="ناجح (Passed)">ناجح (Passed)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'تاريخ إتمام الدورة' : 'Completion Date'}</label>
            <input type="date" id="certCompDate" class="form-input" value="${new Date().toISOString().slice(0,10)}">
          </div>
        </form>
      `;

      openModal(
        I18N.currentLang === 'ar' ? 'فحص الأهلية وإصدار شهادة معتمدة' : 'Issue Verified Certificate',
        html,
        async () => {
          const body = {
            student_id: parseInt(document.getElementById('certStudent').value),
            course_id: parseInt(document.getElementById('certCourse').value),
            grade_label: document.getElementById('certGrade').value,
            completion_date: document.getElementById('certCompDate').value
          };

          const res = await API.post('/api/assessments/certificates/issue', body);
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          AssessmentsView.printCertificate(res.certificate_code);
        },
        I18N.currentLang === 'ar' ? 'تحقق وإصدار الشهادة' : 'Issue Certificate'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async printCertificate(certCode) {
    try {
      const res = await API.get(`/api/assessments/certificates/${certCode}`);
      const c = res.certificate;

      const html = `
        <div class="certificate-printable">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <img src="/static/img/logo.svg" alt="DoseWise Academy" style="height: 65px;">
            <div style="text-align: end; font-family: monospace; font-size: 0.85rem; font-weight: 700; color: #0D9488;">
              CODE: ${c.certificate_code}
            </div>
          </div>

          <div style="font-size: 1.1rem; font-weight: 700; letter-spacing: 0.1em; color: #475569; text-transform: uppercase; margin-bottom: 0.5rem;">
            شهادة إتمام وتأهيل مهني معتمد
          </div>
          <h1 style="font-size: 2.1rem; font-weight: 900; color: #0F172A; margin-bottom: 1.5rem;">
            CERTIFICATE OF COMPLETION
          </h1>

          <p style="font-size: 1.1rem; color: #334155; margin-bottom: 0.5rem;">
            تشهد إدارة أكاديمية دوز وايز للتدريب والاستشارات بأن المتدرب/ـة:
          </p>

          <div style="font-size: 2.2rem; font-weight: 900; color: #0D9488; margin: 1rem 0; border-bottom: 2px solid #CBD5E1; display: inline-block; padding: 0 2rem 0.5rem;">
            ${c.student_name}
          </div>
          <div style="font-size: 1rem; color: #64748B; font-weight: 600; margin-bottom: 1.5rem;">
            ${c.student_name_en || ''}
          </div>

          <p style="font-size: 1.15rem; color: #334155; max-width: 650px; margin: 0 auto 1.5rem; line-height: 1.8;">
            قد أتمـ/ـت بنجاح متطلبات البرنامج التدريبي التخصصي في:
            <br>
            <strong style="font-size: 1.35rem; color: #0F172A;">${c.course_name_ar}</strong>
            <br>
            <span style="font-size: 0.95rem; color: #0D9488; font-weight: 700;">${c.course_name_en}</span>
            <br>
            بإجمالي عدد ساعات معتمدة: <strong>(${c.total_hours} ساعة تدريبية وتطبيقية)</strong>
            وبتقدير عام: <strong style="color: #D97706;">${c.grade_label}</strong>
          </p>

          <div class="certificate-seal">
            ختم معتمد<br>SEAL
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #E2E8F0;">
            <div style="text-align: center;">
              <div style="font-size: 0.85rem; color: #64748B;">تاريخ التخرج والإصدار</div>
              <div style="font-weight: 800; font-size: 0.95rem; margin-top: 0.4rem;">${c.issue_date}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 0.78rem; color: #64748B; font-family: monospace;">كود التحقق الرقمي</div>
              <div style="font-size: 0.75rem; color: #0F172A; font-family: monospace; max-width: 200px; word-break: break-all;">${c.verification_hash.slice(0, 20)}...</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 0.85rem; color: #64748B;">رئيس مجلس الإدارة والمدير الأكاديمي</div>
              <div style="font-weight: 800; font-size: 0.95rem; margin-top: 0.4rem;">د. محمد الشناوي</div>
            </div>
          </div>
        </div>
      `;

      openModal(
        `الشهادة المعتمدة: ${c.certificate_code}`,
        html,
        () => window.print(),
        I18N.t('print'),
        'modal-xl'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteExam(examId, examTitle) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف الاختبار "${examTitle || ''}" وكافة درجات الطلاب المرصودة له نهائياً؟`
      : `Are you sure you want to delete assessment "${examTitle || ''}" and all graded scores?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/assessments/exams/${examId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف الاختبار بنجاح', 'success');
      this.loadAssessments();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
