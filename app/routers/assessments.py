import secrets
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_TRAINER
)

router = APIRouter(prefix="/api/assessments", tags=["Assessments & Certificates"])

class AssessmentCreateRequest(BaseModel):
    course_id: int
    group_id: Optional[int] = None
    title: str
    assessment_type: Optional[str] = "Final" # Midterm, Final, Practical, Quiz
    max_score: Optional[float] = 100.0
    passing_score: Optional[float] = 70.0
    assessment_date: Optional[str] = None

class StudentGradeItem(BaseModel):
    student_id: int
    score: float
    feedback: Optional[str] = None

class SubmitGradesRequest(BaseModel):
    grades: List[StudentGradeItem]

class IssueCertificateRequest(BaseModel):
    student_id: int
    course_id: int
    group_id: Optional[int] = None
    grade_label: Optional[str] = "ممتاز (Distinction)"
    completion_date: Optional[str] = None

@router.get("")
def list_assessments(course_id: Optional[int] = None, group_id: Optional[int] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists assessments and exams with completion statistics."""
    where_clauses = ["1=1"]
    params = []
    if course_id:
        where_clauses.append("a.course_id = ?")
        params.append(course_id)
    if group_id:
        where_clauses.append("a.group_id = ?")
        params.append(group_id)

    where_sql = " AND ".join(where_clauses)
    assessments = query_all(f"""
        SELECT 
            a.*,
            c.name_ar as course_name_ar, c.code as course_code,
            g.group_name,
            (SELECT COUNT(*) FROM assessment_results ar WHERE ar.assessment_id = a.id) as graded_students_count,
            (SELECT COUNT(*) FROM assessment_results ar WHERE ar.assessment_id = a.id AND ar.is_passed = 1) as passed_students_count
        FROM assessments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN training_groups g ON a.group_id = g.id
        WHERE {where_sql}
        ORDER BY a.id DESC
    """, tuple(params))

    return {"assessments": assessments}

@router.post("")
def create_assessment(
    req: AssessmentCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_TRAINER]))
):
    """Creates a course assessment / exam."""
    now_iso = datetime.now().isoformat()
    new_id = execute_insert("""
        INSERT INTO assessments (course_id, group_id, title, assessment_type, max_score, passing_score, assessment_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.course_id, req.group_id, req.title.strip(), req.assessment_type or "Final",
        req.max_score or 100.0, req.passing_score or 70.0, req.assessment_date, now_iso
    ))

    log_audit(current_user["id"], current_user["username"], "CREATE_ASSESSMENT", "ASSESSMENT", new_id, f"إنشاء اختبار: {req.title}")
    return {"success": True, "id": new_id, "message": {"ar": "تم إنشاء الاختبار بنجاح", "en": "Assessment created successfully"}}

