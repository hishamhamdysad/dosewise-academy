from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT
)

router = APIRouter(prefix="/api/trainers", tags=["Trainers & Compensation"])

class TrainerCreateRequest(BaseModel):
    trainer_code: str
    full_name: str
    mobile: str
    email: Optional[str] = None
    specialization: str
    qualifications: Optional[str] = None
    compensation_model: str # fixed_salary, session_fee, hourly_rate, revenue_percentage, fixed_course
    compensation_rate: float
    contract_info: Optional[str] = None
    status: Optional[str] = "Active"

class TrainerUpdateRequest(BaseModel):
    full_name: str
    mobile: str
    email: Optional[str] = None
    specialization: str
    qualifications: Optional[str] = None
    compensation_model: str
    compensation_rate: float
    contract_info: Optional[str] = None
    status: Optional[str] = "Active"

class TrainerPayoutRequest(BaseModel):
    amount: float
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    sessions_count: Optional[int] = 0
    payment_method: str = "Cash" # Cash, Bank_Transfer, InstaPay
    reference_number: Optional[str] = None
    notes: Optional[str] = None

def compute_trainer_financials(trainer_id: int, comp_model: str, comp_rate: float) -> tuple[float, float, float, int]:
    """Computes total earned, total paid, balance due, and completed sessions for a trainer transparently."""
    # Completed sessions delivered
    completed_sessions = query_one("""
        SELECT COUNT(*) as c FROM sessions WHERE trainer_id = ? AND status = 'Completed'
    """, (trainer_id,))["c"]

    total_earned = 0.0
    if comp_model == "session_fee":
        total_earned = completed_sessions * comp_rate
    elif comp_model == "fixed_salary":
        total_earned = comp_rate
    elif comp_model == "hourly_rate":
        # Average 3 hours per session
        total_earned = (completed_sessions * 3) * comp_rate
    elif comp_model == "fixed_course":
        # Sum for courses assigned
        assigned_courses_count = query_one("""
            SELECT COUNT(DISTINCT course_id) as c FROM training_groups WHERE trainer_id = ?
        """, (trainer_id,))["c"]
        total_earned = assigned_courses_count * comp_rate
    elif comp_model == "revenue_percentage":
        # Percentage of collected revenue from their groups
        rev_row = query_one("""
            SELECT COALESCE(SUM(p.amount), 0.0) as s
            FROM payments p
            JOIN enrollments e ON p.enrollment_id = e.id
            JOIN training_groups g ON e.group_id = g.id
            WHERE g.trainer_id = ?
        """, (trainer_id,))
        collected = rev_row["s"] if rev_row else 0.0
        total_earned = (collected * comp_rate) / 100.0

    # Total payouts already recorded
    payouts_row = query_one("""
        SELECT COALESCE(SUM(amount), 0.0) as s FROM trainer_payouts WHERE trainer_id = ?
    """, (trainer_id,))
    total_paid = payouts_row["s"] if payouts_row else 0.0
    balance_due = max(0.0, total_earned - total_paid)

    return total_earned, total_paid, balance_due, completed_sessions

