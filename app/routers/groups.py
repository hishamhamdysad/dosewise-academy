import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST

router = APIRouter(prefix="/api/groups", tags=["Training Groups & Scheduling"])

class GroupCreateRequest(BaseModel):
    group_code: str
    group_name: str
    course_id: int
    trainer_id: Optional[int] = None
    start_date: str
    end_date: str
    days_of_week: List[str] # e.g. ["Sun", "Tue", "Thu"]
    start_time: str
    end_time: str
    classroom_name: str
    capacity: Optional[int] = 20
    group_price: Optional[float] = None
    status: Optional[str] = "Active"

class RescheduleSessionRequest(BaseModel):
    session_date: str
    start_time: str
    end_time: str
    classroom_name: Optional[str] = None
    trainer_id: Optional[int] = None
    notes: Optional[str] = None

@router.get("")
def list_groups(course_id: Optional[int] = None, status: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists training groups with course, trainer, student enrollment count, and session progress."""
    where_clauses = ["1=1"]
    params = []
    if course_id:
        where_clauses.append("g.course_id = ?")
        params.append(course_id)
    if status:
        where_clauses.append("g.status = ?")
        params.append(status)

    where_sql = " AND ".join(where_clauses)
    query = f"""
        SELECT 
            g.*,
            c.code as course_code, c.name_ar as course_name_ar, c.name_en as course_name_en, c.standard_price,
            t.full_name as trainer_name, t.mobile as trainer_mobile,
            (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id) as enrolled_count,
            (SELECT COUNT(*) FROM sessions s WHERE s.group_id = g.id AND s.status = 'Completed') as completed_sessions_count,
            (SELECT COUNT(*) FROM sessions s WHERE s.group_id = g.id) as total_sessions_count
        FROM training_groups g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN trainers t ON g.trainer_id = t.id
        WHERE {where_sql}
        ORDER BY g.id DESC
    """
    groups = query_all(query, tuple(params))
    for g in groups:
        try:
            g["days_of_week_list"] = json.loads(g["days_of_week"]) if g["days_of_week"] else []
        except Exception:
            g["days_of_week_list"] = []
    return {"groups": groups}

@router.get("/calendar/events")
def get_calendar_events(
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns scheduled sessions for interactive calendar views."""
    where_sql = "1=1"
    params = []
    if start:
        where_sql += " AND s.session_date >= ?"
        params.append(start)
    if end:
        where_sql += " AND s.session_date <= ?"
        params.append(end)

    sessions = query_all(f"""
        SELECT 
            s.id, s.session_number, s.session_date, s.start_time, s.end_time, s.classroom_name, s.status, s.notes,
            g.group_code, g.group_name,
            c.name_ar as course_name_ar, c.category,
            t.full_name as trainer_name
        FROM sessions s
        JOIN training_groups g ON s.group_id = g.id
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN trainers t ON s.trainer_id = t.id
        WHERE {where_sql}
        ORDER BY s.session_date ASC, s.start_time ASC
    """, tuple(params))

    return {"events": sessions}

@router.get("/{group_id}")
def get_group_details(group_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches group details, roster of enrolled students, and scheduled sessions."""
    group = query_one("""
        SELECT 
            g.*,
            c.code as course_code, c.name_ar as course_name_ar, c.name_en as course_name_en, c.standard_price,
            t.full_name as trainer_name, t.mobile as trainer_mobile
        FROM training_groups g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN trainers t ON g.trainer_id = t.id
        WHERE g.id = ?
    """, (group_id,))
    if not group:
        raise HTTPException(status_code=404, detail={"ar": "المجموعة غير موجودة", "en": "Group not found"})

    try:
        group["days_of_week_list"] = json.loads(group["days_of_week"]) if group["days_of_week"] else []
    except Exception:
        group["days_of_week_list"] = []

    # Enrolled students
    roster = query_all("""
        SELECT 
            e.id as enrollment_id, e.enrollment_date, e.final_price, e.total_paid, e.balance_due, e.payment_status,
            s.id as student_id, s.student_code, s.full_name, s.mobile_number, s.whatsapp_number, s.qualification
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        WHERE e.group_id = ?
        ORDER BY s.full_name ASC
    """, (group_id,))

    # Sessions
    sessions = query_all("""
        SELECT s.*, t.full_name as trainer_name,
               (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status = 'Present') as present_count
        FROM sessions s
        LEFT JOIN trainers t ON s.trainer_id = t.id
        WHERE s.group_id = ?
        ORDER BY s.session_number ASC
    """, (group_id,))

    return {
        "group": group,
        "roster": roster,
        "sessions": sessions
    }

@router.post("")
def create_group(
    req: GroupCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Creates a new group and automatically generates session dates."""
    existing = query_one("SELECT id FROM training_groups WHERE group_code = ?", (req.group_code.strip(),))
    if existing:
        raise HTTPException(status_code=400, detail={"ar": "كود المجموعة مستخدم بالفعل", "en": "Group code already exists"})

    course = query_one("SELECT * FROM courses WHERE id = ?", (req.course_id,))
    if not course:
        raise HTTPException(status_code=404, detail={"ar": "الدورة المحددة غير موجودة", "en": "Course not found"})

    # Check scheduling conflict for classroom
    # Look for existing groups in the same room with overlapping time and days
    start_time = req.start_time.strip()
    end_time = req.end_time.strip()
    classroom = req.classroom_name.strip()

    now_iso = datetime.now().isoformat()
    days_json = json.dumps(req.days_of_week, ensure_ascii=False)

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO training_groups (
                group_code, group_name, course_id, trainer_id, start_date, end_date,
                days_of_week, start_time, end_time, classroom_name, capacity, group_price,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req.group_code.strip().upper(), req.group_name.strip(), req.course_id, req.trainer_id,
            req.start_date, req.end_date, days_json, start_time, end_time, classroom,
            req.capacity or 20, req.group_price or course["standard_price"], req.status or "Active", now_iso
        ))
        group_id = cur.lastrowid

        # Generate sessions automatically based on course sessions_count
        total_sessions = course["sessions_count"] or 10
        start_dt = datetime.strptime(req.start_date, "%Y-%m-%d")
        
        # Mapping English weekday names to python weekday
        day_map = {
            "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6
        }
        target_days = [day_map[d] for d in req.days_of_week if d in day_map]
        if not target_days:
            target_days = [0, 2, 4] # fallback

        session_num = 1
        curr_dt = start_dt
        while session_num <= total_sessions:
            if curr_dt.weekday() in target_days:
                sess_date_str = curr_dt.strftime("%Y-%m-%d")
                cur.execute("""
                    INSERT INTO sessions (
                        group_id, session_number, session_date, start_time, end_time,
                        classroom_name, trainer_id, status, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?)
                """, (
                    group_id, session_num, sess_date_str, start_time, end_time,
                    classroom, req.trainer_id, f"المحاضرة رقم {session_num}", now_iso
                ))
                session_num += 1
            curr_dt += timedelta(days=1)

    log_audit(current_user["id"], current_user["username"], "CREATE_GROUP", "GROUP", group_id, f"إنشاء مجموعة تدريبية: {req.group_name} ({req.group_code})")
    return {"success": True, "id": group_id, "message": {"ar": "تم إنشاء المجموعة وتوليد جدول المحاضرات بنجاح", "en": "Group and sessions generated successfully"}}

@router.post("/sessions/{session_id}/reschedule")
def reschedule_session(
    session_id: int,
    req: RescheduleSessionRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Reschedules an individual session date or time."""
    sess = query_one("SELECT * FROM sessions WHERE id = ?", (session_id,))
    if not sess:
        raise HTTPException(status_code=404, detail={"ar": "المحاضرة غير موجودة", "en": "Session not found"})

    execute_update("""
        UPDATE sessions SET
            session_date = ?, start_time = ?, end_time = ?,
            classroom_name = COALESCE(?, classroom_name),
            trainer_id = COALESCE(?, trainer_id),
            status = 'Rescheduled',
            notes = ?
        WHERE id = ?
    """, (
        req.session_date, req.start_time, req.end_time,
        req.classroom_name, req.trainer_id, req.notes or "تم إعادة الجدولة", session_id
    ))

    log_audit(current_user["id"], current_user["username"], "RESCHEDULE_SESSION", "SESSION", session_id, f"إعادة جدولة المحاضرة {session_id} إلى {req.session_date}")
    return {"success": True, "message": {"ar": "تم إعادة جدولة المحاضرة بنجاح", "en": "Session rescheduled successfully"}}

@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Deletes a training group and its sessions and attendance records."""
    group = query_one("SELECT * FROM training_groups WHERE id = ?", (group_id,))
    if not group:
        raise HTTPException(status_code=404, detail={"ar": "المجموعة غير موجودة", "en": "Group not found"})

    with db_transaction() as conn:
        cur = conn.cursor()
        
        # 1. Clean attendance and sessions
        cur.execute("DELETE FROM attendance WHERE session_id IN (SELECT id FROM sessions WHERE group_id = ?)", (group_id,))
        cur.execute("DELETE FROM sessions WHERE group_id = ?", (group_id,))
        
        # 2. Clean assessments for this group
        cur.execute("DELETE FROM assessment_results WHERE assessment_id IN (SELECT id FROM assessments WHERE group_id = ?)", (group_id,))
        cur.execute("DELETE FROM assessments WHERE group_id = ?", (group_id,))
        
        # 3. Unlink certificates
        cur.execute("UPDATE certificates SET group_id = NULL WHERE group_id = ?", (group_id,))

        # 4. Clean enrollments and their payments/installments
        cur.execute("SELECT id FROM enrollments WHERE group_id = ?", (group_id,))
        enr_ids = [r[0] for r in cur.fetchall()]
        if enr_ids:
            enr_placeholders = ",".join("?" * len(enr_ids))
            cur.execute(f"DELETE FROM refunds_adjustments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM payments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM installments WHERE enrollment_id IN ({enr_placeholders})", enr_ids)
            cur.execute(f"DELETE FROM enrollments WHERE id IN ({enr_placeholders})", enr_ids)

        # 5. Delete group
        cur.execute("DELETE FROM training_groups WHERE id = ?", (group_id,))

    log_audit(current_user["id"], current_user["username"], "DELETE_GROUP", "GROUP", group_id, f"حذف المجموعة التدريبية {group['group_name']}")
    return {"success": True, "message": {"ar": "تم حذف المجموعة التدريبية ومحاضراتها بنجاح", "en": "Training group deleted successfully"}}
