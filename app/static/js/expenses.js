/**
 * DoseWise Academy - Expenses & Daily Cash Register (Treasury) View
 */

const ExpensesView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('expenses')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            ${I18N.t('expenses')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'سجل المصروفات التشغيلية، مراكز التكلفة، وجرد الخزينة اليومية' : 'Operating expenses, cost centers, and daily cash register reconciliation'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="ExpensesView.openCloseTreasuryModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            ${I18N.currentLang === 'ar' ? 'إغلاق وجرد الخزينة اليومية' : 'Reconcile Treasury'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="ExpensesView.openCreateExpenseModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18N.currentLang === 'ar' ? 'تسجيل سند صرف جديد' : 'New Expense'}
          </button>
        </div>
      </div>

      <div class="tab-list">
        <button class="tab-btn active" onclick="ExpensesView.switchTab('tabExpList', this)">${I18N.currentLang === 'ar' ? 'سجل المصروفات' : 'Expenses Ledger'}</button>
        <button class="tab-btn" onclick="ExpensesView.switchTab('tabTreasury', this)">${I18N.currentLang === 'ar' ? 'الخزينة النقدية اليومية (Live Treasury)' : 'Daily Cash Register'}</button>
      </div>

      <!-- Tab 1: Expenses List -->
      <div id="tabExpList" class="exp-tab-content">
        <div class="card" id="expensesTableContainer">
          <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
        </div>
      </div>

      <!-- Tab 2: Treasury Status -->
      <div id="tabTreasury" class="exp-tab-content" style="display: none;">
        <div class="card" id="treasuryContainer">
          <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
        </div>
      </div>
    `;

    await this.loadExpenses();
  },

  async loadExpenses() {
    const container = document.getElementById('expensesTableContainer');
    try {
      const res = await API.get('/api/expenses');
      const expenses = res.expenses || [];

      if (expenses.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = expenses.map(e => `
        <tr>
          <td><span class="badge badge-navy">${e.expense_number}</span></td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${e.description}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${e.vendor || '-'}</div>
          </td>
          <td><span class="badge badge-info">${e.category_label_ar || e.category}</span></td>
          <td>
            <strong style="color: var(--accent-danger); font-size: 1.05rem;">
              ${Number(e.amount).toLocaleString('ar-EG')} ${I18N.t('currency')}
            </strong>
          </td>
          <td>${e.expense_date}</td>
          <td>${e.payment_method}</td>
          <td>
            <span class="badge ${e.approval_status==='Approved'?'badge-success':(e.approval_status==='Pending'?'badge-warning':'badge-danger')}">
              ${e.approval_status}
            </span>
          </td>
          <td>${e.recorded_by_name || '-'}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="ExpensesView.deleteExpense(${e.id}, '${e.expense_number}')" title="${I18N.t('delete')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </td>
        </tr>
      `).join('');

      container.innerHTML = `
        <div style="padding: 1rem 1.25rem; background: var(--bg-body); border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700;">${I18N.currentLang === 'ar' ? 'إجمالي المصروفات المعتمدة:' : 'Total Approved Expenses:'}</span>
          <span style="font-size: 1.3rem; font-weight: 800; color: var(--accent-danger);">
            ${Number(res.total_approved_amount).toLocaleString('ar-EG')} ${I18N.t('currency')}
          </span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.t('code')}</th>
                <th>${I18N.currentLang === 'ar' ? 'البيان والجهة المستفيدة' : 'Description & Vendor'}</th>
                <th>${I18N.currentLang === 'ar' ? 'بند المصروف' : 'Category'}</th>
                <th>${I18N.t('amount')}</th>
                <th>${I18N.t('date')}</th>
                <th>${I18N.t('paymentMethod')}</th>
                <th>${I18N.t('status')}</th>
                <th>${I18N.currentLang === 'ar' ? 'القائم بالصرف' : 'Recorded By'}</th>
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

  async loadTreasury() {
    const container = document.getElementById('treasuryContainer');
    try {
      const res = await API.get('/api/expenses/treasury/today');
      const reg = res.register;
      const cashPayments = res.cash_payments || [];
      const cashExpenses = res.cash_expenses || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${I18N.currentLang === 'ar' ? 'جرد الخزينة النقدية ليوم:' : 'Daily Cash Register:'} ${reg.register_date}</h3>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;">
              حالة الخزينة: <span class="badge ${reg.status==='Open'?'badge-success':'badge-navy'}">${reg.status === 'Open' ? 'مفتوحة للعمليات' : 'مغلقة ومطابقة'}</span>
            </div>
          </div>
        </div>

        <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'رصيد الافتتاح' : 'Opening'}</div>
            <div style="font-size: 1.2rem; font-weight: 800;">${Number(reg.opening_balance).toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'المقبوضات النقدية (+)' : 'Inflow (+)'}</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-success);">${Number(reg.total_inflow).toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'المصروفات النقدية (-)' : 'Outflow (-)'}</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-danger);">${Number(reg.total_outflow).toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'الرصيد الدفتري المتوقع' : 'Expected Balance'}</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--brand-turquoise);">${Number(reg.expected_closing).toLocaleString('ar-EG')} ج.م</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; color: var(--accent-success);">${I18N.currentLang === 'ar' ? 'المقبوضات النقدية لليوم' : 'Cash Inflows'}</h4>
            ${cashPayments.length === 0 ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
              <div class="table-responsive">
                <table class="data-table">
                  <tbody>
                    ${cashPayments.map(p => `
                      <tr>
                        <td><span class="badge badge-navy">${p.receipt_number}</span></td>
                        <td>${p.student_name}</td>
                        <td style="color: var(--accent-success); font-weight: 700;">+${Number(p.amount).toLocaleString('ar-EG')} ج.م</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; color: var(--accent-danger);">${I18N.currentLang === 'ar' ? 'المنصرفات النقدية لليوم' : 'Cash Outflows'}</h4>
            ${cashExpenses.length === 0 ? `<p style="color: var(--text-muted);">${I18N.t('noData')}</p>` : `
              <div class="table-responsive">
                <table class="data-table">
                  <tbody>
                    ${cashExpenses.map(e => `
                      <tr>
                        <td><span class="badge badge-navy">${e.expense_number}</span></td>
                        <td>${e.description}</td>
                        <td style="color: var(--accent-danger); font-weight: 700;">-${Number(e.amount).toLocaleString('ar-EG')} ج.م</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-danger); padding: 1.5rem;">${e.message}</div>`;
    }
  },

  switchTab(tabId, btn) {
    document.querySelectorAll('.exp-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');

    if (tabId === 'tabTreasury') {
      this.loadTreasury();
    }
  },

  openCreateExpenseModal() {
    const html = `
      <form id="expCreateForm" class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'بيان المصروف بالتفصيل *' : 'Description *'}</label>
          <input type="text" id="expDesc" class="form-input" required placeholder="مثال: فاتورة كهرباء الدور الثالث، شراء كيماويات معمل">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'بند المصروف *' : 'Expense Category *'}</label>
          <select id="expCategory" class="form-select">
            <option value="Rent">إيجار المقرات والقاعات</option>
            <option value="Utilities">مرافق وفواتير (كهرباء/مياه/إنترنت)</option>
            <option value="Marketing">تسويق وإعلانات ممولة</option>
            <option value="Supplies">مستلزمات طبية ومعملية ومطبوعات</option>
            <option value="Maintenance">صيانة دورية ونظافة</option>
            <option value="Salaries">رواتب ومكافآت الموظفين</option>
            <option value="Equipment">أجهزة ومعدات</option>
            <option value="Hospitality">ضيافة وبوفيه</option>
            <option value="Other">نثريات ومصروفات أخرى</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('amount')} (ج.م) *</label>
          <input type="number" id="expAmount" class="form-input" required min="1" placeholder="2500">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('paymentMethod')}</label>
          <select id="expMethod" class="form-select">
            <option value="Cash">نقدياً من الخزينة (Cash)</option>
            <option value="Bank_Transfer">تحويل بنكي (Bank Transfer)</option>
            <option value="Card">فيزا / بطاقة المركز (Card)</option>
            <option value="InstaPay">InstaPay (إنستاباي)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الجهة المستفيدة / المورد' : 'Vendor'}</label>
          <input type="text" id="expVendor" class="form-input" placeholder="اسم الشركة أو المورد">
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'تسجيل سند صرف مالي جديد' : 'Record New Expense',
      html,
      async () => {
        const desc = document.getElementById('expDesc').value.trim();
        const amount = parseFloat(document.getElementById('expAmount').value) || 0;
        if (!desc || amount <= 0) {
          showToast(I18N.currentLang === 'ar' ? 'يرجى إدخال بيان المصروف والمبلغ' : 'Description and amount required', 'warning');
          throw new Error('Validation error');
        }

        const body = {
          description: desc,
          category: document.getElementById('expCategory').value,
          amount,
          payment_method: document.getElementById('expMethod').value,
          vendor: document.getElementById('expVendor').value.trim() || null
        };

        const res = await API.post('/api/expenses', body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        ExpensesView.loadExpenses();
      },
      I18N.t('save')
    );
  },

  openCloseTreasuryModal() {
    const html = `
      <form id="closeTreasuryForm" class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الرصيد الفعلي بعد الجرد اليدوي (ج.م) *' : 'Actual Cash Counted (EGP) *'}</label>
          <input type="number" id="actualCloseAmount" class="form-input" required min="0" placeholder="المبلغ الفعلي الموجود في الدرج">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'ملاحظات الجرد والمطابقة' : 'Reconciliation Notes'}</label>
          <textarea id="closeNotes" class="form-textarea" placeholder="تم الجرد الفعلي ومطابقة الإيصالات..."></textarea>
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'إغلاق الخزينة اليومية ومطابقة النقدية' : 'Reconcile & Close Cash Register',
      html,
      async () => {
        const actual = parseFloat(document.getElementById('actualCloseAmount').value) || 0;
        const notes = document.getElementById('closeNotes').value.trim();

        const res = await API.post('/api/expenses/treasury/close', {
          actual_closing: actual,
          notes: notes || null
        });

        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        ExpensesView.switchTab('tabTreasury', document.querySelectorAll('.tab-btn')[1]);
      },
      I18N.currentLang === 'ar' ? 'اعتماد إغلاق الخزينة' : 'Confirm Close'
    );
  },

  async deleteExpense(expenseId, expenseNumber) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف سند الصرف رقم "${expenseNumber || ''}" نهائياً؟`
      : `Are you sure you want to delete expense voucher "${expenseNumber || ''}"?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/expenses/${expenseId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف سند الصرف بنجاح', 'success');
      this.loadExpenses();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};
