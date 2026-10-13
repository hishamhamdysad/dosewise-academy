from datetime import datetime, timedelta
import json
import secrets
from app.database import init_db, db_transaction, query_one
from app.auth import hash_password
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST,
    ROLE_ACCOUNTANT, ROLE_TRAINER
)

def init_default_users():
    """Initializes schema and staff accounts without inserting dummy operational records."""
    init_db()
    existing_admin = query_one("SELECT id FROM users WHERE username = 'admin'")
    if existing_admin:
        return
    with db_transaction() as conn:
        cur = conn.cursor()
        now_iso = datetime.now().isoformat()
        users = [
            ("admin", "admin@dosewise.edu.eg", "Admin@123", "د. محمد الشناوي", ROLE_SUPER_ADMIN, "01001234567"),
            ("manager", "manager@dosewise.edu.eg", "Manager@123", "أ. سارة عبد الرحمن", ROLE_CENTER_MANAGER, "01112345678"),
            ("reception", "reception@dosewise.edu.eg", "Recept@123", "أ. نورهان محمود", ROLE_RECEPTIONIST, "01223456789"),
            ("accountant", "accountant@dosewise.edu.eg", "Account@123", "أ. أحمد فتحي", ROLE_ACCOUNTANT, "01556789012"),
            ("trainer", "trainer@dosewise.edu.eg", "Trainer@123", "د. حسام البدري", ROLE_TRAINER, "01098765432"),
        ]
        for u in users:
            salt, p_hash = hash_password(u[2])
            cur.execute("""
                INSERT INTO users (username, email, password_hash, salt, full_name, role, phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (u[0], u[1], p_hash, salt, u[3], u[4], u[5], now_iso))

def seed_all():
    """Populates the database with realistic Egyptian training academy data."""
    init_db()
    
    # Check if already seeded
    existing_admin = query_one("SELECT id FROM users WHERE username = 'admin'")
    if existing_admin:
        print("Database already contains seed data. Skipping re-seeding.")
        return

    with db_transaction() as conn:
        cur = conn.cursor()
        now = datetime.now()
        now_iso = now.isoformat()
        today_str = now.strftime("%Y-%m-%d")

        # 1. System Users
        users = [
            ("admin", "admin@dosewise.edu.eg", "Admin@123", "د. محمد الشناوي", ROLE_SUPER_ADMIN, "01001234567"),
            ("manager", "manager@dosewise.edu.eg", "Manager@123", "أ. سارة عبد الرحمن", ROLE_CENTER_MANAGER, "01112345678"),
            ("reception", "reception@dosewise.edu.eg", "Recept@123", "أ. نورهان محمود", ROLE_RECEPTIONIST, "01223456789"),
            ("accountant", "accountant@dosewise.edu.eg", "Account@123", "أ. أحمد فتحي", ROLE_ACCOUNTANT, "01556789012"),
            ("trainer", "trainer@dosewise.edu.eg", "Trainer@123", "د. حسام البدري", ROLE_TRAINER, "01098765432"),
        ]

        for u in users:
            salt, p_hash = hash_password(u[2])
            cur.execute("""
                INSERT INTO users (username, email, password_hash, salt, full_name, role, phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (u[0], u[1], p_hash, salt, u[3], u[4], u[5], now_iso))

        # 2. Courses
        courses = [
            ("CLIN-101", "دبلومة الصيدلة الإكلينيكية المتقدمة", "Advanced Clinical Pharmacy Diploma",
             "Clinical Pharmacy", "برنامج معتمد متخصص في الرعاية الصيدلانية، حساب الجرعات السريرية، وتطبيق البروتوكولات العلاجية في المستشفيات ومراكز الأورام والعناية المركزة.",
             "Advanced", "In-person", 45, 15, 6500.0, 8, 25, "بكالوريوس صيدلة أو طلبة السنوات النهائية", "كتاب البروتوكولات، أطلس الحالات السريرية، عروض المحاضرات"),
            
            ("PHARM-202", "علم الأدوية الحديث والتداخلات الدوائية", "Modern Pharmacology & Drug Interactions",
             "Pharmacology", "دراسة معمقة للمجموعات الدوائية الحديثة، التداخلات الدوائية الخطرة، والتطبيقات الإكلينيكية المعاصرة.",
             "Intermediate", "Hybrid", 30, 10, 4200.0, 6, 30, "خلفية طبية أو صيدلانية", "كتيب التفاعلات الدوائية، ملخصات الجداول الدوائية"),
            
            ("ANAL-303", "دبلومة التحاليل الطبية وقراءة الفحوصات", "Comprehensive Medical Analysis Diploma",
             "Medical Analysis", "تأهيل عملي متكامل لإجراء التحاليل الطبية وتفسير الفحوصات المخبرية وتحاليل الدم ووظائف الكبد والكلى والهرمونات.",
             "Intermediate", "In-person", 40, 12, 5500.0, 5, 20, "خريجو كليات العلوم، الصيدلة، الطب، الزراعة قسم بيوكيمياء", "دليل الفحوصات المخبرية، شرائح العملي الملونة"),
             
            ("COD-404", "الترميز والفوترة الطبية الدولية (ICD-10 / CPT)", "Medical Coding & Billing Professional",
             "Medical Administration", "برنامج تدريبي دولي يؤهل للحصول على شهادات الترميز الطبي المعتمدة والعمل في المستشفيات وشركات التأمين الصحي الخليجية والمحلية.",
             "Beginner", "Online", 36, 12, 4800.0, 10, 35, "مؤهل عالي وإجادة جيدة للغة الإنجليزية والكمبيوتر", "كتب ICD-10-CM، كتالوج CPT الرسمي، تدريبات عملية"),
             
            ("NUT-505", "التغذية العلاجية وتغذية الرياضيين", "Clinical Nutrition & Sports Nutrition",
             "Clinical Nutrition", "تصميم البرامج الغذائية العلاجية لمرضى السكري والضغط وجراحات السمنة وتغذية الرياضيين المحترفين.",
             "Intermediate", "Hybrid", 32, 10, 4500.0, 6, 25, "الممارسون الصحيون والمهتمون بمجال التغذية المعتمدة", "برامج حساب السعرات، قوالب الحميات الغذائية العلاجية"),
             
            ("COSM-606", "صناعة التركيبات الصيدلانية ومستحضرات التجميل", "Cosmetics & Pharmaceutical Compounding",
             "Cosmetics", "تدريب تطبيقي مخبري مكثف على تصنيع الكريمات، السيروم، اللوشن، والعلاجات الموضعية الجلدية بمعايير التصنيع الجيد cGMP.",
             "Intermediate", "In-person", 28, 8, 5200.0, 5, 18, "صيادلة وكيميائيون ومهتمون بصناعة مستحضرات التجميل", "كتيب التركيبات القياسية، قائمة المواد الفعالة والمذيبات")
        ]

        course_ids = {}
        for c in courses:
            cur.execute("""
                INSERT INTO courses (code, name_ar, name_en, category, description, level, training_type, total_hours, sessions_count, standard_price, min_capacity, max_capacity, prerequisites, materials, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
            """, (*c, now_iso))
            course_ids[c[0]] = cur.lastrowid

        # 3. Trainers
        trainers = [
            ("TRN-001", "د. حسام البدري", "01098765432", "hossam.badry@dosewise.edu.eg", "الصيدلة الإكلينيكية وعناية مركزة", "دكتوراه الصيدلة الإكلينيكية - بورد أمريكي BPS", "session_fee", 650.0, "عقد سنوي متجدد 2026"),
            ("TRN-002", "د. رانيا مصطفى", "01123456780", "rania.mostafa@dosewise.edu.eg", "التحاليل الطبية والباثولوجيا الإكلينيكية", "ماجستير الكيمياء الحيوية الإكلينيكية - جامعة الإسكندرية", "hourly_rate", 280.0, "عقد مدرب معتمد جزئي"),
            ("TRN-003", "د. طارق الخولي", "01234567891", "tarek.kholy@dosewise.edu.eg", "الترميز الطبي والتأمين الصحي الدولي", "استشاري إدارة المستشفيات والترميز الطبي المعتمد AAPC", "revenue_percentage", 28.0, "شراكة تدريبية 28% من الإيراد"),
            ("TRN-004", "د. ياسمين عادل", "01543219876", "yasmine.adel@dosewise.edu.eg", "التغذية العلاجية وتغذية الرياضيين", "دبلوم التغذية العلاجية ESPEN - أخصائي تغذية معتمد", "fixed_course", 8500.0, "عقد إنجاز دبلومة كاملة"),
            ("TRN-005", "د. مصطفى كامل", "01011223344", "mostafa.kamel@dosewise.edu.eg", "التركيبات الدوائية والتجميلية", "دكتور صيدلي - خبير تركيبات مستحضرات التجميل", "fixed_salary", 15000.0, "عقد شهري دوام كامل")
        ]

        trainer_ids = {}
        for t in trainers:
            cur.execute("""
                INSERT INTO trainers (trainer_code, full_name, mobile, email, specialization, qualifications, compensation_model, compensation_rate, contract_info, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
            """, (*t, now_iso))
            trainer_ids[t[0]] = cur.lastrowid

        # 4. Training Groups
        groups = [
            ("GRP-CLIN-01", "مجموعة الصيدلة الإكلينيكية (دفعة الخريف)", course_ids["CLIN-101"], trainer_ids["TRN-001"],
             (now - timedelta(days=20)).strftime("%Y-%m-%d"), (now + timedelta(days=40)).strftime("%Y-%m-%d"),
             json.dumps(["Sun", "Tue", "Thu"]), "18:00", "21:00", "قاعة أ - ابن النفيس", 22, 6500.0, "Active"),

            ("GRP-ANAL-01", "مجموعة التحاليل الطبية المعملية (مكثف)", course_ids["ANAL-303"], trainer_ids["TRN-002"],
             (now - timedelta(days=15)).strftime("%Y-%m-%d"), (now + timedelta(days=35)).strftime("%Y-%m-%d"),
             json.dumps(["Mon", "Wed"]), "17:00", "20:30", "معمل الكيمياء الطبية 1", 18, 5500.0, "Active"),

            ("GRP-COD-01", "مجموعة الترميز الطبي الدولي (Online Zoom)", course_ids["COD-404"], trainer_ids["TRN-003"],
             (now - timedelta(days=10)).strftime("%Y-%m-%d"), (now + timedelta(days=45)).strftime("%Y-%m-%d"),
             json.dumps(["Fri", "Sat"]), "15:00", "18:30", "قاعة البث الافتراضي (Zoom 1)", 30, 4800.0, "Active"),

            ("GRP-NUT-01", "مجموعة التغذية العلاجية (الدفعة 8)", course_ids["NUT-505"], trainer_ids["TRN-004"],
             (now + timedelta(days=5)).strftime("%Y-%m-%d"), (now + timedelta(days=60)).strftime("%Y-%m-%d"),
             json.dumps(["Sun", "Wed"]), "18:30", "21:00", "قاعة ب - الرازي", 20, 4500.0, "Upcoming"),

            ("GRP-COSM-01", "ورشة صناعة مستحضرات التجميل (نهاية الأسبوع)", course_ids["COSM-606"], trainer_ids["TRN-005"],
             (now - timedelta(days=45)).strftime("%Y-%m-%d"), (now - timedelta(days=5)).strftime("%Y-%m-%d"),
             json.dumps(["Fri", "Sat"]), "10:00", "14:00", "مختبر التركيبات والتجميل", 15, 5200.0, "Completed"),
        ]

        group_ids = {}
        for g in groups:
            cur.execute("""
                INSERT INTO training_groups (group_code, group_name, course_id, trainer_id, start_date, end_date, days_of_week, start_time, end_time, classroom_name, capacity, group_price, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (*g, now_iso))
            group_ids[g[0]] = cur.lastrowid

        # 5. Sessions Generation
        # For each group, generate sessions
        sessions_map = {}
        for g_code, g_name, c_id, tr_id, s_date, e_date, days_json, st_time, end_time, room, cap, prc, st in groups:
            g_id = group_ids[g_code]
            sessions_map[g_code] = []
            start_dt = datetime.strptime(s_date, "%Y-%m-%d")
            total_sessions = 10 if "ANAL" in g_code or "NUT" in g_code else (8 if "COSM" in g_code else 12)
            
            for s_num in range(1, total_sessions + 1):
                # Spread sessions across days
                session_dt = start_dt + timedelta(days=(s_num - 1) * 3)
                session_date_str = session_dt.strftime("%Y-%m-%d")
                
                # Determine status based on date compared to today
                if session_date_str < today_str:
                    sess_status = "Completed"
                elif session_date_str == today_str:
                    sess_status = "Scheduled"
                else:
                    sess_status = "Scheduled"

                cur.execute("""
                    INSERT INTO sessions (group_id, session_number, session_date, start_time, end_time, classroom_name, trainer_id, status, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (g_id, s_num, session_date_str, st_time, end_time, room, tr_id, sess_status, f"المحاضرة رقم {s_num}", now_iso))
                sessions_map[g_code].append((cur.lastrowid, s_num, session_date_str, sess_status))

        # 6. Students (Realistic Egyptian Data)
        students = [
            ("STU-2026-001", "أحمد إبراهيم الدسوقي", "Ahmed Ibrahim El-Desouky", "29705121501234", "01012348901", "01012348901", "ahmed.desouky@gmail.com", "1997-05-12", "Male", "المنصورة، محافظة الدقهلية", "بكالوريوس صيدلة - جامعة المنصورة", (now - timedelta(days=25)).strftime("%Y-%m-%d"), "إبراهيم الدسوقي", "01012348900", "Active"),
            ("STU-2026-002", "مريم خالد النجار", "Mariam Khaled El-Naggar", "29908200102345", "01145678912", "01145678912", "mariam.naggar@yahoo.com", "1999-08-20", "Female", "مدينة نصر، القاهرة", "بكالوريوس علوم كيمياء حيوية - جامعة عين شمس", (now - timedelta(days=22)).strftime("%Y-%m-%d"), "خالد النجار", "01145678900", "Active"),
            ("STU-2026-003", "محمود عبد المنعم السيد", "Mahmoud Abdel Moneim", "29511041203456", "01234567801", "01234567801", "mahmoud.moniem@gmail.com", "1995-11-04", "Male", "طنطا، محافظة الغربية", "بكالوريوس صيدلة إكلينيكية", (now - timedelta(days=20)).strftime("%Y-%m-%d"), "عبد المنعم السيد", "01234567800", "Active"),
            ("STU-2026-004", "سارة عادل المنشاوي", "Sara Adel El-Menshawy", "29803151804567", "01556781234", "01556781234", "sara.menshawy@gmail.com", "1998-03-15", "Female", "الدقي، الجيزة", "بكالوريوس تمريض - جامعة القاهرة", (now - timedelta(days=18)).strftime("%Y-%m-%d"), "عادل المنشاوي", "01556781200", "Active"),
            ("STU-2026-005", "كريم حسام الدين عامر", "Karim Hossam El-Din Amer", "29609101605678", "01098761234", "01098761234", "karim.amer@outlook.com", "1996-09-10", "Male", "الإسكندرية، سيدي جابر", "بكالوريوس علوم - قسم ميكروبيولوجي", (now - timedelta(days=16)).strftime("%Y-%m-%d"), "حسام عامر", "01098761200", "Active"),
            ("STU-2026-006", "نادية مصطفى رزق", "Nadia Mostafa Rezk", "30001052106789", "01123459876", "01123459876", "nadia.rezk@gmail.com", "2000-01-05", "Female", "الزقازيق، محافظة الشرقية", "طالبة بالسنة النهائية بكلية الصيدلة", (now - timedelta(days=15)).strftime("%Y-%m-%d"), "مصطفى رزق", "01123459800", "Active"),
            ("STU-2026-007", "عمر طارق الشربيني", "Omar Tarek El-Sherbini", "29412251407890", "01287654321", "01287654321", "omar.sherbini@gmail.com", "1994-12-25", "Male", "شبرا، القاهرة", "بكالوريوس تجارة وإدارة نظم صحية", (now - timedelta(days=12)).strftime("%Y-%m-%d"), "طارق الشربيني", "01287654300", "Active"),
            ("STU-2026-008", "هدى ياسر الشريف", "Hoda Yasser El-Sherif", "29906141308901", "01065432198", "01065432198", "hoda.sherif@hotmail.com", "1999-06-14", "Female", "المعادي، القاهرة", "بكالوريوس علاج طبيعي - جامعة بدر", (now - timedelta(days=10)).strftime("%Y-%m-%d"), "ياسر الشريف", "01065432100", "Active"),
            ("STU-2026-009", "يوسف هشام القاضي", "Youssef Hesham El-Kady", "29604181709012", "01598765432", "01598765432", "youssef.kady@gmail.com", "1996-04-18", "Male", "كفر الشيخ، المحطة", "بكالوريوس صيدلة - جامعة كفر الشيخ", (now - timedelta(days=48)).strftime("%Y-%m-%d"), "هشام القاضي", "01598765400", "Completed"),
            ("STU-2026-010", "ريهام عصام غنيم", "Reham Essam Ghoneim", "29810221900123", "01187654321", "01187654321", "reham.ghoneim@gmail.com", "1998-10-22", "Female", "بنها، محافظة القليوبية", "بكالوريوس علوم كيمياء خاصة", (now - timedelta(days=47)).strftime("%Y-%m-%d"), "عصام غنيم", "01187654300", "Completed"),
            ("STU-2026-011", "علي وائل الباز", "Ali Wael El-Baz", "29707071501111", "01011447788", "01011447788", "ali.baz@gmail.com", "1997-07-07", "Male", "المحلة الكبرى، الغربية", "طبيب صيدلي - مركز الأورام", (now - timedelta(days=5)).strftime("%Y-%m-%d"), "وائل الباز", "01011447700", "Active"),
            ("STU-2026-012", "دينا سمير زهران", "Dina Samir Zahran", "29911110102222", "01233669988", "01233669988", "dina.zahran@gmail.com", "1999-11-11", "Female", "التجمع الخامس، القاهرة الجديدة", "أخصائية تحاليل طبية", (now - timedelta(days=4)).strftime("%Y-%m-%d"), "سمير زهران", "01233669900", "Active")
        ]

        student_ids = {}
        for s in students:
            cur.execute("""
                INSERT INTO students (student_code, full_name, full_name_en, national_id, mobile_number, whatsapp_number, email, date_of_birth, gender, address, qualification, registration_date, emergency_name, emergency_phone, notes, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'طالب مسجل وفقاً لمتطلبات القبول الرسمية', ?, ?, ?)
            """, (s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[14], now_iso, now_iso))
            student_ids[s[0]] = cur.lastrowid

        # 7. Enrollments, Payments, and Installment Plans
        # Student 1: Clinical Pharmacy - Paid in full (Discount 500 EGP early bird)
        # Price: 6500 - 500 = 6000. Paid: 6000. Balance: 0
        cur.execute("""
            INSERT INTO enrollments (student_id, group_id, course_id, enrollment_date, original_price, discount_amount, discount_type, discount_reason, final_price, total_paid, balance_due, payment_status, enrollment_status, created_at)
            VALUES (?, ?, ?, ?, 6500.0, 500.0, 'fixed', 'خصم الحجز المبكر', 6000.0, 6000.0, 0.0, 'Paid', 'Active', ?)
        """, (student_ids["STU-2026-001"], group_ids["GRP-CLIN-01"], course_ids["CLIN-101"], (now - timedelta(days=24)).strftime("%Y-%m-%d"), now_iso))
        enr_1 = cur.lastrowid

        cur.execute("""
            INSERT INTO payments (receipt_number, transaction_id, enrollment_id, student_id, amount, payment_date, payment_method, reference_number, notes, recorded_by, created_at)
            VALUES ('RCP-2026-0001', 'TXN-2026-0001', ?, ?, 6000.0, ?, 'InstaPay', 'INSTA-894210', 'سداد كامل رسوم الدبلومة مقدماً', 4, ?)
        """, (enr_1, student_ids["STU-2026-001"], (now - timedelta(days=24)).strftime("%Y-%m-%d"), now_iso))

        # Student 2: Medical Analysis - 3 Installments Plan
        # Price: 5500. Discount: 0. Final: 5500. Paid: 2500 (1st installment). Balance: 3000.
        cur.execute("""
            INSERT INTO enrollments (student_id, group_id, course_id, enrollment_date, original_price, discount_amount, discount_type, final_price, total_paid, balance_due, payment_status, enrollment_status, created_at)
            VALUES (?, ?, ?, ?, 5500.0, 0.0, 'none', 5500.0, 2500.0, 3000.0, 'Partial', 'Active', ?)
        """, (student_ids["STU-2026-002"], group_ids["GRP-ANAL-01"], course_ids["ANAL-303"], (now - timedelta(days=22)).strftime("%Y-%m-%d"), now_iso))
        enr_2 = cur.lastrowid

        cur.execute("""
            INSERT INTO payments (receipt_number, transaction_id, enrollment_id, student_id, amount, payment_date, payment_method, reference_number, notes, recorded_by, created_at)
            VALUES ('RCP-2026-0002', 'TXN-2026-0002', ?, ?, 2500.0, ?, 'Cash', 'CASH-REC-01', 'دفعة أولى عند التسجيل', 4, ?)
        """, (enr_2, student_ids["STU-2026-002"], (now - timedelta(days=22)).strftime("%Y-%m-%d"), now_iso))

        # Installments for Student 2:
        # Installment 1: Paid 2500
        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount, paid_at, notes)
            VALUES (?, 1, 2500.0, ?, 'Paid', 2500.0, ?, 'تم سداد الدفعة الأولى نقدياً')
        """, (enr_2, (now - timedelta(days=22)).strftime("%Y-%m-%d"), (now - timedelta(days=22)).strftime("%Y-%m-%d")))
        
        # Installment 2: Overdue 1500 (Due 3 days ago)
        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount, notes)
            VALUES (?, 2, 1500.0, ?, 'Overdue', 0.0, 'قسط مستحق متأخر')
        """, (enr_2, (now - timedelta(days=3)).strftime("%Y-%m-%d")))

        # Installment 3: Pending 1500 (Due in 20 days)
        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount, notes)
            VALUES (?, 3, 1500.0, ?, 'Pending', 0.0, 'القسط الأخير قبل الامتحان')
        """, (enr_2, (now + timedelta(days=20)).strftime("%Y-%m-%d")))

        # Student 3: Clinical Pharmacy - Partial Payment
        # Price: 6500. Paid: 3000. Balance: 3500
        cur.execute("""
            INSERT INTO enrollments (student_id, group_id, course_id, enrollment_date, original_price, discount_amount, discount_type, final_price, total_paid, balance_due, payment_status, enrollment_status, created_at)
            VALUES (?, ?, ?, ?, 6500.0, 0.0, 'none', 6500.0, 3000.0, 3500.0, 'Partial', 'Active', ?)
        """, (student_ids["STU-2026-003"], group_ids["GRP-CLIN-01"], course_ids["CLIN-101"], (now - timedelta(days=19)).strftime("%Y-%m-%d"), now_iso))
        enr_3 = cur.lastrowid

        cur.execute("""
            INSERT INTO payments (receipt_number, transaction_id, enrollment_id, student_id, amount, payment_date, payment_method, reference_number, notes, recorded_by, created_at)
            VALUES ('RCP-2026-0003', 'TXN-2026-0003', ?, ?, 3000.0, ?, 'Bank_Transfer', 'BNK-CAIRO-9021', 'تحويل بنكي - بنك مصر', 4, ?)
        """, (enr_3, student_ids["STU-2026-003"], (now - timedelta(days=19)).strftime("%Y-%m-%d"), now_iso))

        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount, paid_at)
            VALUES (?, 1, 3000.0, ?, 'Paid', 3000.0, ?)
        """, (enr_3, (now - timedelta(days=19)).strftime("%Y-%m-%d"), (now - timedelta(days=19)).strftime("%Y-%m-%d")))

        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount)
            VALUES (?, 2, 3500.0, ?, 'Pending', 0.0)
        """, (enr_3, (now + timedelta(days=10)).strftime("%Y-%m-%d")))

        # Student 4: Medical Coding - Paid in Full via Card
        cur.execute("""
            INSERT INTO enrollments (student_id, group_id, course_id, enrollment_date, original_price, discount_amount, discount_type, final_price, total_paid, balance_due, payment_status, enrollment_status, created_at)
            VALUES (?, ?, ?, ?, 4800.0, 300.0, 'fixed', 4500.0, 4500.0, 0.0, 'Paid', 'Active', ?)
        """, (student_ids["STU-2026-004"], group_ids["GRP-COD-01"], course_ids["COD-404"], (now - timedelta(days=17)).strftime("%Y-%m-%d"), now_iso))
        enr_4 = cur.lastrowid

        cur.execute("""
            INSERT INTO payments (receipt_number, transaction_id, enrollment_id, student_id, amount, payment_date, payment_method, reference_number, notes, recorded_by, created_at)
            VALUES ('RCP-2026-0004', 'TXN-2026-0004', ?, ?, 4500.0, ?, 'Card', 'VISA-POS-7744', 'دفع إلكتروني عبر الماكينة', 4, ?)
        """, (enr_4, student_ids["STU-2026-004"], (now - timedelta(days=17)).strftime("%Y-%m-%d"), now_iso))

        # Student 5: Medical Analysis - Unpaid (Registered recently)
        cur.execute("""
            INSERT INTO enrollments (student_id, group_id, course_id, enrollment_date, original_price, discount_amount, discount_type, final_price, total_paid, balance_due, payment_status, enrollment_status, created_at)
            VALUES (?, ?, ?, ?, 5500.0, 0.0, 'none', 5500.0, 0.0, 5500.0, 'Unpaid', 'Active', ?)
        """, (student_ids["STU-2026-005"], group_ids["GRP-ANAL-01"], course_ids["ANAL-303"], (now - timedelta(days=2)).strftime("%Y-%m-%d"), now_iso))
        enr_5 = cur.lastrowid

        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount)
            VALUES (?, 1, 2750.0, ?, 'Pending', 0.0)
        """, (enr_5, (now + timedelta(days=2)).strftime("%Y-%m-%d")))
        cur.execute("""
            INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount)
            VALUES (?, 2, 2750.0, ?, 'Pending', 0.0)
        """, (enr_5, (now + timedelta(days=22)).strftime("%Y-%m-%d")))

        # Student 9 & 10: Cosmetics - Completed Course & Paid in Full
        for s_code, receipt_no, txn_no in [("STU-2026-009", "RCP-2026-0005", "TXN-2026-0005"), ("STU-2026-010", "RCP-2026-0006", "TXN-2026-0006")]:
            cur.execute("""
                INSERT INTO enrollments (student_id, group_id, course_id, enrollment_date, original_price, discount_amount, discount_type, final_price, total_paid, balance_due, payment_status, enrollment_status, created_at)
                VALUES (?, ?, ?, ?, 5200.0, 200.0, 'fixed', 5000.0, 5000.0, 0.0, 'Paid', 'Completed', ?)
            """, (student_ids[s_code], group_ids["GRP-COSM-01"], course_ids["COSM-606"], (now - timedelta(days=46)).strftime("%Y-%m-%d"), now_iso))
            enr_c = cur.lastrowid
            cur.execute("""
                INSERT INTO payments (receipt_number, transaction_id, enrollment_id, student_id, amount, payment_date, payment_method, reference_number, notes, recorded_by, created_at)
                VALUES (?, ?, ?, ?, 5000.0, ?, 'Cash', 'CASH-REC', 'سداد كامل الرسوم', 4, ?)
            """, (receipt_no, txn_no, enr_c, student_ids[s_code], (now - timedelta(days=46)).strftime("%Y-%m-%d"), now_iso))

        # 8. Attendance Records for Group CLIN-01 & ANAL-01
        clin_sessions = sessions_map["GRP-CLIN-01"]
        for sess_id, s_num, s_date, s_status in clin_sessions:
            if s_status == "Completed":
                # Ahmed is always present
                cur.execute("""
                    INSERT INTO attendance (session_id, student_id, status, notes, recorded_by, created_at)
                    VALUES (?, ?, 'Present', 'حضور منتظم ومشارك فعال', 3, ?)
                """, (sess_id, student_ids["STU-2026-001"], now_iso))
                # Mahmoud was late in session 2, absent in session 3
                m_stat = "Late" if s_num == 2 else ("Absent" if s_num == 3 else "Present")
                cur.execute("""
                    INSERT INTO attendance (session_id, student_id, status, notes, recorded_by, created_at)
                    VALUES (?, ?, ?, ?, 3, ?)
                """, (sess_id, student_ids["STU-2026-003"], m_stat, "تأخر 20 دقيقة" if m_stat == "Late" else None, now_iso))

        # 9. Expenses (Realistic Center Operational Expenses)
        expenses_data = [
            ("EXP-2026-001", "Rent", "إيجار مقر الأكاديمية الشهري (فرع الدور الثالث)", 18000.0, (now - timedelta(days=12)).strftime("%Y-%m-%d"), "Bank_Transfer", "شركة النيل العقارية", 1, 1),
            ("EXP-2026-002", "Utilities", "فاتورة استهلاك الكهرباء والتكييفات المركزية", 3450.0, (now - timedelta(days=10)).strftime("%Y-%m-%d"), "Cash", "شركة كهرباء مصر الوسطى", 4, 1),
            ("EXP-2026-003", "Marketing", "حملة إعلانية ممولة على فيسبوك وإنستغرام لدبلومة الصيدلة والتحاليل", 4800.0, (now - timedelta(days=8)).strftime("%Y-%m-%d"), "Card", "Meta Ads Ireland", 2, 1),
            ("EXP-2026-004", "Supplies", "شراء مستلزمات طبية وأدوات معملية وكيماويات لتدريب العملي", 2900.0, (now - timedelta(days=5)).strftime("%Y-%m-%d"), "Cash", "مؤسسة الأمل للمستلزمات الطبية", 4, 1),
            ("EXP-2026-005", "Maintenance", "صيانة دورية لأجهزة الداتا شو والتكييف وتغيير فلاتر المعمل", 1250.0, (now - timedelta(days=3)).strftime("%Y-%m-%d"), "Cash", "مركز تكنو كول للصيانة", 4, 1),
            ("EXP-2026-006", "Supplies", "طباعة مذكرات التدريب والشهادات والشنط الترحيبية للطلاب", 3100.0, today_str, "Cash", "مطبعة الأهرام الحديثة", 4, 1)
        ]

        for exp in expenses_data:
            cur.execute("""
                INSERT INTO expenses (expense_number, category, description, amount, expense_date, payment_method, vendor, recorded_by, approved_by, approval_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
            """, (*exp, now_iso))

        # 10. Cash Register (Treasury / الخزينة)
        # Closed register for yesterday
        yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        cur.execute("""
            INSERT INTO cash_registers (register_date, opening_balance, total_inflow, total_outflow, expected_closing, actual_closing, difference, status, notes, closed_by, created_at)
            VALUES (?, 15000.0, 7500.0, 4150.0, 18350.0, 18350.0, 0.0, 'Closed', 'تم إغلاق وجرد الخزينة اليومية ومطابقة النقدية بنجاح دون أي عجز أو زيادة', 4, ?)
        """, (yesterday_str, now_iso))

        # Open register for today
        cur.execute("""
            INSERT INTO cash_registers (register_date, opening_balance, total_inflow, total_outflow, expected_closing, actual_closing, difference, status, notes, created_at)
            VALUES (?, 18350.0, 2500.0, 3100.0, 17750.0, NULL, 0.0, 'Open', 'الخزينة مفتوحة للعمليات اليومية الجارية', ?)
        """, (today_str, now_iso))

        # 11. Trainer Payouts
        cur.execute("""
            INSERT INTO trainer_payouts (payout_number, trainer_id, amount, period_start, period_end, sessions_count, compensation_model, payment_method, reference_number, notes, paid_by, payment_date, created_at)
            VALUES ('PAY-2026-001', ?, 5200.0, ?, ?, 8, 'session_fee', 'InstaPay', 'INSTA-TRN-9988', 'مستحقات تدريب 8 محاضرات دبلومة الصيدلة الإكلينيكية', 4, ?, ?)
        """, (trainer_ids["TRN-001"], (now - timedelta(days=30)).strftime("%Y-%m-%d"), (now - timedelta(days=1)).strftime("%Y-%m-%d"), (now - timedelta(days=2)).strftime("%Y-%m-%d"), now_iso))

        # 12. CRM Leads
        leads_data = [
            ("د. هاني صبحي سلامة", "01099887766", "01099887766", "dr.hani@gmail.com", course_ids["CLIN-101"], "Facebook", (now - timedelta(days=3)).strftime("%Y-%m-%d"), (now + timedelta(days=1)).strftime("%Y-%m-%d"), 2, "Interested", "مهتم بحضور دبلومة الصيدلة الإكلينيكية وطلب معرفة نظام التقسيط ومواعيد المساء"),
            ("أ. إسراء مجدي الفقي", "01177665544", "01177665544", "esraa.feky@yahoo.com", course_ids["ANAL-303"], "Instagram", (now - timedelta(days=4)).strftime("%Y-%m-%d"), (now + timedelta(days=2)).strftime("%Y-%m-%d"), 3, "Contacted", "خريجة علوم كيمياء وترغب بالتدريب العملي، سيتم الاتصال بها للتأكيد"),
            ("د. بلال عبد الحميد", "01233445566", "01233445566", "belal.sayed@gmail.com", course_ids["COD-404"], "Referral", (now - timedelta(days=2)).strftime("%Y-%m-%d"), (now + timedelta(days=3)).strftime("%Y-%m-%d"), 2, "New", "ترشيح من زميل متخرج، يرغب في الشهادة الدولية"),
            ("أ. منى مصطفى خليل", "01511223344", "01511223344", "mona.khalil@gmail.com", course_ids["NUT-505"], "Walk_In", (now - timedelta(days=1)).strftime("%Y-%m-%d"), today_str, 3, "Interested", "زارت مقر المركز واستلمت البروشور، تطلب التسجيل بالدفعة القادمة"),
        ]

        for ld in leads_data:
            cur.execute("""
                INSERT INTO leads (full_name, phone, whatsapp, email, interested_course_id, source, inquiry_date, follow_up_date, assigned_to, status, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (*ld, now_iso))

        # 13. Assessments and Certificates
        # Assessment for Cosmetics course (Completed)
        cur.execute("""
            INSERT INTO assessments (course_id, group_id, title, assessment_type, max_score, passing_score, assessment_date, created_at)
            VALUES (?, ?, 'الاختبار النظري والتطبيقي النهائي لتركيبات التجميل', 'Final', 100.0, 70.0, ?, ?)
        """, (course_ids["COSM-606"], group_ids["GRP-COSM-01"], (now - timedelta(days=6)).strftime("%Y-%m-%d"), now_iso))
        asm_id = cur.lastrowid

        # Results for Student 9 & 10
        cur.execute("""
            INSERT INTO assessment_results (assessment_id, student_id, score, is_passed, feedback, recorded_by, created_at)
            VALUES (?, ?, 94.0, 1, 'أداء ممتاز في تركيب المستحلبات والكريمات الطبية وفق المعايير', 1, ?)
        """, (asm_id, student_ids["STU-2026-009"], now_iso))

        cur.execute("""
            INSERT INTO assessment_results (assessment_id, student_id, score, is_passed, feedback, recorded_by, created_at)
            VALUES (?, ?, 88.0, 1, 'إتقان جيد جداً لحسابات نسب المواد الفعالة واختبارات الثبات', 1, ?)
        """, (asm_id, student_ids["STU-2026-010"], now_iso))

        # Certificates issued for graduated students
        cert_code_1 = "DW-CERT-2026-0101"
        cur.execute("""
            INSERT INTO certificates (certificate_code, student_id, course_id, group_id, issue_date, completion_date, grade_label, verification_hash, is_valid, issued_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ممتاز مع مرتبة الشرف (Distinction)', ?, 1, 1, ?)
        """, (cert_code_1, student_ids["STU-2026-009"], course_ids["COSM-606"], group_ids["GRP-COSM-01"], (now - timedelta(days=5)).strftime("%Y-%m-%d"), (now - timedelta(days=5)).strftime("%Y-%m-%d"), secrets.token_hex(16), now_iso))

        cert_code_2 = "DW-CERT-2026-0102"
        cur.execute("""
            INSERT INTO certificates (certificate_code, student_id, course_id, group_id, issue_date, completion_date, grade_label, verification_hash, is_valid, issued_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'جيد جداً مرتفع (Very Good)', ?, 1, 1, ?)
        """, (cert_code_2, student_ids["STU-2026-010"], course_ids["COSM-606"], group_ids["GRP-COSM-01"], (now - timedelta(days=5)).strftime("%Y-%m-%d"), (now - timedelta(days=5)).strftime("%Y-%m-%d"), secrets.token_hex(16), now_iso))

        # 14. Notifications
        notifications = [
            ("قسط مستحق متأخر", "Overdue Installment",
             f"الطالبة مريم خالد النجار لديها قسط متأخر بقيمة 1,500 ج.م مستحق منذ {(now - timedelta(days=3)).strftime('%Y-%m-%d')}",
             "Student Mariam Khaled has an overdue installment of 1,500 EGP",
             "overdue_payment", "critical", "installment", 2, 0),

            ("اقتراب بدء دورة تدريبية", "Upcoming Course Start",
             f"مجموعة التغذية العلاجية (الدفعة 8) تبدأ بعد {(now + timedelta(days=5)).strftime('%Y-%m-%d')} - مقاعد متبقية 8 مقاعد",
             "Clinical Nutrition Group 8 starts in 5 days",
             "course_start", "medium", "group", group_ids["GRP-NUT-01"], 0),

            ("محاضرات اليوم المجدولة", "Today's Scheduled Sessions",
             "يوجد اليوم محاضرتان تدريبيتان في قاعة أ ومعمل الكيمياء الطبية",
             "2 sessions scheduled today in Hall A and Medical Lab",
             "session_upcoming", "low", "session", 1, 1),
             
            ("مستحقات محاضرين معلقة", "Pending Trainer Compensation",
             "مستحقات د. رانيا مصطفى عن محاضرات معمل التحاليل للأسبوع الماضي جاهزة للمراجعة",
             "Trainer compensation for Dr. Rania Mostafa ready for review",
             "trainer_payout", "high", "trainer", trainer_ids["TRN-002"], 0)
        ]

        for notif in notifications:
            cur.execute("""
                INSERT INTO notifications (title_ar, title_en, message_ar, message_en, notification_type, priority, related_entity_type, related_entity_id, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (*notif, now_iso))

        # 15. Initial Audit Logs
        cur.execute("""
            INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address, created_at)
            VALUES (1, 'admin', 'SYSTEM_INIT', 'SYSTEM', '1', 'تهيئة النظام وقاعدة البيانات وتثبيت الإعدادات الأساسية لمركز DoseWise Academy', '127.0.0.1', ?)
        """, (now_iso,))

    print("Successfully seeded DoseWise Academy database!")

def clear_all_operational_data():
    """Wipes all dummy and operational data while preserving administrator users."""
    with db_transaction() as conn:
        cur = conn.cursor()
        tables = [
            "attendance",
            "sessions",
            "installments",
            "refunds_adjustments",
            "payments",
            "enrollments",
            "certificates",
            "assessment_results",
            "assessments",
            "students",
            "training_groups",
            "courses",
            "trainer_payouts",
            "trainers",
            "cash_registers",
            "expenses",
            "leads",
            "notifications",
            "audit_logs"
        ]
        for tbl in tables:
            cur.execute(f"DELETE FROM {tbl};")
        
        # Reset SQLite sequence counters except for users
        cur.execute("DELETE FROM sqlite_sequence WHERE name NOT IN ('users');")
        
        # Add initial audit log
        now_iso = datetime.now().isoformat()
        cur.execute("""
            INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address, created_at)
            VALUES (1, 'admin', 'SYSTEM_RESET', 'SYSTEM', '1', 'تفريغ وحذف كافة البيانات التجريبية وتصفير العدادات للبدء بقاعدة بيانات نظيفة', '127.0.0.1', ?)
        """, (now_iso,))
        
    print("All operational and dummy data cleared successfully!")
    return True

if __name__ == "__main__":
    seed_all()
