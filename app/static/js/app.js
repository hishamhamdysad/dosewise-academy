/**
 * DoseWise Academy - Core App Controller & Router
 * State Management, Role Security, Theme, Language & Global Modals
 */

const App = {
  currentUser: null,
  currentRoute: 'dashboard',

  async init() {
    // 1. Initialize Theme
    const savedTheme = localStorage.getItem('dosewise_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButtonIcon(savedTheme);

    // 2. Initialize Language
    I18N.setLang(I18N.currentLang);

    // 3. Setup Keyboard Shortcuts (Ctrl+K for global search)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) searchInput.focus();
      }
    });

    // 4. Check Authentication
    try {
      const user = await API.get('/api/auth/me');
      this.currentUser = user;
      this.renderAppShell();
      this.navigate(this.currentRoute);
      this.loadNotificationsCount();
    } catch (e) {
      this.showLoginView();
    }
  },

  showLoginView() {
    document.getElementById('appShell').style.display = 'none';
    const loginContainer = document.getElementById('loginContainer');
    loginContainer.style.display = 'flex';
    loginContainer.innerHTML = `
      <div class="card" style="width: 100%; max-width: 440px; padding: 2.5rem; box-shadow: var(--shadow-lg); border-radius: var(--radius-xl); backdrop-filter: blur(10px);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <img src="/static/img/logo.svg" alt="DoseWise Academy" style="height: 65px; margin-bottom: 1rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.3rem;">
            ${I18N.t('loginTitle')}
          </h2>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">
            ${I18N.t('loginSubtitle')}
          </p>
        </div>

        <form id="loginForm" onsubmit="App.handleLogin(event)" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="form-group">
            <label class="form-label">${I18N.t('username')}</label>
            <input type="text" id="loginUsername" class="form-input" required placeholder="admin" value="admin" autocomplete="username">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('password')}</label>
            <input type="password" id="loginPassword" class="form-input" required placeholder="••••••••" value="Admin@123" autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-size: 1rem; margin-top: 0.5rem;" id="loginSubmitBtn">
            ${I18N.t('loginBtn')}
          </button>
        </form>

        <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); font-size: 0.78rem; color: var(--text-muted); text-align: center;">
          <div style="font-weight: 700; margin-bottom: 0.3rem;">حسابات الدخول التجريبية (Demo Roles):</div>
          <div>Admin: <code>admin</code> / <code>Admin@123</code></div>
          <div>Manager: <code>manager</code> / <code>Manager@123</code></div>
          <div>Accountant: <code>accountant</code> / <code>Account@123</code></div>
        </div>
      </div>
    `;
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.textContent = I18N.t('loading');

    try {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;

      const res = await API.post('/api/auth/login', { username, password });
      API.setToken(res.token);
      this.currentUser = res.user;

      showToast(I18N.currentLang === 'ar' ? `مرحباً بك د. ${res.user.full_name}` : `Welcome ${res.user.full_name}`, 'success');

      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('appShell').style.display = 'flex';
      this.renderAppShell();
      this.navigate('dashboard');
      this.loadNotificationsCount();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = I18N.t('loginBtn');
    }
  },

  async logout() {
    try {
      await API.post('/api/auth/logout');
    } catch(e) {}
    API.setToken(null);
    this.currentUser = null;
    this.showLoginView();
  },

  renderAppShell() {
    const shell = document.getElementById('appShell');
    shell.style.display = 'flex';

    // Sidebar items based on roles
    const role = this.currentUser ? this.currentUser.role : 'receptionist';
    const isSuperAdmin = role === 'super_admin';
    const isManager = role === 'center_manager' || isSuperAdmin;
    const isAccountant = role === 'accountant' || isSuperAdmin;

    const clearBtn = document.getElementById('clearDataNavBtn');
    if (clearBtn) {
      clearBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
    }

    document.getElementById('sidebarNav').innerHTML = `
      <div class="sidebar-category">${I18N.t('navMain')}</div>
      <a class="nav-item ${this.currentRoute === 'dashboard' ? 'active' : ''}" onclick="App.navigate('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
        <span>${I18N.t('dashboard')}</span>
      </a>
      <a class="nav-item ${this.currentRoute === 'students' ? 'active' : ''}" onclick="App.navigate('students')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>${I18N.t('students')}</span>
      </a>
      <a class="nav-item ${this.currentRoute === 'leads' ? 'active' : ''}" onclick="App.navigate('leads')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
        <span>${I18N.t('leads')}</span>
      </a>

      <div class="sidebar-category">${I18N.t('navAcademic')}</div>
      <a class="nav-item ${this.currentRoute === 'courses' ? 'active' : ''}" onclick="App.navigate('courses')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>${I18N.t('courses')}</span>
      </a>
      <a class="nav-item ${this.currentRoute === 'groups' ? 'active' : ''}" onclick="App.navigate('groups')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${I18N.t('groups')}</span>
      </a>
      <a class="nav-item ${this.currentRoute === 'calendar' ? 'active' : ''}" onclick="App.navigate('calendar')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${I18N.t('calendar')}</span>
      </a>
      <a class="nav-item ${this.currentRoute === 'attendance' ? 'active' : ''}" onclick="App.navigate('attendance')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>${I18N.t('attendance')}</span>
      </a>
      <a class="nav-item ${this.currentRoute === 'assessments' ? 'active' : ''}" onclick="App.navigate('assessments')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <span>${I18N.t('assessments')}</span>
      </a>

      <div class="sidebar-category">${I18N.t('navFinancial')}</div>
      <a class="nav-item ${this.currentRoute === 'finance' ? 'active' : ''}" onclick="App.navigate('finance')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <span>${I18N.t('finance')}</span>
      </a>
      ${isAccountant || isManager ? `
        <a class="nav-item ${this.currentRoute === 'expenses' ? 'active' : ''}" onclick="App.navigate('expenses')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span>${I18N.t('expenses')}</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'trainers' ? 'active' : ''}" onclick="App.navigate('trainers')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>${I18N.t('trainers')}</span>
        </a>
      ` : ''}

      <div class="sidebar-category">${I18N.t('navSystem')}</div>
      ${isManager ? `
        <a class="nav-item ${this.currentRoute === 'reports' ? 'active' : ''}" onclick="App.navigate('reports')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          <span>${I18N.t('reports')}</span>
        </a>
      ` : ''}
      ${isSuperAdmin ? `
        <a class="nav-item ${this.currentRoute === 'users' ? 'active' : ''}" onclick="App.navigate('users')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <span>${I18N.t('users')}</span>
        </a>
        <a class="nav-item ${this.currentRoute === 'audit' ? 'active' : ''}" onclick="App.navigate('audit')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>${I18N.t('audit')}</span>
        </a>
        <a class="nav-item" onclick="App.openClearDataModal()" style="color: var(--accent-danger);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <span>${I18N.currentLang === 'ar' ? 'تفريغ الدامي داتا' : 'Clear Dummy Data'}</span>
        </a>
      ` : ''}
    `;

    // User profile in sidebar footer
    if (this.currentUser) {
      document.getElementById('sidebarUserAvatar').textContent = this.currentUser.full_name ? this.currentUser.full_name.slice(0, 2) : 'DW';
      document.getElementById('sidebarUserName').textContent = this.currentUser.full_name;
      document.getElementById('sidebarUserRole').textContent = this.currentUser.role_label_ar || this.currentUser.role;
    }
  },

  navigate(route) {
    this.currentRoute = route;
    // Update active class in sidebar
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Close sidebar on mobile
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Route switch
    switch (route) {
      case 'dashboard':
        DashboardView.render();
        break;
      case 'students':
        StudentsView.render();
        break;
      case 'courses':
        CoursesView.render();
        break;
      case 'groups':
        GroupsView.render();
        break;
      case 'calendar':
        CalendarView.render();
        break;
      case 'trainers':
        TrainersView.render();
        break;
      case 'attendance':
        AttendanceView.render();
        break;
      case 'finance':
        FinanceView.render();
        break;
      case 'expenses':
        ExpensesView.render();
        break;
      case 'leads':
        LeadsView.render();
        break;
      case 'assessments':
        AssessmentsView.render();
        break;
      case 'reports':
        ReportsView.render();
        break;
      case 'users':
        UsersView.render();
        break;
      case 'audit':
        AuditView.render();
        break;
      default:
        DashboardView.render();
    }

    this.renderAppShell();
  },

  refreshCurrentView() {
    this.navigate(this.currentRoute);
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dosewise_theme', newTheme);
    this.updateThemeButtonIcon(newTheme);
  },

  updateThemeButtonIcon(theme) {
    const iconBtn = document.getElementById('themeToggleBtn');
    if (iconBtn) {
      iconBtn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  async loadNotificationsCount() {
    try {
      const res = await API.get('/api/notifications', { is_read: 0 });
      const count = res.unread_count || 0;
      const dot = document.getElementById('notificationDot');
      if (dot) {
        dot.style.display = count > 0 ? 'block' : 'none';
      }
    } catch(e) {}
  },

  async openNotificationsDrawer() {
    try {
      const res = await API.get('/api/notifications');
      const list = res.notifications || [];

      const rows = list.map(n => `
        <div style="padding: 0.85rem; background: ${n.is_read ? 'var(--bg-body)' : 'rgba(13, 148, 136, 0.08)'}; border-radius: var(--radius-md); margin-bottom: 0.6rem; border-inline-start: 4px solid ${n.priority==='critical'?'var(--accent-danger)':(n.priority==='high'?'var(--accent-warning)':'var(--brand-turquoise)')};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
            <strong style="font-size: 0.9rem; color: var(--text-main);">${n.title_ar}</strong>
            <span class="badge ${n.priority==='critical'?'badge-danger':(n.priority==='high'?'badge-warning':'badge-info')}">${n.priority}</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">${n.message_ar}</p>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem; display: flex; justify-content: space-between;">
            <span>${n.created_at.slice(0, 10)}</span>
            ${!n.is_read ? `<button class="btn btn-sm btn-secondary" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;" onclick="App.markNotifRead(${n.id})">تحديد كمقروء</button>` : ''}
          </div>
        </div>
      `).join('');

      openModal(
        I18N.currentLang === 'ar' ? 'مركز التنبيهات والإشعارات الإدارية' : 'Notifications Center',
        list.length === 0 ? `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">${I18N.t('noData')}</p>` : `<div style="max-height: 60vh; overflow-y: auto;">${rows}</div>`,
        async () => {
          await API.put('/api/notifications/read-all');
          App.loadNotificationsCount();
        },
        I18N.currentLang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All Read'
      );
    } catch(e) {
      showToast(e.message, 'error');
    }
  },

  async markNotifRead(id) {
    try {
      await API.put(`/api/notifications/${id}/read`);
      this.loadNotificationsCount();
      closeModal();
      this.openNotificationsDrawer();
    } catch(e) {}
  },

  handleGlobalSearch(query) {
    if (!query || query.trim().length < 2) return;
    StudentsView.searchQuery = query.trim();
    this.navigate('students');
  },

  async openClearDataModal() {
    try {
      const statsRes = await API.get('/api/system/database-stats');
      const stats = statsRes.stats || {};
      const totalRec = statsRes.total_operational_records || 0;

      const statsRows = Object.keys(stats).filter(k => k !== 'users').map(k => `
        <div style="display: flex; justify-content: space-between; padding: 0.4rem 0.6rem; background: var(--bg-body); border-radius: var(--radius-sm); font-size: 0.85rem;">
          <span>${stats[k].label}</span>
          <strong style="color: var(--brand-turquoise);">${stats[k].count}</strong>
        </div>
      `).join('');

      const html = `
        <div style="padding: 0.5rem 0;">
          <div style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border-inline-start: 4px solid var(--accent-danger); margin-bottom: 1.25rem;">
            <div style="font-weight: 800; color: var(--accent-danger); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ${I18N.currentLang === 'ar' ? 'تحذير تصفير وتفريغ قاعدة البيانات' : 'System Reset & Data Purge Warning'}
            </div>
            <p style="font-size: 0.88rem; color: var(--text-main); margin: 0; line-height: 1.6;">
              ${I18N.currentLang === 'ar' 
                ? 'سيؤدي هذا الإجراء إلى حذف وتفريغ كافة البيانات التجريبية (الدامي داتا) بالكامل: الطلاب، الدورات، المجموعات، الحصص، الحضور، الإيصالات المالية، الأقساط، والمصروفات. سيتم الاحتفاظ بحسابات المستخدمين والمدير للبدء بقاعدة بيانات نظيفة وجديدة تماماً.'
                : 'This action will completely purge all dummy/operational data: students, courses, groups, sessions, attendance, payments, installments, and expenses. Admin accounts will be preserved.'}
            </p>
          </div>

          <div style="font-weight: 700; margin-bottom: 0.5rem; font-size: 0.9rem;">
            ${I18N.currentLang === 'ar' ? `البيانات الحالية التي سيتم حذفها (إجمالي: ${totalRec} سجل):` : `Records to be purged (Total: ${totalRec}):`}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; max-height: 180px; overflow-y: auto; margin-bottom: 1.25rem;">
            ${statsRows}
          </div>

          <div style="padding: 0.75rem; background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-md); font-size: 0.82rem; color: var(--text-secondary); text-align: center;">
            ${I18N.currentLang === 'ar' 
              ? 'هل أنت متأكد من المتابعة وحذف هذه البيانات والبدء ببياناتكم الفعلية؟' 
              : 'Are you sure you want to proceed and start with a fresh clean database?'}
          </div>
        </div>
      `;

      openModal(
        I18N.currentLang === 'ar' ? 'تفريغ وحذف الدامي داتا (مسح البيانات التجريبية)' : 'Clear Dummy Data & Reset',
        html,
        async () => {
          const res = await API.post('/api/system/clear-dummy-data');
          showToast(res.message[I18N.currentLang] || res.message.ar, 'success');
          App.navigate(App.currentRoute);
        },
        I18N.currentLang === 'ar' ? 'نعم، حذف وتفريغ كافة البيانات التجريبية' : 'Yes, Purge All Data'
      );
    } catch(e) {
      showToast(e.message, 'error');
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
