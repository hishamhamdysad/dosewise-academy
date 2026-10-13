/**
 * DoseWise Academy - Internationalization & Translation Dictionary
 * Arabic (Default) & English
 */

const I18N = {
  currentLang: localStorage.getItem('dosewise_lang') || 'ar',

  translations: {
    ar: {
      appName: "أكاديمية دوز وايز",
      appSubName: "نظام إدارة المراكز التدريبية المعتمدة",
      searchPlaceholder: "بحث شامل في الطلاب، الدورات، الإيصالات... (Ctrl+K)",
      currency: "ج.م",
      
      // Nav
      navMain: "الرئيسية والعمليات",
      navAcademic: "الشؤون الأكاديمية",
      navFinancial: "المالية والمحاسبة",
      navSystem: "النظام والتقارير",

      dashboard: "لوحة التحكم",
      students: "إدارة الطلاب",
      courses: "الدورات التدريبية",
      groups: "المجموعات والجدول",
      calendar: "التقويم الدراسي",
      trainers: "شؤون المحاضرين",
      attendance: "الحضور والغياب",
      finance: "المالية والتحصيل",
      expenses: "المصروفات والخزينة",
      leads: "العملاء المحتملين",
      assessments: "الاختبارات والشهادات",
      reports: "التقارير المالية والأكاديمية",
      audit: "سجل الرقابة والعمليات",
      users: "إدارة المستخدمين",
      
      // Common actions
      add: "إضافة جديد",
      save: "حفظ البيانات",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      view: "عرض التفاصيل",
      print: "طباعة المستند",
      export: "تصدير إلى Excel",
      actions: "الإجراءات",
      status: "الحالة",
      date: "التاريخ",
      amount: "المبلغ",
      notes: "ملاحظات",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      code: "الكود",
      name: "الاسم",
      all: "الكل",
      loading: "جاري التحميل...",
      noData: "لا توجد بيانات مسجلة حالياً",

      // Dashboard
      totalStudents: "إجمالي الطلاب",
      activeStudents: "الطلاب النشطون",
      newStudentsMonth: "تسجيلات الشهر الحالي",
      activeCourses: "الدورات النشطة",
      activeGroups: "المجموعات الحالية",
      totalTrainers: "المحاضرون المعتمدون",
      todaySessions: "محاضرات اليوم",
      attendanceRate: "نسبة الحضور الإجمالية",
      collectionsToday: "تحصيلات اليوم",
      collectionsMonth: "إجمالي تحصيلات الشهر",
      outstandingDebts: "الديون والمتبقيات",
      trainerLiabilities: "مستحقات المحاضرين",
      monthlyExpenses: "مصروفات الشهر",
      netOperatingResult: "صافي النتيجة التشغيلية",
      overdueInstallments: "أقساط متأخرة مستحقة",

      // Finance & Receipts
      receiptNumber: "رقم الإيصال",
      transactionNumber: "رقم المعاملة",
      paymentMethod: "طريقة السداد",
      balanceDue: "الرصيد المتبقي",
      totalPaid: "إجمالي المدفوع",
      finalPrice: "السعر النهائي",
      discount: "الخصم",
      installmentPlan: "جدول الأقساط",
      refund: "استرداد مالي",
      dailyTreasury: "الخزينة اليومية",

      // Roles
      super_admin: "مدير عام النظام",
      center_manager: "مدير المركز",
      receptionist: "موظف استقبال",
      accountant: "محاسب مالي",
      trainer: "محاضر / مدرب",

      // Auth
      loginTitle: "تسجيل الدخول للنظام",
      loginSubtitle: "أكاديمية دوز وايز لإدارة التدريب والتعليم الطبي",
      username: "اسم المستخدم أو البريد",
      password: "كلمة المرور",
      loginBtn: "دخول النظام",
      logout: "تسجيل خروج",
      welcome: "مرحباً بك",
      
      // Attendance
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      excused: "مستأذن"
    },

    en: {
      appName: "DoseWise Academy",
      appSubName: "Training Center Management System",
      searchPlaceholder: "Search students, courses, receipts... (Ctrl+K)",
      currency: "EGP",
      
      // Nav
      navMain: "Main Operations",
      navAcademic: "Academic Affairs",
      navFinancial: "Finance & Accounting",
      navSystem: "System & Reports",

      dashboard: "Dashboard",
      students: "Student Management",
      courses: "Courses Catalog",
      groups: "Training Groups",
      calendar: "Schedule & Calendar",
      trainers: "Trainers & Payroll",
      attendance: "Attendance Tracking",
      finance: "Payments & Installments",
      expenses: "Expenses & Treasury",
      leads: "CRM & Leads",
      assessments: "Exams & Certificates",
      reports: "Reports & Analytics",
      audit: "Audit Logs",
      users: "Staff & Users",

      // Common actions
      add: "Add New",
      save: "Save Changes",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      view: "View Details",
      print: "Print Document",
      export: "Export to Excel",
      actions: "Actions",
      status: "Status",
      date: "Date",
      amount: "Amount",
      notes: "Notes",
      phone: "Phone",
      email: "Email",
      code: "Code",
      name: "Name",
      all: "All",
      loading: "Loading...",
      noData: "No records found",

      // Dashboard
      totalStudents: "Total Students",
      activeStudents: "Active Students",
      newStudentsMonth: "New Registrations This Month",
      activeCourses: "Active Courses",
      activeGroups: "Training Groups",
      totalTrainers: "Trainers",
      todaySessions: "Today's Sessions",
      attendanceRate: "Attendance Rate",
      collectionsToday: "Collections Today",
      collectionsMonth: "Total Collections (Month)",
      outstandingDebts: "Outstanding Student Debts",
      trainerLiabilities: "Trainer Liabilities Due",
      monthlyExpenses: "Monthly Expenses",
      netOperatingResult: "Net Operating Result",
      overdueInstallments: "Overdue Installments",

      // Finance & Receipts
      receiptNumber: "Receipt Number",
      transactionNumber: "Transaction ID",
      paymentMethod: "Payment Method",
      balanceDue: "Remaining Balance",
      totalPaid: "Total Paid",
      finalPrice: "Final Price",
      discount: "Discount",
      installmentPlan: "Installment Schedule",
      refund: "Refund Transaction",
      dailyTreasury: "Daily Cash Treasury",

      // Roles
      super_admin: "Super Admin",
      center_manager: "Center Manager",
      receptionist: "Receptionist",
      accountant: "Accountant",
      trainer: "Trainer",

      // Auth
      loginTitle: "Sign In to System",
      loginSubtitle: "DoseWise Academy Healthcare Training Management",
      username: "Username or Email",
      password: "Password",
      loginBtn: "Sign In",
      logout: "Sign Out",
      welcome: "Welcome",

      // Attendance
      present: "Present",
      absent: "Absent",
      late: "Late",
      excused: "Excused"
    }
  },

  t(key) {
    const lang = this.currentLang;
    if (this.translations[lang] && this.translations[lang][key]) {
      return this.translations[lang][key];
    }
    return this.translations['ar'][key] || key;
  },

  setLang(lang) {
    if (lang === 'ar' || lang === 'en') {
      this.currentLang = lang;
      localStorage.setItem('dosewise_lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      
      // Update language switch button text
      const btn = document.getElementById('langSwitchBtn');
      if (btn) {
        btn.textContent = lang === 'ar' ? 'English' : 'العربية';
      }

      // Re-render currently active view
      if (window.App && window.App.refreshCurrentView) {
        window.App.refreshCurrentView();
      }
    }
  },

  toggleLang() {
    this.setLang(this.currentLang === 'ar' ? 'en' : 'ar');
  }
};
