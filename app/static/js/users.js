/**
 * DoseWise Academy - Users & Audit Trail Modules
 */

const UsersView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('users')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${I18N.t('users')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'إدارة حسابات طاقم العمل، الصلاحيات والأدوار التشغيلية' : 'Staff accounts, permissions and role-based access'}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="UsersView.openCreateUserModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${I18N.currentLang === 'ar' ? 'إضافة مستخدم جديد' : 'New User'}
        </button>
      </div>

      <div class="card" id="usersTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadUsers();
  },

  async loadUsers() {
    const container = document.getElementById('usersTableContainer');
    try {
      const res = await API.get('/api/auth/users');
      const users = res.users || [];

      const rows = users.map(u => `
        <tr>
          <td><strong>${u.full_name}</strong></td>
          <td><span class="badge badge-navy">${u.username}</span></td>
          <td>${u.email}</td>
          <td><span class="badge badge-info">${u.role_label_ar || u.role}</span></td>
          <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'نشط (Active)' : 'معطل'}</span></td>
          <td>${u.last_login ? u.last_login.slice(0, 16).replace('T', ' ') : '-'}</td>
          <td>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <button class="btn btn-sm btn-primary" onclick="UsersView.openEditUserModal(${u.id})" title="${I18N.t('edit')}" style="padding: 0.35rem 0.6rem; font-size: 0.78rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>${I18N.t('edit')}</span>
              </button>
              <button class="btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-success'}" onclick="UsersView.toggleStatus(${u.id}, ${!u.is_active})" title="${u.is_active ? (I18N.currentLang === 'ar' ? 'تعطيل الحساب' : 'Deactivate') : (I18N.currentLang === 'ar' ? 'تفعيل الحساب' : 'Activate')}" style="padding: 0.35rem 0.55rem; font-size: 0.78rem;">
                ${u.is_active ? (I18N.currentLang === 'ar' ? 'تعطيل' : 'Deactivate') : (I18N.currentLang === 'ar' ? 'تفعيل' : 'Activate')}
              </button>
              <button class="btn btn-sm btn-danger" onclick="UsersView.deleteUser(${u.id}, '${u.username}')" title="${I18N.t('delete')}" style="padding: 0.35rem 0.55rem; font-size: 0.78rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                <span>${I18N.t('delete')}</span>
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
                <th>${I18N.t('name')}</th>
                <th>${I18N.t('username')}</th>
                <th>${I18N.t('email')}</th>
                <th>${I18N.currentLang === 'ar' ? 'الدور والصلاحية' : 'Role'}</th>
                <th>${I18N.t('status')}</th>
                <th>${I18N.currentLang === 'ar' ? 'آخر تسجيل دخول' : 'Last Login'}</th>
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

  openCreateUserModal() {
    const html = `
      <form id="userCreateForm" class="form-grid">
        <div class="form-group">
          <label class="form-label">${I18N.t('name')} *</label>
          <input type="text" id="usrFullName" class="form-input" required placeholder="أ. محمود حسان">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('username')} *</label>
          <input type="text" id="usrUsername" class="form-input" required placeholder="m.hassan">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('email')} *</label>
          <input type="email" id="usrEmail" class="form-input" required placeholder="staff@dosewise.edu.eg">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('password')} *</label>
          <input type="password" id="usrPassword" class="form-input" required minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.currentLang === 'ar' ? 'الدور التشغيلي (الصلاحيات)' : 'Role'} *</label>
          <select id="usrRole" class="form-select">
            <option value="super_admin">مدير عام النظام (Super Admin)</option>
            <option value="center_manager">مدير المركز (Center Manager)</option>
            <option value="receptionist" selected>موظف استقبال (Receptionist)</option>
            <option value="accountant">محاسب مالي (Accountant)</option>
            <option value="trainer">محاضر / مدرب (Trainer)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${I18N.t('phone')}</label>
          <input type="text" id="usrPhone" class="form-input" placeholder="010...">
        </div>
      </form>
    `;

    openModal(
      I18N.currentLang === 'ar' ? 'إنشاء حساب مستخدم جديد' : 'New User Account',
      html,
      async () => {
        const body = {
          full_name: document.getElementById('usrFullName').value.trim(),
          username: document.getElementById('usrUsername').value.trim(),
          email: document.getElementById('usrEmail').value.trim(),
          password: document.getElementById('usrPassword').value,
          role: document.getElementById('usrRole').value,
          phone: document.getElementById('usrPhone').value.trim() || null
        };

        const res = await API.post('/api/auth/users', body);
        showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
        UsersView.loadUsers();
      },
      I18N.t('save')
    );
  },

  async openEditUserModal(userId) {
    try {
      const res = await API.get(`/api/auth/users/${userId}`);
      const u = res.user;
      if (!u) throw new Error(I18N.currentLang === 'ar' ? 'المستخدم غير موجود' : 'User not found');

      const html = `
        <form id="userEditForm" class="form-grid">
          <div class="form-group">
            <label class="form-label">${I18N.t('name')} *</label>
            <input type="text" id="editUsrFullName" class="form-input" required value="${u.full_name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('username')} *</label>
            <input type="text" id="editUsrUsername" class="form-input" required value="${u.username || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('email')} *</label>
            <input type="email" id="editUsrEmail" class="form-input" required value="${u.email || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.currentLang === 'ar' ? 'الدور التشغيلي (الصلاحيات)' : 'Role'} *</label>
            <select id="editUsrRole" class="form-select">
              <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>مدير عام النظام (Super Admin)</option>
              <option value="center_manager" ${u.role === 'center_manager' ? 'selected' : ''}>مدير المركز (Center Manager)</option>
              <option value="receptionist" ${u.role === 'receptionist' ? 'selected' : ''}>موظف استقبال (Receptionist)</option>
              <option value="accountant" ${u.role === 'accountant' ? 'selected' : ''}>محاسب مالي (Accountant)</option>
              <option value="trainer" ${u.role === 'trainer' ? 'selected' : ''}>محاضر / مدرب (Trainer)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('phone')}</label>
            <input type="text" id="editUsrPhone" class="form-input" value="${u.phone || ''}" placeholder="010...">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('status')}</label>
            <select id="editUsrStatus" class="form-select">
              <option value="1" ${u.is_active ? 'selected' : ''}>${I18N.currentLang === 'ar' ? 'نشط ومفعل (Active)' : 'Active'}</option>
              <option value="0" ${!u.is_active ? 'selected' : ''}>${I18N.currentLang === 'ar' ? 'معطل وموقوف (Inactive)' : 'Inactive'}</option>
            </select>
          </div>
          <div class="form-group full-width" style="margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>${I18N.currentLang === 'ar' ? 'تعديل كلمة المرور (اختياري)' : 'Reset Password (Optional)'}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${I18N.currentLang === 'ar' ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية' : 'Leave empty to keep unchanged'}</span>
            </label>
            <input type="password" id="editUsrPassword" class="form-input" placeholder="${I18N.currentLang === 'ar' ? 'أدخل كلمة مرور جديدة إذا رغبت في إعادة تعيينها...' : 'Enter new password if you want to reset...'}">
          </div>
        </form>
      `;

      openModal(
        I18N.currentLang === 'ar' ? `تعديل بيانات المستخدم: ${u.full_name}` : `Edit User: ${u.full_name}`,
        html,
        async () => {
          const body = {
            full_name: document.getElementById('editUsrFullName').value.trim(),
            username: document.getElementById('editUsrUsername').value.trim(),
            email: document.getElementById('editUsrEmail').value.trim(),
            role: document.getElementById('editUsrRole').value,
            phone: document.getElementById('editUsrPhone').value.trim() || null,
            is_active: document.getElementById('editUsrStatus').value === '1',
            password: document.getElementById('editUsrPassword').value.trim() || null
          };

          const updateRes = await API.put(`/api/auth/users/${userId}`, body);
          showToast(updateRes.message ? (updateRes.message[I18N.currentLang] || updateRes.message.ar) : 'تم تحديث بيانات المستخدم بنجاح', 'success');
          UsersView.loadUsers();
        },
        I18N.t('save')
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async toggleStatus(userId, activate) {
    try {
      await API.put(`/api/auth/users/${userId}/status?is_active=${activate}`);
      showToast(I18N.currentLang === 'ar' ? 'تم تحديث حالة المستخدم' : 'Status updated', 'success');
      UsersView.loadUsers();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteUser(userId, username) {
    const promptMsg = I18N.currentLang === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف حساب المستخدم "${username || ''}" نهائياً؟`
      : `Are you sure you want to delete user account "${username || ''}"?`;
    if (!confirm(promptMsg)) return;

    try {
      const res = await API.delete(`/api/auth/users/${userId}`);
      showToast(res.message ? (res.message[I18N.currentLang] || res.message.ar) : 'تم حذف المستخدم بنجاح', 'success');
      UsersView.loadUsers();
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};

