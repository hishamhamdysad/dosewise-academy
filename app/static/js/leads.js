/**
 * DoseWise Academy - Leads & CRM View
 * Lead Pipeline, Follow-ups, Marketing Sources & Conversion
 */

const LeadsView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('leads')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
            ${I18N.t('leads')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'متابعة العملاء والمهتمين بالدورات، مصادر الحملات الإعلانية، ونسب التحويل' : 'Prospective students pipeline, lead follow-ups and conversion rates'}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="LeadsView.openCreateLeadModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${I18N.currentLang === 'ar' ? 'إضافة عميل محتمل' : 'New Lead'}
        </button>
      </div>

      <div class="card" id="leadsTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadLeads();
  },

  async loadLeads() {
    const container = document.getElementById('leadsTableContainer');
    try {
      const res = await API.get('/api/leads');
      const leads = res.leads || [];
      const stats = res.stats || {};

      if (leads.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = leads.map(l => {
        const cleanPhone = (l.whatsapp || l.phone || '').replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/2${cleanPhone}`;
        const isConverted = l.status === 'Registered';

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-main);">${l.full_name}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${l.notes || '-'}</div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span dir="ltr">${l.phone}</span>
                <a href="${waLink}" target="_blank" style="color: #25D366;" title="WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </a>
              </div>
            </td>
            <td>${l.course_name_ar || '<span style="color: var(--text-muted);">-</span>'}</td>
            <td><span class="badge badge-navy">${l.source}</span></td>
            <td>
              <span class="badge ${l.status==='Registered'?'badge-success':(l.status==='Interested'?'badge-info':'badge-warning')}">
                ${l.status}
              </span>
            </td>
            <td>${l.follow_up_date || '-'}</td>
            <td>
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                ${isConverted ? `<span class="badge badge-success">تم التحويل لطالب (${l.converted_student_code})</span>` : `
                  <button class="btn btn-sm btn-primary" onclick="LeadsView.convertLead(${l.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    ${I18N.currentLang === 'ar' ? 'تحويل' : 'Convert'}
                  </button>
                `}
                <button class="btn btn-sm btn-danger" onclick="LeadsView.deleteLead(${l.id}, '${l.full_name ? l.full_name.replace(/'/g, "\\'") : ''}')" title="${I18N.t('delete')}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div style="display: flex; gap: 1.5rem; padding: 1rem 1.25rem; background: var(--bg-body); border-radius: var(--radius-md); margin-bottom: 1.25rem; align-items: center; justify-content: space-between;">
          <div style="display: flex; gap: 1.5rem;">
            <span>${I18N.currentLang === 'ar' ? 'إجمالي العملاء المحتملين:' : 'Total Leads:'} <strong>${stats.total || 0}</strong></span>
            <span>${I18N.currentLang === 'ar' ? 'تم تسجيلهم كطلاب:' : 'Converted to Students:'} <strong style="color: var(--accent-success);">${stats.registered || 0}</strong></span>
          </div>
          <span class="badge badge-success" style="font-size: 0.9rem;">
            ${I18N.currentLang === 'ar' ? 'معدل التحويل (Conversion Rate):' : 'Conversion Rate:'} ${stats.conversion_rate || 0}%
          </span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('phone')}</th>
                <th>${I18N.currentLang === 'ar' ? 'الدورة المهتم بها' : 'Interested Course'}</th>
                <th>${I18N.currentLang === 'ar' ? 'مصدر الحملة' : 'Source'}</th>
                <th>${I18N.t('status')}</th>
                <th>${I18N.currentLang === 'ar' ? 'موعد المتابعة' : 'Follow-up'}</th>
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

  async openCreateLeadModal() {
    try {
      const coursesRes = await API.get('/api/courses');
      const courses = coursesRes.courses || [];

      const html = `
        <form id="leadCreateForm" class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'اسم العميل / المهتم *' : 'Lead Full Name *'}</label>
            <input type="text" id="leadName" class="form-input" required placeholder="مثال: د. إسلام نبيل">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('phone')} *</label>
            <input type="text" id="leadPhone" class="form-input" required placeholder="010...">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم الواتساب' : 'WhatsApp'}</label>
            <input type="text" id="leadWa" class="form-input" placeholder="010...">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'الدورة التدريبية المهتم بها' : 'Interested Course'}</label>
            <select id="leadCourse" class="form-select">
              <option value="">-- اختياري --</option>
              ${courses.map(c => `<option value="${c.id}">${c.name_ar}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'مصدر العميل (Source)' : 'Source'}</label>
            <select id="leadSource" class="form-select">
              <option value="Facebook">فيسبوك (Facebook Ads)</option>
              <option value="Instagram">إنستغرام (Instagram)</option>
              <option value="TikTok">تيك توك (TikTok)</option>
              <option value="Referral">ترشيح من زميل (Referral)</option>
              <option value="Walk_In">زيارة مباشرة للمقر (Walk-in)</option>
              <option value="Website">الموقع الإلكتروني</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'تاريخ المتابعة القادمة' : 'Follow-up Date'}</label>
            <input type="date" id="leadFollowDate" class="form-input" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('status')}</label>
            <select id="leadStatus" class="form-select">
              <option value="New">جديد (New)</option>
              <option value="Contacted">تم التواصل (Contacted)</option>
              <option value="Interested" selected>مهتم بالحجز (Interested)</option>
              <option value="Lost">غير مهتم (Lost)</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.t('notes')}</label>
            <textarea id="leadNotes" class="form-textarea" placeholder="تفاصيل الاستفسار وموعد الاتصال المفضل..."></textarea>
          </div>
        </form>
      `;

      openModal(
        I18N.currentLang === 'ar' ? 'إضافة عميل محتمل جديد' : 'New CRM Lead',
        html,
        async () => {
          const body = {
            full_name: document.getElementById('leadName').value.trim(),
            phone: document.getElementById('leadPhone').value.trim(),
            whatsapp: document.getElementById('leadWa').value.trim() || null,
            interested_course_id: document.getElementById('leadCourse').value ? parseInt(document.getElementById('leadCourse').value) : null,
            source: document.getElementById('leadSource').value,
            follow_up_date: document.getElementById('leadFollowDate').value,
            status: document.getElementById('leadStatus').value,
            notes: document.getElementById('leadNotes').value.trim() || null
          };

          const res = await API.post('/api/leads', body);
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          LeadsView.loadLeads();
        },
        I18N.t('save')
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async convertLead(leadId) {
    if (!confirm(I18N.currentLang === 'ar' ? 'هل تريد تأكيد تحويل هذا العميل إلى طالب مسجل بالأكاديمية؟' : 'Confirm converting this lead into an enrolled student?')) {
      return;
    }

    try {
      const res = await API.post(`/api/leads/${leadId}/convert`);
      showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
      LeadsView.loadLeads();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteLead(leadId, leadName) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف العميل المحتمل "${leadName || ''}" نهائياً؟`
      : `Are you sure you want to delete lead "${leadName || ''}"?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/leads/${leadId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف العميل بنجاح', 'success');
      LeadsView.loadLeads();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
