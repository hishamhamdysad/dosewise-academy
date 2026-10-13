/**
 * DoseWise Academy - Trainers Management & Transparent Compensation View
 */

const TrainersView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('trainers')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${I18N.t('trainers')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'ملفات المحاضرين، نماذج الأجور الشفافة، حساب المستحقات، وسندات الصرف' : 'Faculty directory, transparent compensation models, earnings and payout vouchers'}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="TrainersView.openCreateModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${I18N.currentLang === 'ar' ? 'إضافة محاضر جديد' : 'New Trainer'}
        </button>
      </div>

      <div class="card" id="trainersTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadTrainers();
  },

  async loadTrainers() {
    const container = document.getElementById('trainersTableContainer');
    try {
      const res = await API.get('/api/trainers');
      const trainers = res.trainers || [];

      if (trainers.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = trainers.map(t => `
        <tr>
          <td><span class="badge badge-navy" style="font-family: monospace;">${t.trainer_code}</span></td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${t.full_name}</div>
            <div style="font-size: 0.78rem; color: var(--brand-turquoise); font-weight: 600;">${t.specialization}</div>
          </td>
          <td dir="ltr">${t.mobile}</td>
          <td>
            <span class="badge badge-info">${t.model_label_ar || t.compensation_model}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">الفئة: ${t.compensation_rate} ج.م</div>
          </td>
          <td><span class="badge badge-purple">${t.delivered_sessions_count} ${I18N.currentLang === 'ar' ? 'محاضرة' : 'sessions'}</span></td>
          <td><strong>${Number(t.total_earned).toLocaleString('ar-EG')} ${I18N.t('currency')}</strong></td>
          <td>${Number(t.total_paid).toLocaleString('ar-EG')} ${I18N.t('currency')}</td>
          <td>
            <span class="badge ${t.balance_due > 0 ? 'badge-danger' : 'badge-success'}">
              ${Number(t.balance_due).toLocaleString('ar-EG')} ${I18N.t('currency')}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-secondary" onclick="TrainersView.viewStatement(${t.id})">
                ${I18N.t('view')}
              </button>
              <button class="btn btn-sm btn-success" onclick="TrainersView.openPayoutModal(${t.id})" ${t.balance_due <= 0 ? 'disabled' : ''}>
                ${I18N.currentLang === 'ar' ? 'صرف' : 'Payout'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="TrainersView.deleteTrainer(${t.id}, '${t.full_name ? t.full_name.replace(/'/g, "\\'") : ''}')" title="${I18N.t('delete')}">
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
                <th>${I18N.t('code')}</th>
                <th>${I18N.currentLang === 'ar' ? 'المحاضر والتخصص' : 'Trainer & Specialty'}</th>
                <th>${I18N.t('phone')}</th>
                <th>${I18N.currentLang === 'ar' ? 'نظام الحساب' : 'Compensation Model'}</th>
                <th>${I18N.currentLang === 'ar' ? 'المحاضرات المنجزة' : 'Delivered'}</th>
                <th>${I18N.currentLang === 'ar' ? 'إجمالي المستحق' : 'Earned'}</th>
                <th>${I18N.t('totalPaid')}</th>
                <th>${I18N.currentLang === 'ar' ? 'المتبقي للصرف' : 'Balance Due'}</th>
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

  openCreateModal() {
    const html = `
      <form id="trainerCreateForm" class="form-grid">
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'كود المحاضر *' : 'Trainer Code *'}</label>
          <input type="text" id="trnCode" class="form-input" required placeholder="TRN-006">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'اسم المحاضر بالكامل *' : 'Full Name *'}</label>
          <input type="text" id="trnName" class="form-input" required placeholder="د. محمد محمود">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم الهاتف *' : 'Mobile Number *'}</label>
          <input type="text" id="trnMobile" class="form-input" required placeholder="010...">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
          <input type="email" id="trnEmail" class="form-input" placeholder="trainer@dosewise.edu.eg">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'التخصص الطبي / التدريبي *' : 'Specialization *'}</label>
          <input type="text" id="trnSpec" class="form-input" required placeholder="مثال: الصيدلة الإكلينيكية، علم الأدوية">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'نموذج حساب الأجر *' : 'Compensation Model *'}</label>
          <select id="trnModel" class="form-select">
            <option value="session_fee">أجر محدد لكل محاضرة (Session Fee)</option>
            <option value="fixed_salary">راتب شهري ثابت (Monthly Salary)</option>
            <option value="hourly_rate">أجر بالساعة (Hourly Rate)</option>
            <option value="revenue_percentage">نسبة مئوية من الإيراد (Revenue %)</option>
            <option value="fixed_course">مقطوعية عن الدورة كاملة (Fixed per Course)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'فئة الأجر / النسبة *' : 'Rate / Percentage *'}</label>
          <input type="number" id="trnRate" class="form-input" required min="0" placeholder="600">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'المؤهلات والخبرات السابقة' : 'Qualifications'}</label>
          <textarea id="trnQual" class="form-textarea" placeholder="الشهادات الأكاديمية والخبرة العملية..."></textarea>
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'تسجيل محاضر جديد وتحديد نموذج الأجر' : 'Add Trainer Profile',
      html,
      async () => {
        const body = {
          trainer_code: document.getElementById('trnCode').value.trim(),
          full_name: document.getElementById('trnName').value.trim(),
          mobile: document.getElementById('trnMobile').value.trim(),
          email: document.getElementById('trnEmail').value.trim() || null,
          specialization: document.getElementById('trnSpec').value.trim(),
          compensation_model: document.getElementById('trnModel').value,
          compensation_rate: parseFloat(document.getElementById('trnRate').value) || 0,
          qualifications: document.getElementById('trnQual').value.trim() || null,
          status: 'Active'
        };

        const res = await API.post('/api/trainers', body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        TrainersView.loadTrainers();
      },
      I18N.t('save')
    );
  },

  async viewStatement(trainerId) {
    try {
      const data = await API.get(`/api/trainers/${trainerId}`);
      const t = data.trainer;
      const groups = data.groups || [];
      const sessions = data.sessions || [];
      const payouts = data.payouts || [];

      const html = `
        <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
          <div>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-navy">${t.trainer_code}</span>
              <span class="badge badge-success">${t.status}</span>
            </div>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${t.full_name}</h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${t.specialization} • ${t.mobile}</div>
          </div>
          <button class="btn btn-sm btn-success" onclick="closeModal(); TrainersView.openPayoutModal(${t.id});" ${t.balance_due <= 0 ? 'disabled' : ''}>
            ${I18N.currentLang === 'ar' ? 'صرف مستحقات مالية' : 'Issue Payout'}
          </button>
        </div>

        <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'إجمالي المستحق' : 'Earned'}</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">${Number(t.total_earned).toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'إجمالي المنصرف' : 'Paid'}</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-success);">${Number(t.total_paid).toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'المتبقي للصرف' : 'Balance Due'}</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-danger);">${Number(t.balance_due).toLocaleString('ar-EG')} ج.م</div>
          </div>
        </div>

        <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.6rem;">${I18N.currentLang === 'ar' ? 'سجل سندات الصرف المسددة' : 'Payout History'}</h3>
        ${payouts.length === 0 ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${I18N.t('code')}</th>
                  <th>${I18N.t('date')}</th>
                  <th>${I18N.t('amount')}</th>
                  <th>${I18N.t('paymentMethod')}</th>
                  <th>${I18N.currentLang === 'ar' ? 'المسؤول' : 'Issued By'}</th>
                </tr>
              </thead>
              <tbody>
                ${payouts.map(p => `
                  <tr>
                    <td><span class="badge badge-navy">${p.payout_number}</span></td>
                    <td>${p.payment_date}</td>
                    <td><strong>${Number(p.amount).toLocaleString('ar-EG')} ج.م</strong></td>
                    <td>${p.payment_method}</td>
                    <td>${p.paid_by_name || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;

      openModal(
        I18N.currentLang === 'ar' ? `كشف حساب ومستحقات المحاضر: ${t.full_name}` : `Trainer Statement: ${t.full_name}`,
        html,
        null,
        null,
        'modal-lg'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  openPayoutModal(trainerId) {
    const html = `
      <form id="payoutForm" class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'مبلغ الصرف المستحق (ج.م) *' : 'Payout Amount (EGP) *'}</label>
          <input type="number" id="payAmount" class="form-input" required min="1" placeholder="مثال: 5200">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('paymentMethod')}</label>
          <select id="payMethod" class="form-select">
            <option value="Cash">نقدياً من الخزينة (Cash)</option>
            <option value="InstaPay" selected>InstaPay (إنستاباي)</option>
            <option value="Bank_Transfer">تحويل بنكي (Bank Transfer)</option>
            <option value="Vodafone_Cash">فودافون كاش (Vodafone Cash)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم المرجع / المعاملة' : 'Reference Number'}</label>
          <input type="text" id="payRef" class="form-input" placeholder="INSTA-...">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.t('notes')}</label>
          <textarea id="payNotes" class="form-textarea" placeholder="بيان المحاضرات أو الفترة المستحقة..."></textarea>
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'إصدار سند صرف مستحقات محاضر' : 'Issue Trainer Payout Voucher',
      html,
      async () => {
        const amount = parseFloat(document.getElementById('payAmount').value) || 0;
        if (amount <= 0) {
          showToast(I18N.currentLang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Invalid amount', 'warning');
          throw new Error('Invalid amount');
        }

        const body = {
          amount,
          payment_method: document.getElementById('payMethod').value,
          reference_number: document.getElementById('payRef').value.trim() || null,
          notes: document.getElementById('payNotes').value.trim() || null
        };

        const res = await API.post(`/api/trainers/${trainerId}/payout`, body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        TrainersView.loadTrainers();
      },
      I18N.currentLang === 'ar' ? 'اعتماد الصرف وطباعة السند' : 'Confirm Payout'
    );
  },

  async deleteTrainer(trainerId, trainerName) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف بيانات المحاضر "${trainerName || ''}" وسجلاته نهائياً؟`
      : `Are you sure you want to delete trainer "${trainerName || ''}" and their records?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/trainers/${trainerId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف المدرب بنجاح', 'success');
      closeModal();
      this.loadTrainers();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
