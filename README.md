# DoseWise Academy – Complete Training Center Management System
## نظام إدارة مركز التدريب الطبي والمهني المتكامل

A production-ready, database-driven web application for managing **DoseWise Academy** (أكاديمية دوز وايز للتدريب والاستشارات الطبية).

---

## 1. Brand Identity & Design System

- **Official Brand Colors**:
  - Primary: Deep Navy Blue (`#060D1A`, `#0A192F`, `#0F2342`)
  - Secondary: Vibrant Turquoise (`#0D9488`, `#14B8A6`) & Electric Cyan (`#06B6D4`, `#22D3EE`)
  - Neutral & Accents: Crisp White (`#FFFFFF`), Emerald (`#10B981`), Amber (`#F59E0B`), Rose (`#EF4444`)
- **Arabic-First Interface**: Complete RTL layout support with instant Arabic (`ar`) and English (`en`) language switching.
- **Modern Typography**: High-legibility Google Fonts (`Cairo` for Arabic, `Outfit` for English).
- **Themes**: Switchable Light Mode and Dark Mode with smooth micro-animations.
- **Egyptian Localization**:
  - Currency: Egyptian Pound (`ج.م` / `EGP`)
  - Dates: Egyptian Arabic locale (`12 أكتوبر 2026`)
  - Phone validation and 1-click WhatsApp web messaging links (`+20...`).

---

## 2. Default Access Accounts & Roles (RBAC)

The system includes 5 distinct operational roles with server-side authorization:

| Role | Username | Password | Full Name | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `Admin@123` | د. محمد الشناوي | Full system access, staff management, audit log, system settings |
| **Center Manager** | `manager` | `Manager@123` | أ. سارة عبد الرحمن | Operations, course approvals, reports, student admissions |
| **Receptionist** | `reception` | `Recept@123` | أ. نورهان محمود | Student registration, group enrollment, attendance, basic receipts |
| **Accountant** | `accountant` | `Account@123` | أ. أحمد فتحي | Full financials: collections, debts, installments, expenses, treasury |
| **Trainer** | `trainer` | `Trainer@123` | د. حسام البدري | Assigned courses, group rosters, attendance taking, exam grades |

---

## 3. Core Modules & Implemented Workflows

### 1. Main Dashboard (`لوحة التحكم`)
- Live KPI cards: Total registered students, active students, new registrations this month, active courses, training groups, trainers, today's sessions, attendance rate, collections today & this month, outstanding debts, trainer liabilities due, monthly expenses, and net operating result.
- Interactive SVG charts: Monthly revenue vs expenses trends, course popularity, attendance distribution, and collection performance.
- Operational live widgets: Today's scheduled sessions with instant attendance launch, overdue installments table with 1-click WhatsApp reminders.

### 2. Student Management (`إدارة الطلاب`)
- Full student CRUD with unique student code generation (`STU-2026-XXXX`).
- Anti-duplicate validation on National ID (14 digits) and Egyptian mobile numbers.
- Rich multi-tab student profile modal: Personal bio, enrolled courses, attendance records with calculated rate, payments ledger, installment schedule, and issued certificates.
- Export student list to Excel-compatible UTF-8 CSV with BOM.
- Printable official student profile & registration contract.

### 3. Courses Catalog (`الدورات التدريبية`)
- Course catalog with Arabic & English titles, codes (e.g. `CLIN-101`, `ANAL-303`, `COD-404`), category, level, hours, sessions count, standard pricing, and seat capacity.
- Tracking of seat availability, active groups count, and total course collections.

### 4. Training Groups & Scheduling (`المجموعات والجدول`)
- Course-to-group linkage with assigned trainer, start/end dates, days of the week, times, and classroom.
- **Automated Session Generation Engine**: Automatically creates all scheduled session records across future calendar dates based on selected weekdays.
- Seat occupancy progress bars and remaining sessions tracker.

### 5. Interactive Academic Calendar (`التقويم الدراسي`)
- Monthly interactive timetable grid.
- Color-coded session pill badges with quick attendance launch and tooltips.

