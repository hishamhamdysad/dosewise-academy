from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER

router = APIRouter(prefix="/api/courses", tags=["Courses"])

class CourseCreateRequest(BaseModel):
    code: str
    name_ar: str
    name_en: str
    category: str
    description: Optional[str] = None
    level: Optional[str] = "Intermediate"
    training_type: Optional[str] = "In-person"
    total_hours: Optional[int] = 30
    sessions_count: Optional[int] = 10
    standard_price: float
    min_capacity: Optional[int] = 5
    max_capacity: Optional[int] = 25
    prerequisites: Optional[str] = None
    materials: Optional[str] = None
    status: Optional[str] = "Active"

class CourseUpdateRequest(BaseModel):
    code: str
    name_ar: str
    name_en: str
    category: str
    description: Optional[str] = None
    level: Optional[str] = "Intermediate"
    training_type: Optional[str] = "In-person"
    total_hours: Optional[int] = 30
    sessions_count: Optional[int] = 10
    standard_price: float
    min_capacity: Optional[int] = 5
    max_capacity: Optional[int] = 25
    prerequisites: Optional[str] = None
    materials: Optional[str] = None
    status: Optional[str] = "Active"

@router.get("")
def list_courses(category: Optional[str] = None, status: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieves all courses with live statistics regarding active groups, enrollments, and revenue."""
    where_clauses = ["1=1"]
    params = []
    if category:
        where_clauses.append("c.category = ?")
        params.append(category)
    if status:
        where_clauses.append("c.status = ?")
        params.append(status)

    where_sql = " AND ".join(where_clauses)
    query = f"""
        SELECT 
            c.*,
            (SELECT COUNT(*) FROM training_groups g WHERE g.course_id = c.id AND g.status = 'Active') as active_groups_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as total_enrollments,
            (SELECT COALESCE(SUM(e.final_price), 0.0) FROM enrollments e WHERE e.course_id = c.id) as total_revenue,
            (SELECT COALESCE(SUM(e.total_paid), 0.0) FROM enrollments e WHERE e.course_id = c.id) as total_collected
        FROM courses c
        WHERE {where_sql}
        ORDER BY c.id DESC
    """
    courses = query_all(query, tuple(params))
    return {"courses": courses}

@router.get("/{course_id}")
def get_course(course_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches course details along with its groups and enrollment stats."""
    course = query_one("SELECT * FROM courses WHERE id = ?", (course_id,))
    if not course:
        raise HTTPException(status_code=404, detail={"ar": "الدورة غير موجودة", "en": "Course not found"})

    groups = query_all("""
        SELECT 
            g.*,
            t.full_name as trainer_name,
            (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id) as enrolled_students,
            (SELECT COUNT(*) FROM sessions s WHERE s.group_id = g.id AND s.status = 'Completed') as completed_sessions,
            (SELECT COUNT(*) FROM sessions s WHERE s.group_id = g.id) as total_sessions
        FROM training_groups g
        LEFT JOIN trainers t ON g.trainer_id = t.id
        WHERE g.course_id = ?
        ORDER BY g.id DESC
    """, (course_id,))

    return {"course": course, "groups": groups}

@router.post("")
def create_course(
    req: CourseCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Creates a new course entry in the catalog."""
    existing = query_one("SELECT id FROM courses WHERE code = ?", (req.code.strip(),))
    if existing:
        raise HTTPException(status_code=400, detail={"ar": "كود الدورة مستخدم بالفعل", "en": "Course code already exists"})

    now_iso = datetime.now().isoformat()
    new_id = execute_insert("""
        INSERT INTO courses (
            code, name_ar, name_en, category, description, level, training_type,
            total_hours, sessions_count, standard_price, min_capacity, max_capacity,
            prerequisites, materials, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.code.strip().upper(), req.name_ar.strip(), req.name_en.strip(), req.category.strip(),
        req.description, req.level, req.training_type, req.total_hours or 30, req.sessions_count or 10,
        req.standard_price, req.min_capacity or 5, req.max_capacity or 25,
        req.prerequisites, req.materials, req.status or "Active", now_iso
    ))

    log_audit(current_user["id"], current_user["username"], "CREATE_COURSE", "COURSE", new_id, f"إضافة دورة تدريبية: {req.name_ar} ({req.code})")
    return {"success": True, "id": new_id, "message": {"ar": "تم إنشاء الدورة بنجاح", "en": "Course created successfully"}}

@router.put("/{course_id}")
def update_course(
    course_id: int,
    req: CourseUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Updates course information."""
    course = query_one("SELECT id FROM courses WHERE id = ?", (course_id,))
    if not course:
        raise HTTPException(status_code=404, detail={"ar": "الدورة غير موجودة", "en": "Course not found"})

    execute_update("""
        UPDATE courses SET
            code = ?, name_ar = ?, name_en = ?, category = ?, description = ?,
            level = ?, training_type = ?, total_hours = ?, sessions_count = ?,
            standard_price = ?, min_capacity = ?, max_capacity = ?,
            prerequisites = ?, materials = ?, status = ?
        WHERE id = ?
    """, (
        req.code.strip().upper(), req.name_ar.strip(), req.name_en.strip(), req.category.strip(),
        req.description, req.level, req.training_type, req.total_hours, req.sessions_count,
        req.standard_price, req.min_capacity, req.max_capacity,
        req.prerequisites, req.materials, req.status, course_id
    ))

    log_audit(current_user["id"], current_user["username"], "UPDATE_COURSE", "COURSE", course_id, f"تعديل بيانات الدورة رقم {course_id}")
    return {"success": True, "message": {"ar": "تم تحديث الدورة بنجاح", "en": "Course updated successfully"}}

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Permanently deletes a course and its associated groups/sessions."""
    course = query_one("SELECT * FROM courses WHERE id = ?", (course_id,))
    if not course:
        raise HTTPException(status_code=404, detail={"ar": "الدورة غير موجودة", "en": "Course not found"})

    with db_transaction() as conn:
        cur = conn.cursor()
        
        # 1. Clean certificates and assessments
        cur.execute("DELETE FROM certificates WHERE course_id = ?", (course_id,))
        cur.execute("DELETE FROM assessment_results WHERE assessment_id IN (SELECT id FROM assessments WHERE course_id = ?)", (course_id,))
        cur.execute("DELETE FROM assessments WHERE course_id = ?", (course_id,))

        # 2. Clean enrollments and their payments/installments
        cur.execute("""
            SELECT id FROM enrollments 
            WHERE course_id = ? OR group_id IN (SELECT id FROM training_groups WHERE course_id = ?)
        """, (course_id, course_id))
        enr_ids = [r[0] for r in cur.fetchall()]
        if enr_ids:
            enr_placeholders = ",".join("?" * len(enr_ids))
            cur.execute(f"DELETE FROM refunds_adjustments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM payments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM installments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM enrollments WHERE id IN ({enr_placeholders})", enr_ids)

        # 3. Clean attendance and sessions
        cur.execute("""
            DELETE FROM attendance WHERE session_id IN (
                SELECT id FROM sessions WHERE group_id IN (SELECT id FROM training_groups WHERE course_id = ?)
            )
        """, (course_id,))
        cur.execute("DELETE FROM sessions WHERE group_id IN (SELECT id FROM training_groups WHERE course_id = ?)", (course_id,))

        # 4. Clean groups
        cur.execute("DELETE FROM training_groups WHERE course_id = ?", (course_id,))

        # 5. Unlink leads
        cur.execute("UPDATE leads SET interested_course_id = NULL WHERE interested_course_id = ?", (course_id,))

        # 6. Delete course
        cur.execute("DELETE FROM courses WHERE id = ?", (course_id,))

    log_audit(current_user["id"], current_user["username"], "DELETE_COURSE", "COURSE", course_id, f"حذف الدورة التدريبية {course['name_ar']}")
    return {"success": True, "message": {"ar": "تم حذف الدورة التدريبية ومجموعاتها بنجاح", "en": "Course and related groups deleted successfully"}}
