import io
import csv
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST, ROLE_ACCOUNTANT
)

router = APIRouter(prefix="/api/students", tags=["Students"])

class StudentCreateRequest(BaseModel):
    full_name: str
    full_name_en: Optional[str] = None
    national_id: Optional[str] = None
    mobile_number: str
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = "Male"
    address: Optional[str] = None
    qualification: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Active"

class StudentUpdateRequest(BaseModel):
    full_name: str
    full_name_en: Optional[str] = None
    national_id: Optional[str] = None
    mobile_number: str
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = "Male"
    address: Optional[str] = None
    qualification: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Active"

@router.get("")
def list_students(
    q: Optional[str] = None,
    status: Optional[str] = None,
    course_id: Optional[int] = None,
    has_debt: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves paginated and filtered list of students with total debt and active enrollments."""
    where_clauses = ["1=1"]
    params = []

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        where_clauses.append("(s.full_name LIKE ? OR s.student_code LIKE ? OR s.mobile_number LIKE ? OR s.national_id LIKE ?)")
        params.extend([search_term, search_term, search_term, search_term])

    if status and status.strip():
        where_clauses.append("s.status = ?")
        params.append(status.strip())

    if course_id:
        where_clauses.append("EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.course_id = ?)")
        params.append(course_id)

    if has_debt is True:
        where_clauses.append("EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id AND e.balance_due > 0)")

    where_sql = " AND ".join(where_clauses)
    offset = (page - 1) * limit

    count_row = query_one(f"SELECT COUNT(*) as c FROM students s WHERE {where_sql}", tuple(params))
    total_count = count_row["c"] if count_row else 0

    students_query = f"""
        SELECT 
            s.*,
            (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id) as enrollments_count,
            (SELECT COALESCE(SUM(e.balance_due), 0.0) FROM enrollments e WHERE e.student_id = s.id) as total_debt,
            (SELECT GROUP_CONCAT(c.name_ar, '، ') FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = s.id) as enrolled_courses_ar
        FROM students s
        WHERE {where_sql}
        ORDER BY s.id DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    students = query_all(students_query, tuple(params))

    return {
        "items": students,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1
    }

@router.get("/export")
def export_students_csv(
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Exports student database into Excel-compatible UTF-8 CSV with Arabic support."""
    where_sql = "1=1"
    params = []
    if status:
        where_sql += " AND s.status = ?"
        params.append(status)

    students = query_all(f"""
        SELECT 
            s.student_code, s.full_name, s.national_id, s.mobile_number, s.whatsapp_number,
            s.email, s.qualification, s.registration_date, s.status,
            COALESCE((SELECT SUM(balance_due) FROM enrollments WHERE student_id = s.id), 0.0) as debt
        FROM students s
        WHERE {where_sql}
        ORDER BY s.id ASC
    """, tuple(params))

    output = io.StringIO()
    # Excel UTF-8 BOM
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow(["كود الطالب", "الاسم الكامل", "الرقم القومي", "رقم الهاتف", "الواتساب", "البريد الإلكتروني", "المؤهل الدراسي", "تاريخ التسجيل", "الحالة", "الرصيد المستحق (ج.م)"])

    for s in students:
        writer.writerow([
            s["student_code"], s["full_name"], s["national_id"] or "",
            s["mobile_number"], s["whatsapp_number"] or "", s["email"] or "",
            s["qualification"] or "", s["registration_date"], s["status"], s["debt"]
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=dosewise_students_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.get("/{student_id}")
def get_student_profile(student_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches complete student profile with enrollments, payments, installments, and attendance."""
    student = query_one("SELECT * FROM students WHERE id = ?", (student_id,))
    if not student:
        raise HTTPException(status_code=404, detail={"ar": "الطالب غير موجود", "en": "Student not found"})

    # 1. Enrollments
    enrollments = query_all("""
        SELECT 
            e.*,
            c.code as course_code, c.name_ar as course_name_ar, c.name_en as course_name_en,
            g.group_code, g.group_name, g.start_date, g.end_date, g.classroom_name,
            t.full_name as trainer_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN training_groups g ON e.group_id = g.id
        LEFT JOIN trainers t ON g.trainer_id = t.id
        WHERE e.student_id = ?
        ORDER BY e.id DESC
    """, (student_id,))

    # 2. Payments
    payments = query_all("""
        SELECT p.*, u.full_name as recorded_by_name, c.name_ar as course_name
        FROM payments p
        JOIN enrollments e ON p.enrollment_id = e.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE p.student_id = ?
        ORDER BY p.id DESC
    """, (student_id,))

    # 3. Scheduled Installments
    installments = query_all("""
        SELECT i.*, c.name_ar as course_name
        FROM installments i
        JOIN enrollments e ON i.enrollment_id = e.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
        ORDER BY i.due_date ASC
    """, (student_id,))

    # 4. Attendance History & Stats
    attendance_records = query_all("""
        SELECT 
            a.*, s.session_number, s.session_date, s.start_time, s.classroom_name,
            c.name_ar as course_name, g.group_name,
            u.full_name as recorded_by_name
        FROM attendance a
        JOIN sessions s ON a.session_id = s.id
        JOIN training_groups g ON s.group_id = g.id
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN users u ON a.recorded_by = u.id
        WHERE a.student_id = ?
        ORDER BY s.session_date DESC
    """, (student_id,))

    total_att = len(attendance_records)
    present_cnt = sum(1 for r in attendance_records if r["status"] == "Present")
    attendance_percentage = round((present_cnt / total_att) * 100, 1) if total_att > 0 else 100.0

    # 5. Certificates
    certificates = query_all("""
        SELECT cert.*, c.name_ar as course_name_ar, c.name_en as course_name_en, u.full_name as issued_by_name
        FROM certificates cert
        JOIN courses c ON cert.course_id = c.id
        LEFT JOIN users u ON cert.issued_by = u.id
        WHERE cert.student_id = ?
        ORDER BY cert.id DESC
    """, (student_id,))

    # 6. Assessment results
    assessments = query_all("""
        SELECT ar.*, a.title, a.max_score, a.passing_score, c.name_ar as course_name
        FROM assessment_results ar
        JOIN assessments a ON ar.assessment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE ar.student_id = ?
        ORDER BY ar.id DESC
    """, (student_id,))

    return {
        "student": student,
        "enrollments": enrollments,
        "payments": payments,
        "installments": installments,
        "attendance": {
            "records": attendance_records,
            "total_sessions_recorded": total_att,
            "present_count": present_cnt,
            "attendance_rate": attendance_percentage
        },
        "certificates": certificates,
        "assessments": assessments
    }

@router.post("")
def create_student(
    req: StudentCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Registers a new student with duplicate prevention."""
    mobile = req.mobile_number.strip()
    national_id = req.national_id.strip() if req.national_id else None

    # Duplicate check on mobile
    existing_phone = query_one("SELECT id, full_name, student_code FROM students WHERE mobile_number = ?", (mobile,))
    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail={
                "ar": f"رقم الهاتف مسجل بالفعل للطالب: {existing_phone['full_name']} (كود: {existing_phone['student_code']})",
                "en": f"Mobile number already registered to student: {existing_phone['full_name']}"
            }
        )

    # Duplicate check on national ID if provided
    if national_id:
        existing_nid = query_one("SELECT id, full_name, student_code FROM students WHERE national_id = ?", (national_id,))
        if existing_nid:
            raise HTTPException(
                status_code=400,
                detail={
                    "ar": f"الرقم القومي مسجل بالفعل للطالب: {existing_nid['full_name']} (كود: {existing_nid['student_code']})",
                    "en": f"National ID already registered to student: {existing_nid['full_name']}"
                }
            )

    # Generate new student code
    last_id_row = query_one("SELECT COALESCE(MAX(id), 0) as max_id FROM students")
    next_id = (last_id_row["max_id"] if last_id_row else 0) + 1
    student_code = f"STU-{datetime.now().year}-{next_id:04d}"

    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    new_id = execute_insert("""
        INSERT INTO students (
            student_code, full_name, full_name_en, national_id, mobile_number, whatsapp_number,
            email, date_of_birth, gender, address, qualification, registration_date,
            emergency_name, emergency_phone, notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        student_code, req.full_name.strip(), req.full_name_en, national_id, mobile,
        req.whatsapp_number.strip() if req.whatsapp_number else mobile,
        req.email.strip() if req.email else None,
        req.date_of_birth, req.gender, req.address, req.qualification,
        today_str, req.emergency_name, req.emergency_phone, req.notes,
        req.status or "Active", now_iso, now_iso
    ))

    log_audit(current_user["id"], current_user["username"], "CREATE_STUDENT", "STUDENT", new_id, f"تسجيل طالب جديد: {req.full_name} ({student_code})")

    return {
        "success": True,
        "id": new_id,
        "student_code": student_code,
        "message": {"ar": "تم تسجيل الطالب بنجاح", "en": "Student registered successfully"}
    }

@router.put("/{student_id}")
def update_student(
    student_id: int,
    req: StudentUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Updates student information."""
    student = query_one("SELECT id FROM students WHERE id = ?", (student_id,))
    if not student:
        raise HTTPException(status_code=404, detail={"ar": "الطالب غير موجود", "en": "Student not found"})

    now_iso = datetime.now().isoformat()
    execute_update("""
        UPDATE students SET
            full_name = ?, full_name_en = ?, national_id = ?, mobile_number = ?, whatsapp_number = ?,
            email = ?, date_of_birth = ?, gender = ?, address = ?, qualification = ?,
            emergency_name = ?, emergency_phone = ?, notes = ?, status = ?, updated_at = ?
        WHERE id = ?
    """, (
        req.full_name.strip(), req.full_name_en, req.national_id.strip() if req.national_id else None,
        req.mobile_number.strip(), req.whatsapp_number.strip() if req.whatsapp_number else req.mobile_number.strip(),
        req.email.strip() if req.email else None, req.date_of_birth, req.gender, req.address,
        req.qualification, req.emergency_name, req.emergency_phone, req.notes, req.status,
        now_iso, student_id
    ))

    log_audit(current_user["id"], current_user["username"], "UPDATE_STUDENT", "STUDENT", student_id, f"تعديل بيانات الطالب رقم {student_id}")
    return {"success": True, "message": {"ar": "تم تحديث بيانات الطالب بنجاح", "en": "Student updated successfully"}}

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Deletes a student and cleans up related records cleanly."""
    student = query_one("SELECT * FROM students WHERE id = ?", (student_id,))
    if not student:
        raise HTTPException(status_code=404, detail={"ar": "الطالب غير موجود", "en": "Student not found"})

    with db_transaction() as conn:
        cur = conn.cursor()
        # 1. Unlink converted leads
        cur.execute("UPDATE leads SET converted_student_id = NULL WHERE converted_student_id = ?", (student_id,))

        # 2. Delete certificates, assessment results, and attendance
        cur.execute("DELETE FROM certificates WHERE student_id = ?", (student_id,))
        cur.execute("DELETE FROM assessment_results WHERE student_id = ?", (student_id,))
        cur.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
        
        # 3. Clean enrollments, installments, adjustments, and payments
        cur.execute("SELECT id FROM enrollments WHERE student_id = ?", (student_id,))
        enr_ids = [r[0] for r in cur.fetchall()]
        if enr_ids:
            enr_placeholders = ",".join("?" * len(enr_ids))
            cur.execute(f"DELETE FROM installments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM refunds_adjustments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM payments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM enrollments WHERE id IN ({enr_placeholders})", enr_ids)

        # 4. Clean any remaining payments or adjustments by student_id
        cur.execute("DELETE FROM refunds_adjustments WHERE payment_id IN (SELECT id FROM payments WHERE student_id = ?)", (student_id,))
        cur.execute("DELETE FROM payments WHERE student_id = ?", (student_id,))
        cur.execute("DELETE FROM enrollments WHERE student_id = ?", (student_id,))

        # 5. Delete student
        cur.execute("DELETE FROM students WHERE id = ?", (student_id,))

    log_audit(current_user["id"], current_user["username"], "DELETE_STUDENT", "STUDENT", student_id, f"حذف الطالب {student['full_name']}")
    return {"success": True, "message": {"ar": "تم حذف الطالب وسجلاته بنجاح", "en": "Student deleted successfully"}}