### 6. Trainer Management & Transparent Compensation (`شؤون المحاضرين`)
- Comprehensive trainer directory with specialization and contact info.
- **Transparent Compensation Engine**: Supports 5 models:
  1. Fixed fee per session delivered (`session_fee`)
  2. Fixed monthly salary (`fixed_salary`)
  3. Hourly rate (`hourly_rate`)
  4. Percentage of course revenue (`revenue_percentage`)
  5. Fixed fee per entire course (`fixed_course`)
- Automated calculation of delivered sessions, total earned, total paid, and balance due.
- Payout voucher issuance with payment method, reference, and printable payout receipt.

### 7. Attendance Management (`الحضور والغياب`)
- Session roster taker with one-click toggles: Present (حاضر), Absent (غائب), Late (متأخر), Excused (مستأذن) with individual notes.
- Recorder staff tracking and audit trail.
- **Repeated Absence Alerts**: Automatically detects students with 3 or more absences across courses, triggering system alerts and direct WhatsApp reminders.

### 8. Payments, Installments & Debts (`المالية والتحصيل`)
- Full payments, partial payments, and customized installment plans.
- Unique receipt numbers (`RCP-2026-XXXX`) and transaction IDs (`TXN-2026-XXXX`).
- Payment methods: Cash, InstaPay, Visa / POS Card, Bank Transfer, Vodafone Cash.
- Traceable refunds and adjustment transactions (never silently deletes financial records).
- **Official Printable Receipts**: Complete with academy branding, QR/seal box, amounts in figures, and cashier signatures.
- Aging debts list with overdue flags and direct WhatsApp reminder links.

### 9. Expenses & Cash Management (`المصروفات والخزينة`)
- Expense categories: Rent, Utilities, Marketing, Equipment, Salaries, Supplies, Maintenance, Hospitality, and Other.
- Approval workflow for high-value expenses.
- **Daily Cash Register (خزينة المركز)**:
  - Opening cash balance
  - Automatic cash inflows (cash student payments)
  - Automatic cash outflows (cash expenses and cash trainer payouts)
  - Expected closing balance vs physical cash count
  - Daily cash reconciliation with discrepancy tracking.

### 10. CRM Leads & Marketing (`العملاء المحتملين`)
- Track prospective students, campaign sources (Facebook, Instagram, TikTok, Referral, Walk-in), and follow-up dates.
- One-click **"Convert to Student"** feature that creates a registered student record without retyping.
- Marketing conversion rate analytics.

### 11. Assessments & Certificates (`الاختبارات والشهادات`)
- Course assessments with max scores and passing marks.
- Roster grading interface.
- **Verifiable Certificate Issuance Engine**:
  - Enforces mandatory graduation criteria: Exam passed + Attendance rate >= 75% + Zero outstanding debt!
  - Generates verifiable certificate code (`DW-CERT-2026-XXXX`) with cryptographic hash.
  - Luxury diploma printable certificate template with gold border styling and official seal.
  - Public verification API (`/api/assessments/public/verify/{code}`).

### 12. Reports & Data Exports (`التقارير والإحصائيات`)
- Consolidated financial overview: Earned Revenue vs Cash Collections vs Operating Expenses vs Net Operating Profit.
- Course profitability statement.
- One-click Excel-compatible CSV exports for collections and students.

### 13. Notifications Center (`مركز التنبيهات`)
- Real-time in-app notification center for overdue installments, course start dates, trainer payouts pending, and repeated absences.
- Read / unread status with badge counters.

### 14. Audit Trail & Staff Accounts (`سجل العمليات والرقابة`)
- Chronological security audit log recording user, action, entity, timestamp, and details.
- User management for Super Admin.

---

## 4. Architecture & Technical Stack

- **Backend**: FastAPI (Python 3.13) with asynchronous ASGI architecture and Pydantic schema validation.
- **Database**: SQLite 3 with Write-Ahead Logging (`WAL` mode), foreign key constraints (`PRAGMA foreign_keys = ON`), and ACID transaction management.
- **Security**: Cryptographically secure PBKDF2-HMAC-SHA256 password hashing (100,000 iterations), HMAC-signed session tokens, and server-side RBAC dependencies.
- **Frontend**: Vanilla CSS Design System + Vanilla JavaScript modular architecture (no external node build step required, lightweight, ultra-fast load times).
- **Vector Branding**: High-resolution SVG vectors for DoseWise Academy logo, dark logo, and icon badge.

