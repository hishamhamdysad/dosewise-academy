/**
 * DoseWise Academy - Interactive Scheduling Calendar View
 * Monthly Grid, Session Tooltips, Direct Attendance & Conflict Preview
 */

const CalendarView = {
  currentDate: new Date(),

  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="breadcrumbs">
            <span>${I18N.t('appName')}</span>
            <span>/</span>
            <span>${I18N.t('calendar')}</span>
          </div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-turquoise)" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${I18N.t('calendar')}
          </h1>
          <p class="page-subtitle">${I18N.currentLang === 'ar' ? 'الجدول الزمني التفاعلي للمحاضرات، القاعات، ومواعيد المدربين' : 'Interactive timetable of training sessions, classrooms and trainers'}</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="CalendarView.prevMonth()">
            ${I18N.currentLang === 'ar' ? 'الشهر السابق' : 'Previous'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="CalendarView.today()">
            ${I18N.currentLang === 'ar' ? 'اليوم' : 'Today'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="CalendarView.nextMonth()">
            ${I18N.currentLang === 'ar' ? 'الشهر القادم' : 'Next'}
          </button>
        </div>
      </div>

      <div class="card" style="padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 id="calendarMonthTitle" style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);"></h2>
        </div>
        <div id="calendarGridWrapper">
          <div style="text-align: center; padding: 3rem;">${I18N.t('loading')}</div>
        </div>
      </div>
    `;

    await this.loadCalendar();
  },

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.loadCalendar();
  },

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.loadCalendar();
  },

  today() {
    this.currentDate = new Date();
    this.loadCalendar();
  },

  async loadCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const titleEl = document.getElementById('calendarMonthTitle');
    const arMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    titleEl.textContent = `${I18N.currentLang === 'ar' ? arMonths[month] : enMonths[month]} ${year}`;

    // Get first day of month and total days
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const lastDayDate = new Date(year, month + 1, 0).getDate();

    // Query events from backend
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate).padStart(2, '0')}`;

    const res = await API.get('/api/groups/calendar/events', { start: startStr, end: endStr });
    const events = res.events || [];

    // Map events by date YYYY-MM-DD
    const eventsByDate = {};
    events.forEach(ev => {
      if (!eventsByDate[ev.session_date]) eventsByDate[ev.session_date] = [];
      eventsByDate[ev.session_date].push(ev);
    });

    const dayHeaders = I18N.currentLang === 'ar' 
      ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let gridHtml = `
      <div class="calendar-grid">
        ${dayHeaders.map(dh => `<div class="calendar-header-day">${dh}</div>`).join('')}
    `;

    // Fill leading empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += `<div class="calendar-cell" style="background: var(--bg-body); opacity: 0.5;"></div>`;
    }

    // Fill month days
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let day = 1; day <= lastDayDate; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate[dateKey] || [];
      const isToday = dateKey === todayStr;

      gridHtml += `
        <div class="calendar-cell" style="${isToday ? 'border: 2px solid var(--brand-turquoise); background: rgba(13, 148, 136, 0.05);' : ''}">
          <div class="calendar-cell-date" style="${isToday ? 'color: var(--brand-turquoise); font-weight: 800;' : ''}">
            ${day} ${isToday ? `(${I18N.currentLang === 'ar' ? 'اليوم' : 'Today'})` : ''}
          </div>
          <div style="overflow-y: auto; max-height: 120px; display: flex; flex-direction: column; gap: 3px;">
            ${dayEvents.map(e => `
              <div class="calendar-event-tag" onclick="AttendanceView.openSessionRoster(${e.id})" title="${e.course_name_ar} - ${e.classroom_name} (${e.start_time})">
                <span style="font-weight: 800;">${e.start_time}</span> ${e.course_name_ar.slice(0, 15)}...
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    gridHtml += `</div>`;
    document.getElementById('calendarGridWrapper').innerHTML = gridHtml;
  }
};
