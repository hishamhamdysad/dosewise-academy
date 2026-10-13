import sqlite3
import json
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.config import DB_PATH

def get_db_connection() -> sqlite3.Connection:
    """Creates a configured connection to the SQLite database with WAL mode and foreign keys enabled."""
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def db_transaction():
    """Context manager for atomic database transactions."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def query_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Executes a SELECT query and returns all matching rows as Python dictionaries."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def query_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Executes a SELECT query and returns the single matching row as a dictionary, or None."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def execute_insert(query: str, params: tuple = ()) -> int:
    """Executes an INSERT statement and returns the last inserted row ID."""
    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute(query, params)
        return cur.lastrowid

def execute_update(query: str, params: tuple = ()) -> int:
    """Executes an UPDATE/DELETE statement and returns the number of affected rows."""
    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute(query, params)
        return cur.rowcount

def init_db():
    """Initializes all database tables, constraints, indices, and triggers."""
    with db_transaction() as conn:
        cur = conn.cursor()

        # 1. Users table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL,
            phone TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            last_login TEXT
        );
        """)

        # 2. Students table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_code TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            full_name_en TEXT,
            profile_photo TEXT,
            national_id TEXT UNIQUE,
            mobile_number TEXT NOT NULL,
            whatsapp_number TEXT,
            email TEXT,
            date_of_birth TEXT,
            gender TEXT,
            address TEXT,
            qualification TEXT,
            registration_date TEXT NOT NULL,
            emergency_name TEXT,
            emergency_phone TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'Active', -- Lead, Active, Suspended, Completed, Withdrawn
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 3. Courses table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name_ar TEXT NOT NULL,
            name_en TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            level TEXT NOT NULL DEFAULT 'Intermediate', -- Beginner, Intermediate, Advanced
            training_type TEXT NOT NULL DEFAULT 'In-person', -- In-person, Online, Hybrid
            total_hours INTEGER NOT NULL DEFAULT 30,
            sessions_count INTEGER NOT NULL DEFAULT 10,
            standard_price REAL NOT NULL DEFAULT 0.0,
            min_capacity INTEGER NOT NULL DEFAULT 5,
            max_capacity INTEGER NOT NULL DEFAULT 25,
            prerequisites TEXT,
            materials TEXT,
            status TEXT NOT NULL DEFAULT 'Active', -- Draft, Active, Archived
            created_at TEXT NOT NULL
        );
        """)

        # 4. Trainers table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS trainers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trainer_code TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            photo TEXT,
            mobile TEXT NOT NULL,
            email TEXT,
            specialization TEXT NOT NULL,
            qualifications TEXT,
            compensation_model TEXT NOT NULL DEFAULT 'session_fee', -- fixed_salary, session_fee, hourly_rate, revenue_percentage, fixed_course
            compensation_rate REAL NOT NULL DEFAULT 0.0,
            contract_info TEXT,
            status TEXT NOT NULL DEFAULT 'Active', -- Active, Inactive, On_Leave
            created_at TEXT NOT NULL
        );
        """)

        # 5. Training Groups table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS training_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_code TEXT UNIQUE NOT NULL,
            group_name TEXT NOT NULL,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
            trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            days_of_week TEXT NOT NULL, -- JSON array e.g. ["Sun", "Tue", "Thu"]
            start_time TEXT NOT NULL,   -- e.g. "17:00"
            end_time TEXT NOT NULL,     -- e.g. "20:00"
            classroom_name TEXT NOT NULL DEFAULT 'قاعة أ (Hall A)',
            capacity INTEGER NOT NULL DEFAULT 20,
            group_price REAL, -- If null, uses course.standard_price
            status TEXT NOT NULL DEFAULT 'Active', -- Upcoming, Active, Completed, Cancelled
            created_at TEXT NOT NULL
        );
        """)

        # 6. Sessions table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL REFERENCES training_groups(id) ON DELETE CASCADE,
            session_number INTEGER NOT NULL,
            session_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            classroom_name TEXT NOT NULL,
            trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
            status TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, Rescheduled
            notes TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(group_id, session_number)
        );
        """)

        # 7. Enrollments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
            group_id INTEGER NOT NULL REFERENCES training_groups(id) ON DELETE RESTRICT,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
            enrollment_date TEXT NOT NULL,
            original_price REAL NOT NULL,
            discount_amount REAL NOT NULL DEFAULT 0.0,
            discount_type TEXT NOT NULL DEFAULT 'none', -- none, fixed, percentage, scholarship
            discount_reason TEXT,
            final_price REAL NOT NULL,
            total_paid REAL NOT NULL DEFAULT 0.0,
            balance_due REAL NOT NULL DEFAULT 0.0,
            payment_status TEXT NOT NULL DEFAULT 'Unpaid', -- Unpaid, Partial, Paid, Refunded
            enrollment_status TEXT NOT NULL DEFAULT 'Active', -- Active, Completed, Dropped, Suspended
            created_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL,
            UNIQUE(student_id, group_id)
        );
        """)

        # 8. Installments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS installments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
            installment_number INTEGER NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Paid, Overdue, Cancelled
            paid_amount REAL NOT NULL DEFAULT 0.0,
            paid_at TEXT,
            notes TEXT
        );
        """)

        # 9. Payments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_number TEXT UNIQUE NOT NULL,
            transaction_id TEXT UNIQUE NOT NULL,
            enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
            amount REAL NOT NULL,
            payment_date TEXT NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'Cash', -- Cash, Bank_Transfer, Card, Vodafone_Cash, InstaPay
            reference_number TEXT,
            notes TEXT,
            recorded_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL
        );
        """)

        # 10. Refunds and Adjustments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS refunds_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            adjustment_number TEXT UNIQUE NOT NULL,
            payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
            enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
            type TEXT NOT NULL, -- Refund, Discount_Adjustment, Penalty
            amount REAL NOT NULL,
            reason TEXT NOT NULL,
            approved_by INTEGER REFERENCES users(id),
            recorded_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL
        );
        """)

        # 11. Attendance table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'Present', -- Present, Absent, Late, Excused
            notes TEXT,
            recorded_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL,
            UNIQUE(session_id, student_id)
        );
        """)

        # 12. Expenses table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_number TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL, -- Rent, Utilities, Marketing, Equipment, Salaries, Supplies, Maintenance, Other
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            expense_date TEXT NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'Cash',
            vendor TEXT,
            receipt_attachment TEXT,
            approval_status TEXT NOT NULL DEFAULT 'Approved', -- Pending, Approved, Rejected
            recorded_by INTEGER REFERENCES users(id),
            approved_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL
        );
        """)

        # 13. Cash Registers (Daily Treasury) table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS cash_registers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            register_date TEXT UNIQUE NOT NULL,
            opening_balance REAL NOT NULL DEFAULT 0.0,
            total_inflow REAL NOT NULL DEFAULT 0.0,
            total_outflow REAL NOT NULL DEFAULT 0.0,
            expected_closing REAL NOT NULL DEFAULT 0.0,
            actual_closing REAL,
            difference REAL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'Open', -- Open, Closed
            notes TEXT,
            closed_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL
        );
        """)

        # 14. Trainer Payouts table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS trainer_payouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payout_number TEXT UNIQUE NOT NULL,
            trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
            amount REAL NOT NULL,
            period_start TEXT,
            period_end TEXT,
            sessions_count INTEGER NOT NULL DEFAULT 0,
            compensation_model TEXT NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'Cash',
            reference_number TEXT,
            notes TEXT,
            paid_by INTEGER REFERENCES users(id),
            payment_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """)

        # 15. Leads (CRM) table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            whatsapp TEXT,
            email TEXT,
            interested_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
            source TEXT NOT NULL DEFAULT 'Facebook', -- Facebook, Instagram, TikTok, Referral, Walk_In, Website, Other
            inquiry_date TEXT NOT NULL,
            follow_up_date TEXT,
            assigned_to INTEGER REFERENCES users(id),
            status TEXT NOT NULL DEFAULT 'New', -- New, Contacted, Interested, Registered, Lost
            notes TEXT,
            converted_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL
        );
        """)

        # 16. Assessments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            group_id INTEGER REFERENCES training_groups(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            assessment_type TEXT NOT NULL DEFAULT 'Final', -- Midterm, Final, Practical, Quiz
            max_score REAL NOT NULL DEFAULT 100.0,
            passing_score REAL NOT NULL DEFAULT 70.0,
            assessment_date TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 17. Assessment Results table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS assessment_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            score REAL NOT NULL,
            is_passed INTEGER NOT NULL DEFAULT 0,
            feedback TEXT,
            recorded_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL,
            UNIQUE(assessment_id, student_id)
        );
        """)

        # 18. Certificates table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            certificate_code TEXT UNIQUE NOT NULL,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
            group_id INTEGER REFERENCES training_groups(id) ON DELETE SET NULL,
            issue_date TEXT NOT NULL,
            completion_date TEXT NOT NULL,
            grade_label TEXT NOT NULL DEFAULT 'امتياز (Distinction)',
            verification_hash TEXT NOT NULL,
            is_valid INTEGER NOT NULL DEFAULT 1,
            issued_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL
        );
        """)

        # 19. Notifications table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_ar TEXT NOT NULL,
            title_en TEXT NOT NULL,
            message_ar TEXT NOT NULL,
            message_en TEXT NOT NULL,
            notification_type TEXT NOT NULL, -- installment_due, overdue_payment, course_start, repeated_absence, capacity_warning, session_upcoming, trainer_payout
            priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
            related_entity_type TEXT,
            related_entity_id INTEGER,
            is_read INTEGER NOT NULL DEFAULT 0,
            read_at TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 20. Audit Logs table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            username TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 21. App Settings table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # Indices for optimal query performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile_number);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_enrollments_group ON enrollments(group_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_date, status);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);")

def log_audit(user_id: Optional[int], username: Optional[str], action: str, entity_type: str, entity_id: Any, details: Any, ip_address: str = "127.0.0.1"):
    """Helper to record audit trail entries atomically."""
    try:
        details_str = json.dumps(details, ensure_ascii=False) if isinstance(details, (dict, list)) else str(details)
        execute_insert(
            """
            INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, username or "System", action, entity_type, str(entity_id), details_str, ip_address, datetime.now().isoformat())
        )
    except Exception as e:
        print(f"Failed to record audit log: {e}")