@router.get("/{assessment_id}/grades")
def get_assessment_grades(assessment_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches students and their scores for an assessment."""
    assessment = query_one("""
        SELECT a.*, c.name_ar as course_name, g.group_name
        FROM assessments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN training_groups g ON a.group_id = g.id
        WHERE a.id = ?
    """, (assessment_id,))
    if not assessment:
        raise HTTPException(status_code=404, detail={"ar": "الاختبار غير موجود", "en": "Assessment not found"})

    # Get students enrolled in this group (or course if no group specified)
    if assessment["group_id"]:
        students = query_all("""
            SELECT 
                s.id as student_id, s.student_code, s.full_name, s.mobile_number,
                ar.score, ar.is_passed, ar.feedback, ar.created_at as graded_at
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN assessment_results ar ON ar.assessment_id = ? AND ar.student_id = s.id
            WHERE e.group_id = ?
            ORDER BY s.full_name ASC
        """, (assessment_id, assessment["group_id"]))
    else:
        students = query_all("""
            SELECT 
                s.id as student_id, s.student_code, s.full_name, s.mobile_number,
                ar.score, ar.is_passed, ar.feedback, ar.created_at as graded_at
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            LEFT JOIN assessment_results ar ON ar.assessment_id = ? AND ar.student_id = s.id
            WHERE e.course_id = ?
            ORDER BY s.full_name ASC
        """, (assessment_id, assessment["course_id"]))

    return {"assessment": assessment, "students": students}

@router.post("/{assessment_id}/grades")
def record_assessment_grades(
    assessment_id: int,
    req: SubmitGradesRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_TRAINER]))
):
    """Submits or updates grades for an assessment."""
    assessment = query_one("SELECT * FROM assessments WHERE id = ?", (assessment_id,))
    if not assessment:
        raise HTTPException(status_code=404, detail={"ar": "الاختبار غير موجود", "en": "Assessment not found"})

    now_iso = datetime.now().isoformat()
    passing_score = assessment["passing_score"]

    with db_transaction() as conn:
        cur = conn.cursor()
        for item in req.grades:
            is_passed = 1 if item.score >= passing_score else 0
            cur.execute("""
                INSERT INTO assessment_results (assessment_id, student_id, score, is_passed, feedback, recorded_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(assessment_id, student_id) DO UPDATE SET
                    score = excluded.score,
                    is_passed = excluded.is_passed,
                    feedback = excluded.feedback,
                    recorded_by = excluded.recorded_by
            """, (assessment_id, item.student_id, item.score, is_passed, item.feedback, current_user["id"], now_iso))

    log_audit(current_user["id"], current_user["username"], "RECORD_GRADES", "ASSESSMENT", assessment_id, f"تسجيل درجات {len(req.grades)} طالب للاختبار {assessment['title']}")
    return {"success": True, "message": {"ar": "تم حفظ الدرجات وتقييمات الطلاب بنجاح", "en": "Grades recorded successfully"}}

# Certificate Issuance & Verification
@router.post("/certificates/issue")
def issue_certificate(
    req: IssueCertificateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Issues an official verifiable completion certificate after validating academic and financial criteria."""
    student = query_one("SELECT * FROM students WHERE id = ?", (req.student_id,))
    if not student:
        raise HTTPException(status_code=404, detail={"ar": "الطالب غير موجود", "en": "Student not found"})

    course = query_one("SELECT * FROM courses WHERE id = ?", (req.course_id,))
    if not course:
        raise HTTPException(status_code=404, detail={"ar": "الدورة غير موجودة", "en": "Course not found"})

    # Check criteria 1: Debt check (Student must have balance_due == 0)
    enrollment = query_one("""
        SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?
    """, (req.student_id, req.course_id))
    if not enrollment:
        raise HTTPException(status_code=400, detail={"ar": "الطالب غير مسجل في هذه الدورة", "en": "Student not enrolled in course"})

    if enrollment["balance_due"] > 0:
        raise HTTPException(
            status_code=400,
            detail={
                "ar": f"لا يمكن إصدار الشهادة! على الطالب متبقيات مالية مستحقة بقيمة ({enrollment['balance_due']} ج.م)",
                "en": f"Cannot issue certificate! Student has outstanding balance of ({enrollment['balance_due']} EGP)"
            }
        )

    # Check criteria 2: Attendance rate >= 75%
    att_stats = query_one("""
        SELECT 
            COUNT(*) as total_sessions,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count
        FROM attendance a
        JOIN sessions s ON a.session_id = s.id
        WHERE s.group_id = ? AND a.student_id = ?
    """, (enrollment["group_id"], req.student_id))
    
    if att_stats and att_stats["total_sessions"] > 0:
        att_rate = (att_stats["present_count"] / att_stats["total_sessions"]) * 100
        if att_rate < 75.0:
            raise HTTPException(
                status_code=400,
                detail={
                    "ar": f"لا يمكن إصدار الشهادة! نسبة حضور الطالب ({att_rate:.1f}%) أقل من الحد الأدنى المطلوب (75%)",
                    "en": f"Cannot issue certificate! Attendance rate ({att_rate:.1f}%) is below required minimum (75%)"
                }
            )

    # Criteria passed! Issue certificate
    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")
    completion_date = req.completion_date or today_str

    last_cert = query_one("SELECT COALESCE(MAX(id), 0) as m FROM certificates")
    next_c = (last_cert["m"] if last_cert else 0) + 1
    cert_code = f"DW-CERT-{datetime.now().year}-{next_c:04d}"
    verification_hash = secrets.token_hex(16)

    cert_id = execute_insert("""
        INSERT INTO certificates (
            certificate_code, student_id, course_id, group_id, issue_date,
            completion_date, grade_label, verification_hash, is_valid, issued_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    """, (
        cert_code, req.student_id, req.course_id, req.group_id or enrollment["group_id"],
        today_str, completion_date, req.grade_label or "ممتاز (Distinction)",
        verification_hash, current_user["id"], now_iso
    ))

    # Update student status to Completed
    execute_update("UPDATE students SET status = 'Completed' WHERE id = ?", (req.student_id,))

    log_audit(current_user["id"], current_user["username"], "ISSUE_CERTIFICATE", "CERTIFICATE", cert_id, f"إصدار شهادة تخرج للطالب {student['full_name']} بكود {cert_code}")

    return {
        "success": True,
        "certificate_id": cert_id,
        "certificate_code": cert_code,
        "message": {"ar": "تم إصدار الشهادة المعتمدة بنجاح", "en": "Certificate issued successfully"}
    }

@router.get("/certificates/{cert_code}")
def get_certificate_details(cert_code: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches printable certificate template details."""
    cert = query_one("""
        SELECT 
            c.*,
            s.student_code, s.full_name as student_name, s.full_name_en as student_name_en, s.national_id,
            cr.name_ar as course_name_ar, cr.name_en as course_name_en, cr.total_hours,
            g.group_name,
            u.full_name as issued_by_name
        FROM certificates c
        JOIN students s ON c.student_id = s.id
        JOIN courses cr ON c.course_id = cr.id
        LEFT JOIN training_groups g ON c.group_id = g.id
        LEFT JOIN users u ON c.issued_by = u.id
        WHERE c.certificate_code = ?
    """, (cert_code,))
    if not cert:
        raise HTTPException(status_code=404, detail={"ar": "الشهادة غير موجودة", "en": "Certificate not found"})

    return {"certificate": cert}

@router.get("/public/verify/{cert_code}")
def verify_certificate_public(cert_code: str):
    """Public verification endpoint allowing employers or students to verify certificate authenticity."""
    cert = query_one("""
        SELECT 
            c.certificate_code, c.issue_date, c.completion_date, c.grade_label, c.is_valid,
            s.full_name as student_name, s.full_name_en as student_name_en,
            cr.name_ar as course_name_ar, cr.name_en as course_name_en, cr.total_hours
        FROM certificates c
        JOIN students s ON c.student_id = s.id
        JOIN courses cr ON c.course_id = cr.id
        WHERE c.certificate_code = ?
    """, (cert_code,))

    if not cert or not cert["is_valid"]:
        return {
            "valid": False,
            "message": {"ar": "عذراً، كود الشهادة غير معتمد أو غير صالح في سجلات أكاديمية دوز وايز", "en": "Certificate not valid or not found"}
        }

    return {
        "valid": True,
        "certificate": cert,
        "academy": "أكاديمية دوز وايز للتدريب والاستشارات (DoseWise Academy)"
    }

@router.delete("/exams/{exam_id}")
def delete_exam(
    exam_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Deletes an exam and all submitted student results for it."""
    exam = query_one("SELECT * FROM assessments WHERE id = ?", (exam_id,))
    if not exam:
        raise HTTPException(status_code=404, detail={"ar": "الاختبار غير موجود", "en": "Exam not found"})

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM assessment_results WHERE assessment_id = ?", (exam_id,))
        cur.execute("DELETE FROM assessments WHERE id = ?", (exam_id,))

    log_audit(current_user["id"], current_user["username"], "DELETE_EXAM", "EXAM", exam_id, f"حذف الاختبار {exam['title']}")
    return {"success": True, "message": {"ar": "تم حذف الاختبار وسجل درجاته بنجاح", "en": "Exam deleted successfully"}}

@router.delete("/certificates/{certificate_id}")
def delete_certificate(
    certificate_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Deletes an issued certificate."""
    cert = query_one("SELECT * FROM certificates WHERE id = ?", (certificate_id,))
    if not cert:
        raise HTTPException(status_code=404, detail={"ar": "الشهادة غير موجودة", "en": "Certificate not found"})

    execute_update("DELETE FROM certificates WHERE id = ?", (certificate_id,))
    log_audit(current_user["id"], current_user["username"], "DELETE_CERTIFICATE", "CERTIFICATE", certificate_id, f"حذف الشهادة كود {cert['certificate_code']}")
    return {"success": True, "message": {"ar": "تم حذف الشهادة بنجاح", "en": "Certificate deleted successfully"}}
