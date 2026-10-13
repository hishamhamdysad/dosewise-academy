from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST
)

router = APIRouter(prefix="/api/leads", tags=["CRM & Leads Management"])

class LeadCreateRequest(BaseModel):
    full_name: str
    phone: str
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    interested_course_id: Optional[int] = None
    source: Optional[str] = "Facebook" # Facebook, Instagram, TikTok, Referral, Walk_In, Website, Other
    follow_up_date: Optional[str] = None
    assigned_to: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = "New" # New, Contacted, Interested, Registered, Lost

class LeadUpdateRequest(BaseModel):
    full_name: str
    phone: str
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    interested_course_id: Optional[int] = None
    source: Optional[str] = "Facebook"
    follow_up_date: Optional[str] = None
    assigned_to: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = "New"

@router.get("")
def list_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    course_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves prospective students leads pipeline."""
    where_clauses = ["1=1"]
    params = []

    if status:
        where_clauses.append("l.status = ?")
        params.append(status)
    if source:
        where_clauses.append("l.source = ?")
        params.append(source)
    if course_id:
        where_clauses.append("l.interested_course_id = ?")
        params.append(course_id)

    where_sql = " AND ".join(where_clauses)
    leads = query_all(f"""
        SELECT 
            l.*,
            c.name_ar as course_name_ar, c.code as course_code,
            u.full_name as assigned_to_name,
            s.student_code as converted_student_code
        FROM leads l
        LEFT JOIN courses c ON l.interested_course_id = c.id
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN students s ON l.converted_student_id = s.id
        WHERE {where_sql}
        ORDER BY l.id DESC
    """, tuple(params))

    # Conversion rate stats
    total_leads = len(leads)
    converted_cnt = sum(1 for l in leads if l["status"] == "Registered")
    conv_rate = round((converted_cnt / total_leads) * 100, 1) if total_leads > 0 else 0.0

    return {
        "leads": leads,
        "stats": {
            "total": total_leads,
            "registered": converted_cnt,
            "conversion_rate": conv_rate
        }
    }

@router.post("")
def create_lead(
    req: LeadCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Adds a new sales/marketing lead."""
    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    new_id = execute_insert("""
        INSERT INTO leads (
            full_name, phone, whatsapp, email, interested_course_id, source,
            inquiry_date, follow_up_date, assigned_to, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.full_name.strip(), req.phone.strip(),
        req.whatsapp.strip() if req.whatsapp else req.phone.strip(),
        req.email.strip() if req.email else None,
        req.interested_course_id, req.source or "Facebook", today_str,
        req.follow_up_date or today_str, req.assigned_to or current_user["id"],
        req.status or "New", req.notes, now_iso
    ))

    log_audit(current_user["id"], current_user["username"], "CREATE_LEAD", "LEAD", new_id, f"إضافة عميل محتمل جديد: {req.full_name} ({req.source})")
    return {"success": True, "id": new_id, "message": {"ar": "تم إضافة العميل المحتمل بنجاح", "en": "Lead created successfully"}}

@router.put("/{lead_id}")
def update_lead(
    lead_id: int,
    req: LeadUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Updates lead contact progress and status."""
    execute_update("""
        UPDATE leads SET
            full_name = ?, phone = ?, whatsapp = ?, email = ?,
            interested_course_id = ?, source = ?, follow_up_date = ?,
            assigned_to = ?, status = ?, notes = ?
        WHERE id = ?
    """, (
        req.full_name.strip(), req.phone.strip(), req.whatsapp, req.email,
        req.interested_course_id, req.source, req.follow_up_date,
        req.assigned_to, req.status, req.notes, lead_id
    ))
    return {"success": True, "message": {"ar": "تم تحديث بيانات العميل بنجاح", "en": "Lead updated successfully"}}

@router.post("/{lead_id}/convert")
def convert_lead_to_student(
    lead_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Converts a lead into an officially registered student seamlessly."""
    lead = query_one("SELECT * FROM leads WHERE id = ?", (lead_id,))
    if not lead:
        raise HTTPException(status_code=404, detail={"ar": "العميل المحتمل غير موجود", "en": "Lead not found"})

    if lead["converted_student_id"]:
        raise HTTPException(status_code=400, detail={"ar": "تم تحويل هذا العميل إلى طالب بالفعل من قبل", "en": "Lead already converted"})

    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    last_id_row = query_one("SELECT COALESCE(MAX(id), 0) as max_id FROM students")
    next_id = (last_id_row["max_id"] if last_id_row else 0) + 1
    student_code = f"STU-{datetime.now().year}-{next_id:04d}"

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO students (
                student_code, full_name, mobile_number, whatsapp_number, email,
                registration_date, notes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
        """, (
            student_code, lead["full_name"], lead["phone"], lead["whatsapp"] or lead["phone"],
            lead["email"], today_str, f"تم التحويل من قائمة العملاء المحتملين (المصدر: {lead['source']})",
            now_iso, now_iso
        ))
        student_id = cur.lastrowid

        # Update lead
        cur.execute("""
            UPDATE leads SET
                status = 'Registered',
                converted_student_id = ?
            WHERE id = ?
        """, (student_id, lead_id))

    log_audit(current_user["id"], current_user["username"], "CONVERT_LEAD", "LEAD", lead_id, f"تحويل العميل {lead['full_name']} إلى طالب مسجل كود {student_code}")

    return {
        "success": True,
        "student_id": student_id,
        "student_code": student_code,
        "message": {"ar": "تم تحويل العميل إلى طالب مسجل بنجاح", "en": "Lead successfully converted to registered student"}
    }

@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST]))
):
    """Deletes a lead from CRM."""
    lead = query_one("SELECT * FROM leads WHERE id = ?", (lead_id,))
    if not lead:
        raise HTTPException(status_code=404, detail={"ar": "العميل غير موجود", "en": "Lead not found"})

    execute_update("DELETE FROM leads WHERE id = ?", (lead_id,))
    log_audit(current_user["id"], current_user["username"], "DELETE_LEAD", "LEAD", lead_id, f"حذف العميل المحتمل {lead['full_name']}")
    return {"success": True, "message": {"ar": "تم حذف العميل بنجاح", "en": "Lead deleted successfully"}}
