/**
 * DoseWise Academy - Finance & Payments Management Engine
 * Enrollment Plans, Receipts Generator, Debts & Overdue Tracking, Refunds
 */

const FinanceView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('finance')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            ${I18N.t('finance')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'إدارة التحصيل، خطط الأقساط، إصدار الإيصالات الرسمية، ومتابعة الديون' : 'Payments collection, installment plans, official receipts and debt aging'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary btn-sm" onclick="FinanceView.openEnrollModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18N.currentLang === 'ar' ? 'تسجيل طالب بدورة وخطة أقساط' : 'Enroll & Plan'}
          </button>
        </div>
      </div>

      <div class="tab-list">
        <button class="tab-btn active" onclick="FinanceView.switchTab('finPayments', this)">${I18N.currentLang === 'ar' ? 'سجل المقبوضات والإيصالات' : 'Payments Ledger'}</button>
        <button class="tab-btn" onclick="FinanceView.switchTab('finDebts', this)">${I18N.currentLang === 'ar' ? 'الديون والأقساط المستحقة المتأخرة' : 'Outstanding Debts & Overdue'}</button>
      </div>

      <!-- Tab 1: Payments Ledger -->
      <div id="finPayments" class="fin-tab-content">
        <div class="card" id="paymentsLedgerContainer">
          <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
        </div>
      </div>

      <!-- Tab 2: Debts & Overdue -->
      <div id="finDebts" class="fin-tab-content" style="display: none;">
        <div class="card" id="debtsContainer">
          <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
        </div>
      </div>
    `;

    await this.loadPayments();
  },

  async loadPayments() {
    const container = document.getElementById('paymentsLedgerContainer');
    try {
      const res = await API.get('/api/finance/payments');
      const payments = res.payments || [];

      if (payments.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = payments.map(p => `
        <tr>
          <td><span class="badge badge-navy" style="font-family: monospace;">${p.receipt_number}</span></td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${p.student_name}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">${p.student_code}</div>
          </td>
          <td>
            <div style="font-size: 0.88rem; font-weight: 600;">${p.course_name_ar}</div>
            <div style="font-size: 0.75rem; color: var(--brand-turquoise);">${p.group_name}</div>
          </td>
          <td>
            <strong style="color: var(--accent-success); font-size: 1.05rem;">
              ${Number(p.amount).toLocaleString('ar-EG')} ${I18N.t('currency')}
            </strong>
          </td>
          <td>${p.payment_date}</td>
          <td>
            <span class="badge badge-info">${p.payment_method}</span>
            ${p.reference_number ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">${p.reference_number}</div>` : ''}
          </td>
          <td>${p.recorded_by_name || '-'}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-secondary" onclick="FinanceView.printReceipt('${p.receipt_number}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                ${I18N.t('print')}
              </button>
              <button class="btn btn-sm btn-danger" onclick="FinanceView.deletePayment(${p.id}, '${p.receipt_number}')" title="${I18N.t('delete')}">
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
                <th>${I18N.t('receiptNumber')}</th>
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('courses')}</th>
                <th>${I18N.t('amount')}</th>
                <th>${I18N.t('date')}</th>
                <th>${I18N.t('paymentMethod')}</th>
                <th>${I18N.currentLang === 'ar' ? 'المحصل' : 'Cashier'}</th>
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

  async loadDebts() {
    const container = document.getElementById('debtsContainer');
    try {
      const res = await API.get('/api/finance/debts');
      const debts = res.debts || [];

      if (debts.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--accent-success);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>${I18N.currentLang === 'ar' ? 'رائع! لا توجد أي ديون متأخرة على أي طالب.' : 'No outstanding debts.'}</p>
          </div>
        `;
        return;
      }

      const rows = debts.map(d => {
        const cleanPhone = (d.whatsapp_number || d.mobile_number || '').replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`مرحباً أستاذ/ة ${d.full_name}، نود تذكيركم بمتبقي الرصيد المستحق لدبلومة ${d.course_name_ar} بقيمة ${d.balance_due} ج.م لدى أكاديمية دوز وايز.`)}`;

        return `
          <tr>
            <td><span class="badge badge-navy">${d.student_code}</span></td>
            <td><strong>${d.full_name}</strong></td>
            <td>${d.course_name_ar} (${d.group_name})</td>
            <td>${Number(d.final_price).toLocaleString('ar-EG')} ج.م</td>
            <td>${Number(d.total_paid).toLocaleString('ar-EG')} ج.م</td>
            <td>
              <span class="badge badge-danger" style="font-size: 0.9rem;">
                ${Number(d.balance_due).toLocaleString('ar-EG')} ${I18N.t('currency')}
              </span>
            </td>
            <td>${d.next_due_date || '-'}</td>
            <td>
              <div style="display: flex; gap: 0.4rem;">
                <a href="${waLink}" target="_blank" class="btn btn-sm btn-success" title="WhatsApp Reminder">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </a>
                <button class="btn btn-sm btn-primary" onclick="FinanceView.openPaymentModal(${d.enrollment_id})">
                  ${I18N.currentLang === 'ar' ? 'تحصيل دفعة' : 'Record Pay'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div style="padding: 1rem 1.25rem; background: var(--bg-body); border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: var(--text-main);">${I18N.currentLang === 'ar' ? 'إجمالي الديون والمتبقيات المطلوبة للتحصيل:' : 'Total Receivables:'}</span>
          <span style="font-size: 1.3rem; font-weight: 800; color: var(--accent-danger);">
            ${Number(res.total_outstanding_debt).toLocaleString('ar-EG')} ${I18N.t('currency')}
          </span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.t('code')}</th>
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('courses')}</th>
                <th>${I18N.t('finalPrice')}</th>
                <th>${I18N.t('totalPaid')}</th>
                <th>${I18N.t('balanceDue')}</th>
                <th>${I18N.currentLang === 'ar' ? 'الاستحقاق القادم' : 'Next Due'}</th>
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
    document.querySelectorAll('.fin-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');

    if (tabId === 'finDebts') {
      this.loadDebts();
    }
  },

  async openEnrollModal(preselectedStudentId = null) {
    try {
      const [stuRes, grpRes] = await Promise.all([
        API.get('/api/students', { limit: 100 }),
        API.get('/api/groups', { status: 'Active' })
      ]);

      const students = stuRes.items || [];
      const groups = grpRes.groups || [];

      if (students.length === 0 || groups.length === 0) {
        showToast(I18N.currentLang === 'ar' ? 'يرجى التأكد من وجود طلاب ومجموعات نشطة أولاً' : 'Students and active groups required', 'warning');
        return;
      }

      const html = `
        <form id="enrollForm" class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'اختر الطالب *' : 'Select Student *'}</label>
            <select id="enrStudent" class="form-select" required>
              ${students.map(s => `<option value="${s.id}" ${preselectedStudentId === s.id ? 'selected' : ''}>${s.full_name} (${s.student_code}) - ${s.mobile_number}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'اختر المجموعة التدريبية *' : 'Select Training Group *'}</label>
            <select id="enrGroup" class="form-select" required onchange="FinanceView.updateEnrollPricing()">
              ${groups.map(g => `<option value="${g.id}" data-price="${g.group_price || g.standard_price}">${g.course_name_ar} - ${g.group_name} (${g.classroom_name}) [${g.group_price || g.standard_price} ج.م]</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('discount')} (ج.م)</label>
            <input type="number" id="enrDiscount" class="form-input" value="0" min="0" onchange="FinanceView.updateEnrollPricing()">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'سبب الخصم' : 'Discount Reason'}</label>
            <input type="text" id="enrDiscountReason" class="form-input" placeholder="خصم نقابة الصيادلة، حجز مبكر...">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'الدفعة الأولى الآن (ج.م)' : 'Initial Payment'}</label>
            <input type="number" id="enrInitialPay" class="form-input" value="0" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('paymentMethod')}</label>
            <select id="enrMethod" class="form-select">
              <option value="Cash">نقدياً بالخزينة (Cash)</option>
              <option value="InstaPay">InstaPay (إنستاباي)</option>
              <option value="Card">فيزا / ماكينة POS (Card)</option>
              <option value="Bank_Transfer">تحويل بنكي (Bank Transfer)</option>
              <option value="Vodafone_Cash">فودافون كاش (Vodafone Cash)</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم المرجع / إيصال الدفع الإلكتروني' : 'Reference Number'}</label>
            <input type="text" id="enrRef" class="form-input" placeholder="INSTA-...">
          </div>
        </form>
      `;

      openModal(
        I18N.currentLang === 'ar' ? 'تسجيل طالب في دورة وخطة سداد' : 'Enroll Student in Group',
        html,
        async () => {
          const body = {
            student_id: parseInt(document.getElementById('enrStudent').value),
            group_id: parseInt(document.getElementById('enrGroup').value),
            discount_amount: parseFloat(document.getElementById('enrDiscount').value) || 0,
            discount_type: 'fixed',
            discount_reason: document.getElementById('enrDiscountReason').value.trim() || null,
            initial_payment: parseFloat(document.getElementById('enrInitialPay').value) || 0,
            payment_method: document.getElementById('enrMethod').value,
            reference_number: document.getElementById('enrRef').value.trim() || null
          };

          const res = await API.post('/api/finance/enroll', body);
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          
          if (res.receipt_number) {
            FinanceView.printReceipt(res.receipt_number);
          }
          FinanceView.loadPayments();
        },
        I18N.currentLang === 'ar' ? 'تأكيد التسجيل وإصدار الإيصال' : 'Confirm Enrollment'
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  updateEnrollPricing() {
    // dynamically reactive
  },

  openPaymentModal(enrollmentId) {
    const html = `
      <form id="recordPayForm" class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'مبلغ السداد المحصل (ج.م) *' : 'Payment Amount (EGP) *'}</label>
          <input type="number" id="recPayAmount" class="form-input" required min="1" placeholder="مثال: 1500">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('paymentMethod')}</label>
          <select id="recPayMethod" class="form-select">
            <option value="Cash">نقدياً بالخزينة (Cash)</option>
            <option value="InstaPay" selected>InstaPay (إنستاباي)</option>
            <option value="Card">فيزا / بطاقة بنكية (Card)</option>
            <option value="Bank_Transfer">تحويل بنكي (Bank Transfer)</option>
            <option value="Vodafone_Cash">فودافون كاش (Vodafone Cash)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'رقم الإشعار / المرجع' : 'Reference Number'}</label>
          <input type="text" id="recPayRef" class="form-input" placeholder="INSTA-...">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.t('notes')}</label>
          <textarea id="recPayNotes" class="form-textarea" placeholder="بيان القسط المسدد..."></textarea>
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'تحصيل دفعة مالية وإصدار إيصال' : 'Record Payment & Issue Receipt',
      html,
      async () => {
        const amount = parseFloat(document.getElementById('recPayAmount').value) || 0;
        if (amount <= 0) {
          showToast(I18N.currentLang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Invalid amount', 'warning');
          throw new Error('Invalid amount');
        }

        const body = {
          enrollment_id: enrollmentId,
          amount,
          payment_method: document.getElementById('recPayMethod').value,
          reference_number: document.getElementById('recPayRef').value.trim() || null,
          notes: document.getElementById('recPayNotes').value.trim() || null
        };

        const res = await API.post('/api/finance/payments', body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        FinanceView.printReceipt(res.receipt_number);
        FinanceView.loadPayments();
      },
      I18N.currentLang === 'ar' ? 'تأكيد السداد والطباعة' : 'Confirm & Print'
    );
  },

  async printReceipt(receiptNumber) {
    try {
      const res = await API.get(`/api/finance/receipt/${receiptNumber}`);
      const r = res.receipt;

      const html = `
        <div class="receipt-printable">
          <div class="receipt-header">
            <div>
              <img src="/static/img/logo.svg" alt="DoseWise Academy" style="height: 55px;">
              <div style="font-size: 0.78rem; color: #475569; margin-top: 0.25rem;">
                أكاديمية دوز وايز للتدريب والاستشارات الطبية • جمهورية مصر العربية
              </div>
            </div>
            <div style="text-align: end;">
              <h2 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0;">إيصال سداد مالي رسمي</h2>
              <div style="font-size: 0.85rem; font-weight: 700; color: #0D9488; font-family: monospace;">${r.receipt_number}</div>
              <div style="font-size: 0.75rem; color: #64748B;">التاريخ: ${r.payment_date}</div>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <div class="receipt-row">
              <span style="color: #64748B;">اسم الطالب:</span>
              <strong>${r.student_name} (${r.student_code})</strong>
            </div>
            <div class="receipt-row">
              <span style="color: #64748B;">الرقم القومي / الهاتف:</span>
              <span>${r.national_id || '-'} / <span dir="ltr">${r.mobile_number}</span></span>
            </div>
            <div class="receipt-row">
              <span style="color: #64748B;">الدورة التدريبية:</span>
              <strong>${r.course_name_ar}</strong>
            </div>
            <div class="receipt-row">
              <span style="color: #64748B;">المجموعة والقاعة:</span>
              <span>${r.group_name}</span>
            </div>
            <div class="receipt-row">
              <span style="color: #64748B;">طريقة السداد:</span>
              <span>${r.payment_method} ${r.reference_number ? `(${r.reference_number})` : ''}</span>
            </div>
          </div>

          <div class="receipt-total-row">
            <span>المبلغ المدفوع:</span>
            <span style="color: #0D9488;">${Number(r.amount).toLocaleString('ar-EG')} جنيه مصري</span>
          </div>

          <div class="receipt-row" style="font-size: 0.88rem; color: #64748B;">
            <span>الرصيد المتبقي بعد هذا الإيصال:</span>
            <strong style="color: ${r.balance_due > 0 ? '#EF4444' : '#10B981'};">${Number(r.balance_due).toLocaleString('ar-EG')} جنيه مصري</strong>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #E2E8F0; font-size: 0.82rem; color: #475569;">
            <div style="text-align: center;">
              <div>المحصل المسؤول</div>
              <div style="margin-top: 2rem; font-weight: 700;">${r.cashier_name || 'الخزينة المركزية'}</div>
            </div>
            <div style="text-align: center;">
              <div>ختم الأكاديمية الرسمي</div>
              <div style="width: 75px; height: 75px; border: 2px dashed #0D9488; border-radius: 50%; margin: 0.5rem auto 0; display: flex; align-items: center; justify-content: center; color: #0D9488; font-size: 0.65rem; font-weight: 800;">
                معتمد
              </div>
            </div>
            <div style="text-align: center;">
              <div>توقيع الطالب / المستلم</div>
              <div style="margin-top: 2rem;">...........................</div>
            </div>
          </div>
        </div>
      `;

      openModal(
        `إيصال سداد: ${r.receipt_number}`,
        html,
        () => window.print(),
        I18N.t('print')
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deletePayment(paymentId, receiptNumber) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في إلغاء وحذف سند القبض رقم "${receiptNumber || ''}"؟ سيتم إعادة المبلغ إلى رصيد المتبقي على الطالب.`
      : `Are you sure you want to delete payment receipt "${receiptNumber || ''}"? The amount will be added back to the student's balance due.`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/finance/payments/${paymentId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف سند القبض بنجاح', 'success');
      this.loadPayments();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