@router.get("")
def list_trainers(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists trainers with their transparent compensation analytics."""
    trainers = query_all("SELECT * FROM trainers ORDER BY id ASC")
    model_labels_ar = {
        "session_fee": "أجر محدد لكل محاضرة (Session Fee)",
        "fixed_salary": "راتب شهري ثابت (Monthly Salary)",
        "hourly_rate": "أجر بالساعة (Hourly Rate)",
        "revenue_percentage": "نسبة مئوية من إيراد الدورة (Revenue %)",
        "fixed_course": "أجر مقطوع عن الدورة كاملة (Fixed per Course)",
    }

    for tr in trainers:
        earned, paid, due, sess_count = compute_trainer_financials(tr["id"], tr["compensation_model"], tr["compensation_rate"])
        tr["total_earned"] = earned
        tr["total_paid"] = paid
        tr["balance_due"] = due
        tr["delivered_sessions_count"] = sess_count
        tr["model_label_ar"] = model_labels_ar.get(tr["compensation_model"], tr["compensation_model"])
        
        # Count active assigned groups
        tr["assigned_groups_count"] = query_one("SELECT COUNT(*) as c FROM training_groups WHERE trainer_id = ? AND status = 'Active'", (tr["id"],))["c"]

    return {"trainers": trainers}

@router.get("/{trainer_id}")
def get_trainer_details(trainer_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches detailed profile, assigned groups, delivered sessions, and payout voucher history."""
    trainer = query_one("SELECT * FROM trainers WHERE id = ?", (trainer_id,))
    if not trainer:
        raise HTTPException(status_code=404, detail={"ar": "المدرب غير موجود", "en": "Trainer not found"})

    earned, paid, due, sess_count = compute_trainer_financials(trainer["id"], trainer["compensation_model"], trainer["compensation_rate"])
    trainer["total_earned"] = earned
    trainer["total_paid"] = paid
    trainer["balance_due"] = due
    trainer["delivered_sessions_count"] = sess_count

    # Assigned groups
    groups = query_all("""
        SELECT g.*, c.name_ar as course_name_ar, c.code as course_code
        FROM training_groups g
        JOIN courses c ON g.course_id = c.id
        WHERE g.trainer_id = ?
        ORDER BY g.id DESC
    """, (trainer_id,))

    # Completed & Scheduled sessions
    sessions = query_all("""
        SELECT s.*, g.group_name, c.name_ar as course_name
        FROM sessions s
        JOIN training_groups g ON s.group_id = g.id
        JOIN courses c ON g.course_id = c.id
        WHERE s.trainer_id = ?
        ORDER BY s.session_date DESC
    """, (trainer_id,))

    # Past Payouts
    payouts = query_all("""
        SELECT tp.*, u.full_name as paid_by_name
        FROM trainer_payouts tp
        LEFT JOIN users u ON tp.paid_by = u.id
        WHERE tp.trainer_id = ?
        ORDER BY tp.id DESC
    """, (trainer_id,))

    return {
        "trainer": trainer,
        "groups": groups,
        "sessions": sessions,
        "payouts": payouts
    }

@router.post("")
def create_trainer(
    req: TrainerCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Registers a new trainer profile."""
    existing = query_one("SELECT id FROM trainers WHERE trainer_code = ?", (req.trainer_code.strip(),))
    if existing:
        raise HTTPException(status_code=400, detail={"ar": "كود المحاضر مسجل بالفعل", "en": "Trainer code already exists"})

    now_iso = datetime.now().isoformat()
    new_id = execute_insert("""
        INSERT INTO trainers (
            trainer_code, full_name, mobile, email, specialization, qualifications,
            compensation_model, compensation_rate, contract_info, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.trainer_code.strip().upper(), req.full_name.strip(), req.mobile.strip(),
        req.email.strip() if req.email else None, req.specialization.strip(), req.qualifications,
        req.compensation_model, req.compensation_rate, req.contract_info, req.status or "Active", now_iso
    ))

    log_audit(current_user["id"], current_user["username"], "CREATE_TRAINER", "TRAINER", new_id, f"تسجيل مدرب جديد: {req.full_name} ({req.trainer_code})")
    return {"success": True, "id": new_id, "message": {"ar": "تم تسجيل بيانات المحاضر بنجاح", "en": "Trainer created successfully"}}

@router.put("/{trainer_id}")
def update_trainer(
    trainer_id: int,
    req: TrainerUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Updates trainer details and compensation settings."""
    trainer = query_one("SELECT id FROM trainers WHERE id = ?", (trainer_id,))
    if not trainer:
        raise HTTPException(status_code=404, detail={"ar": "المدرب غير موجود", "en": "Trainer not found"})

    execute_update("""
        UPDATE trainers SET
            full_name = ?, mobile = ?, email = ?, specialization = ?, qualifications = ?,
            compensation_model = ?, compensation_rate = ?, contract_info = ?, status = ?
        WHERE id = ?
    """, (
        req.full_name.strip(), req.mobile.strip(), req.email.strip() if req.email else None,
        req.specialization.strip(), req.qualifications, req.compensation_model, req.compensation_rate,
        req.contract_info, req.status, trainer_id
    ))

    log_audit(current_user["id"], current_user["username"], "UPDATE_TRAINER", "TRAINER", trainer_id, f"تعديل بيانات المحاضر رقم {trainer_id}")
    return {"success": True, "message": {"ar": "تم تحديث بيانات المحاضر بنجاح", "en": "Trainer updated successfully"}}

@router.post("/{trainer_id}/payout")
def record_trainer_payout(
    trainer_id: int,
    req: TrainerPayoutRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_ACCOUNTANT]))
):
    """Records an official payout payment to a trainer with receipt generation."""
    trainer = query_one("SELECT * FROM trainers WHERE id = ?", (trainer_id,))
    if not trainer:
        raise HTTPException(status_code=404, detail={"ar": "المدرب غير موجود", "en": "Trainer not found"})

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail={"ar": "المبلغ يجب أن يكون أكبر من صفر", "en": "Amount must be greater than zero"})

    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    last_payout = query_one("SELECT COALESCE(MAX(id), 0) as m FROM trainer_payouts")
    next_p_num = (last_payout["m"] if last_payout else 0) + 1
    payout_number = f"PAY-{datetime.now().year}-{next_p_num:04d}"

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO trainer_payouts (
                payout_number, trainer_id, amount, period_start, period_end,
                sessions_count, compensation_model, payment_method, reference_number,
                notes, paid_by, payment_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payout_number, trainer_id, req.amount, req.period_start or today_str,
            req.period_end or today_str, req.sessions_count or 0, trainer["compensation_model"],
            req.payment_method, req.reference_number, req.notes, current_user["id"],
            today_str, now_iso
        ))
        payout_id = cur.lastrowid

        # If payment is Cash, record outflow in cash register for today
        if req.payment_method == "Cash":
            cur.execute("""
                UPDATE cash_registers SET
                    total_outflow = total_outflow + ?,
                    expected_closing = opening_balance + total_inflow - (total_outflow + ?)
                WHERE register_date = ? AND status = 'Open'
            """, (req.amount, req.amount, today_str))

    log_audit(current_user["id"], current_user["username"], "TRAINER_PAYOUT", "TRAINER_PAYOUT", payout_id, f"صرف مستحقات للمحاضر {trainer['full_name']} بمبلغ {req.amount} ج.م ({payout_number})")

    return {
        "success": True,
        "payout_number": payout_number,
        "payout_id": payout_id,
        "message": {"ar": "تم تسجيل صرف المستحقات وإصدار سند الصرف بنجاح", "en": "Payout recorded successfully"}
    }

@router.delete("/{trainer_id}")
def delete_trainer(
    trainer_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Deletes a trainer, payout records, and unassigns from sessions/groups."""
    trainer = query_one("SELECT * FROM trainers WHERE id = ?", (trainer_id,))
    if not trainer:
        raise HTTPException(status_code=404, detail={"ar": "المدرب غير موجود", "en": "Trainer not found"})

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM trainer_payouts WHERE trainer_id = ?", (trainer_id,))
        cur.execute("UPDATE sessions SET trainer_id = NULL WHERE trainer_id = ?", (trainer_id,))
        cur.execute("UPDATE training_groups SET trainer_id = NULL WHERE trainer_id = ?", (trainer_id,))
        cur.execute("DELETE FROM trainers WHERE id = ?", (trainer_id,))

    log_audit(current_user["id"], current_user["username"], "DELETE_TRAINER", "TRAINER", trainer_id, f"حذف بيانات المحاضر {trainer['full_name']}")
    return {"success": True, "message": {"ar": "تم حذف بيانات المدرب بنجاح", "en": "Trainer deleted successfully"}}
