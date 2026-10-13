from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST, ROLE_TRAINER
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance Management"])

class StudentAttendanceItem(BaseModel):
    student_id: int
    status: str # Present, Absent, Late, Excused
    notes: Optional[str] = None

class SessionAttendanceSubmitRequest(BaseModel):
    attendances: List[StudentAttendanceItem]

@router.get("/session/{session_id}")
def get_session_attendance(session_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches the session roster and recorded attendance for all enrolled students."""
    session = query_one("""
        SELECT 
            s.*,
            g.group_name, g.group_code, g.course_id,
            c.name_ar as course_name_ar, c.name_en as course_name_en,
            t.full_name as trainer_name
        FROM sessions s
        JOIN training_groups g ON s.group_id = g.id
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN trainers t ON s.trainer_id = t.id
        WHERE s.id = ?
    """, (session_id,))
    if not session:
        raise HTTPException(status_code=404, detail={"ar": "المحاضرة غير موجودة", "en": "Session not found"})

    # Get enrolled students for this group
    students = query_all("""
        SELECT 
            s.id as student_id, s.student_code, s.full_name, s.mobile_number, s.whatsapp_number,
            COALESCE(a.status, 'Present') as status,
            a.notes,
            a.created_at as recorded_at,
            u.full_name as recorded_by_name,
            (SELECT COUNT(*) FROM attendance prev_a 
             JOIN sessions prev_s ON prev_a.session_id = prev_s.id
             WHERE prev_s.group_id = ? AND prev_a.student_id = s.id AND prev_a.status = 'Absent') as previous_absences_count
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        LEFT JOIN attendance a ON a.session_id = ? AND a.student_id = s.id
        LEFT JOIN users u ON a.recorded_by = u.id
        WHERE e.group_id = ?
        ORDER BY s.full_name ASC
    """, (session["group_id"], session_id, session["group_id"]))

    return {
        "session": session,
        "students": students
    }

@router.post("/session/{session_id}")
def record_session_attendance(
    session_id: int,
    req: SessionAttendanceSubmitRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST, ROLE_TRAINER]))
):
    """Submits or updates attendance records for an entire session with absence alerts."""
    session = query_one("SELECT * FROM sessions WHERE id = ?", (session_id,))
    if not session:
        raise HTTPException(status_code=404, detail={"ar": "المحاضرة غير موجودة", "en": "Session not found"})

    now_iso = datetime.now().isoformat()

    with db_transaction() as conn:
        cur = conn.cursor()
        for item in req.attendances:
            # Check if record exists
            existing = query_one("SELECT id FROM attendance WHERE session_id = ? AND student_id = ?", (session_id, item.student_id))
            if existing:
                cur.execute("""
                    UPDATE attendance SET
                        status = ?, notes = ?, recorded_by = ?
                    WHERE session_id = ? AND student_id = ?
                """, (item.status, item.notes, current_user["id"], session_id, item.student_id))
            else:
                cur.execute("""
                    INSERT INTO attendance (session_id, student_id, status, notes, recorded_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (session_id, item.student_id, item.status, item.notes, current_user["id"], now_iso))

            # If marked Absent, check total absences for this student in this group
            if item.status == "Absent":
                abs_cnt = query_one("""
                    SELECT COUNT(*) as c FROM attendance a
                    JOIN sessions s ON a.session_id = s.id
                    WHERE s.group_id = ? AND a.student_id = ? AND a.status = 'Absent'
                """, (session["group_id"], item.student_id))["c"]
                if abs_cnt >= 3:
                    st_info = query_one("SELECT full_name FROM students WHERE id = ?", (item.student_id,))
                    st_name = st_info["full_name"] if st_info else f"الطالب رقم {item.student_id}"
                    # Insert notification
                    cur.execute("""
                        INSERT INTO notifications (title_ar, title_en, message_ar, message_en, notification_type, priority, related_entity_type, related_entity_id, is_read, created_at)
                        VALUES (?, ?, ?, ?, 'repeated_absence', 'high', 'student', ?, 0, ?)
                    """, (
                        "تنبيه غياب متكرر لطالب",
                        "Repeated Student Absence Alert",
                        f"تجاوز الطالب {st_name} عدد 3 غيابات في المجموعة. يرجى التواصل معه لتجنب الحرمان.",
                        f"Student {st_name} reached 3 absences in the group.",
                        item.student_id,
                        now_iso
                    ))

        # Mark session as Completed
        cur.execute("UPDATE sessions SET status = 'Completed' WHERE id = ?", (session_id,))

    log_audit(current_user["id"], current_user["username"], "RECORD_ATTENDANCE", "SESSION", session_id, f"تسجيل حضور {len(req.attendances)} طالب للمحاضرة رقم {session['session_number']}")

    return {"success": True, "message": {"ar": "تم حفظ سجل الحضور والغياب بنجاح", "en": "Attendance recorded successfully"}}

@router.get("/repeated-absences")
def get_repeated_absences(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns all students having 3 or more absences in any training group."""
    absentees = query_all("""
        SELECT 
            s.id as student_id, s.student_code, s.full_name, s.mobile_number, s.whatsapp_number,
            g.id as group_id, g.group_name,
            c.name_ar as course_name,
            COUNT(a.id) as absences_count
        FROM attendance a
        JOIN sessions sess ON a.session_id = sess.id
        JOIN training_groups g ON sess.group_id = g.id
        JOIN courses c ON g.course_id = c.id
        JOIN students s ON a.student_id = s.id
        WHERE a.status = 'Absent'
        GROUP BY s.id, g.id
        HAVING COUNT(a.id) >= 3
        ORDER BY absences_count DESC
    """)
    return {"absentees": absentees}