---

## 5. How to Run Locally

### Option A: One-Click Windows Launcher
Double-click `run.bat` in the project root directory. It will start the server and open your default browser to `http://127.0.0.1:8000`.

### Option B: Command Line (PowerShell / Terminal)
```powershell
# Navigate to the project directory
cd "c:\Users\LAPTOP\Downloads\DoseWise Academy"

# Start the application server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser at: **`http://127.0.0.1:8000`**

To re-seed or reset initial demo data:
```powershell
python -m app.seed_data
```

---

## 6. Project Structure

```
DoseWise Academy/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application entrypoint & routing
│   ├── config.py                # System settings, roles & paths
│   ├── database.py              # SQLite schema, indices, queries & audit logger
│   ├── auth.py                  # PBKDF2 hashing, JWT tokens & RBAC dependencies
│   ├── seed_data.py             # Rich database seeder with realistic Egyptian records
│   ├── routers/
│   │   ├── auth.py              # Login, logout, profile & staff accounts
│   │   ├── dashboard.py         # Live KPIs, aggregations & charts
│   │   ├── students.py          # Student CRUD, profile & CSV export
│   │   ├── courses.py           # Course catalog & pricing
│   │   ├── groups.py            # Groups, session scheduler & calendar events
│   │   ├── trainers.py          # Faculty & transparent compensation engine
│   │   ├── attendance.py        # Attendance taker & repeated absences
│   │   ├── finance.py           # Enrollment, installments, receipts & refunds
│   │   ├── expenses.py          # Expenses & daily cash register (treasury)
│   │   ├── leads.py             # CRM prospective students & conversion
│   │   ├── assessments.py       # Exams, grades & verifiable certificates
│   │   ├── reports.py           # Financial summaries & CSV reports
│   │   ├── notifications.py     # In-app alerts & badge counter
│   │   └── audit.py             # Audit trail browser
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css        # Complete UI design system (Navy/Turquoise, RTL/LTR)
│   │   ├── js/
│   │   │   ├── i18n.js          # Bilingual Arabic/English dictionary
│   │   │   ├── api.js           # Fetch API client, modals & toasts
│   │   │   ├── app.js           # Core SPA router, authentication & state
│   │   │   ├── dashboard.js     # Live KPI cards & interactive charts
│   │   │   ├── students.js      # Student directory & multi-tab profile
│   │   │   ├── courses.js       # Courses catalog & creation
│   │   │   ├── groups.js        # Groups & automatic session generator
│   │   │   ├── calendar.js      # Interactive monthly scheduling calendar
│   │   │   ├── trainers.js      # Trainers & payout vouchers
│   │   │   ├── attendance.js    # Session attendance roster
│   │   │   ├── finance.js       # Installment plans & official printable receipts
│   │   │   ├── expenses.js      # Expenses & daily cash register
│   │   │   ├── leads.js         # CRM pipeline & student conversion
│   │   │   ├── assessments.js   # Assessments & verifiable diploma certificate
│   │   │   ├── reports.js       # Consolidated financial reports & exports
│   │   │   └── users.js         # Staff accounts & audit viewer
│   │   └── img/
│   │       ├── logo.svg         # Primary DoseWise Academy vector logo
│   │       ├── logo-white.svg   # Dark mode logo variant
│   │       └── logo-icon.svg    # Standalone emblem badge
│   └── templates/
│       └── index.html           # Main HTML5 application shell
├── data/
│   └── dosewise.db              # SQLite relational database
├── Dockerfile                   # Multi-stage production container
├── render.yaml                  # Render.com automatic cloud deployment blueprint
├── Procfile                     # Process runner for Heroku / Render / Railway
├── runtime.txt                  # Python 3.11 runtime specification
├── asgi.py                      # Production ASGI entrypoint
├── requirements.txt             # Production Python dependencies
├── run.bat                      # One-click Windows runner
├── DEPLOYMENT_GUIDE.md          # Complete Arabic cloud deployment guide
└── README.md                    # System documentation
```