const AuditView = {
  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('audit')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            ${I18N.t('audit')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'سجل الرقابة والتتبع الزمني لجميع العمليات الحساسة والتغييرات بالنظام' : 'Chronological audit trail for system operations and sensitive changes'}</p>
        </div>
      </div>

      <div class="card" id="auditTableContainer">
        <div style="text-align: center; padding: 2rem;">${I18N.t('loading')}</div>
      </div>
    `;

    await this.loadLogs();
  },

  async loadLogs() {
    const container = document.getElementById('auditTableContainer');
    try {
      const res = await API.get('/api/audit', { limit: 60 });
      const logs = res.logs || [];

      if (logs.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">${I18N.t('noData')}</div>`;
        return;
      }

      const rows = logs.map(l => `
        <tr>
          <td><span class="badge badge-navy">${l.action}</span></td>
          <td><strong>${l.username || 'System'}</strong></td>
          <td><span class="badge badge-info">${l.entity_type}</span></td>
          <td style="font-family: monospace;">${l.entity_id || '-'}</td>
          <td>${l.details || '-'}</td>
          <td dir="ltr" style="font-size: 0.78rem; color: var(--text-muted);">${l.created_at.slice(0, 19).replace('T', ' ')}</td>
        </tr>
      `).join('');

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${I18N.currentLang === 'ar' ? 'الإجراء' : 'Action'}</th>
                <th>${I18N.currentLang === 'ar' ? 'المستخدم' : 'User'}</th>
                <th>${I18N.currentLang === 'ar' ? 'نوع الكيان' : 'Entity'}</th>
                <th>${I18N.currentLang === 'ar' ? 'معرف الكيان' : 'ID'}</th>
                <th>${I18N.currentLang === 'ar' ? 'تفاصيل العملية' : 'Details'}</th>
                <th>${I18N.t('date')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-danger); padding: 1.5rem;">${e.message}</div>`;
    }
  }
};
