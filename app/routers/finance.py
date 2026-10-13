from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST, ROLE_ACCOUNTANT
)

router = APIRouter(prefix="/api/finance", tags=["Finance & Payments"])

class InstallmentPlanItem(BaseModel):
    amount: float
    due_date: str
    notes: Optional[str] = None

class EnrollStudentRequest(BaseModel):
    student_id: int
    group_id: int
    discount_amount: Optional[float] = 0.0
    discount_type: Optional[str] = "none" # none, fixed, percentage, scholarship
    discount_reason: Optional[str] = None
    initial_payment: Optional[float] = 0.0
    payment_method: Optional[str] = "Cash" # Cash, Bank_Transfer, Card, Vodafone_Cash, InstaPay
    reference_number: Optional[str] = None
    installment_plan: Optional[List[InstallmentPlanItem]] = None

class RecordPaymentRequest(BaseModel):
    enrollment_id: int
    amount: float
    payment_date: Optional[str] = None
    payment_method: str = "Cash"
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class RefundRequest(BaseModel):
    enrollment_id: int
    amount: float
    reason: str
    payment_method: Optional[str] = "Cash"

@router.get("/payments")
def list_payments(
    student_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves all payment transactions with filters."""
    where_clauses = ["1=1"]
    params = []

    if student_id:
        where_clauses.append("p.student_id = ?")
        params.append(student_id)
    if payment_method:
        where_clauses.append("p.payment_method = ?")
        params.append(payment_method)
    if start_date:
        where_clauses.append("p.payment_date >= ?")
        params.append(start_date)
    if end_date:
        where_clauses.append("p.payment_date <= ?")
        params.append(end_date)

    where_sql = " AND ".join(where_clauses)
    payments = query_all(f"""
        SELECT 
            p.*,
            s.student_code, s.full_name as student_name, s.mobile_number,
            c.name_ar as course_name_ar, c.code as course_code,
            g.group_name,
            u.full_name as recorded_by_name
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN enrollments e ON p.enrollment_id = e.id
        JOIN training_groups g ON e.group_id = g.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE {where_sql}
        ORDER BY p.id DESC
    """, tuple(params))

    return {"payments": payments}

@router.post("/enroll")
def enroll_student(
    req: EnrollStudentRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST, ROLE_ACCOUNTANT]))
):
    """Enrolls a student in a training group, applies discounts, schedules installments, and records initial payment."""
    group = query_one("""
        SELECT g.*, c.standard_price, c.id as course_id
        FROM training_groups g
        JOIN courses c ON g.course_id = c.id
        WHERE g.id = ?
    """, (req.group_id,))
    if not group:
        raise HTTPException(status_code=404, detail={"ar": "المجموعة غير موجودة", "en": "Group not found"})

    student = query_one("SELECT * FROM students WHERE id = ?", (req.student_id,))
    if not student:
        raise HTTPException(status_code=404, detail={"ar": "الطالب غير موجود", "en": "Student not found"})

    # Check if already enrolled
    existing = query_one("SELECT id FROM enrollments WHERE student_id = ? AND group_id = ?", (req.student_id, req.group_id))
    if existing:
        raise HTTPException(status_code=400, detail={"ar": "الطالب مسجل بالفعل في هذه المجموعة", "en": "Student already enrolled in this group"})

    # Check capacity
    enrolled_count = query_one("SELECT COUNT(*) as c FROM enrollments WHERE group_id = ?", (req.group_id,))["c"]
    if enrolled_count >= group["capacity"]:
        raise HTTPException(status_code=400, detail={"ar": "عذراً، اكتملت السعة الاستيعابية للمجموعة", "en": "Group capacity reached"})

    base_price = group["group_price"] or group["standard_price"]
    discount = max(0.0, req.discount_amount or 0.0)
    final_price = max(0.0, base_price - discount)

    initial_pay = max(0.0, req.initial_payment or 0.0)
    if initial_pay > final_price:
        raise HTTPException(status_code=400, detail={"ar": "المبلغ المدفوع لا يمكن أن يتجاوز السعر النهائي للدورة", "en": "Initial payment cannot exceed final price"})

    balance_due = final_price - initial_pay
    payment_status = "Paid" if balance_due == 0 else ("Partial" if initial_pay > 0 else "Unpaid")

    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    receipt_number = None

    with db_transaction() as conn:
        cur = conn.cursor()
        # 1. Insert Enrollment
        cur.execute("""
            INSERT INTO enrollments (
                student_id, group_id, course_id, enrollment_date, original_price,
                discount_amount, discount_type, discount_reason, final_price, total_paid,
                balance_due, payment_status, enrollment_status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
        """, (
            req.student_id, req.group_id, group["course_id"], today_str, base_price,
            discount, req.discount_type or "none", req.discount_reason, final_price,
            initial_pay, balance_due, payment_status, current_user["id"], now_iso
        ))
        enrollment_id = cur.lastrowid

        # 2. Record initial payment if provided
        if initial_pay > 0:
            last_p = query_one("SELECT COALESCE(MAX(id), 0) as m FROM payments")
            next_p = (last_p["m"] if last_p else 0) + 1
            receipt_number = f"RCP-{datetime.now().year}-{next_p:04d}"
            transaction_id = f"TXN-{datetime.now().year}-{next_p:04d}"

            cur.execute("""
                INSERT INTO payments (
                    receipt_number, transaction_id, enrollment_id, student_id, amount,
                    payment_date, payment_method, reference_number, notes, recorded_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                receipt_number, transaction_id, enrollment_id, req.student_id, initial_pay,
                today_str, req.payment_method or "Cash", req.reference_number,
                "سداد الدفعة الأولى عند التسجيل", current_user["id"], now_iso
            ))

            # If cash, update cash register
            if (req.payment_method or "Cash") == "Cash":
                cur.execute("""
                    UPDATE cash_registers SET
                        total_inflow = total_inflow + ?,
                        expected_closing = opening_balance + (total_inflow + ?) - total_outflow
                    WHERE register_date = ? AND status = 'Open'
                """, (initial_pay, initial_pay, today_str))

        # 3. Schedule installments
        if req.installment_plan and len(req.installment_plan) > 0:
            for idx, inst in enumerate(req.installment_plan, start=1):
                cur.execute("""
                    INSERT INTO installments (
                        enrollment_id, installment_number, amount, due_date, status, paid_amount, notes
                    ) VALUES (?, ?, ?, ?, 'Pending', 0.0, ?)
                """, (enrollment_id, idx, inst.amount, inst.due_date, inst.notes))
        elif balance_due > 0:
            # Auto create default 2 installments for remaining balance
            half_balance = round(balance_due / 2, 2)
            cur.execute("""
                INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount, notes)
                VALUES (?, 1, ?, date('now', '+15 days'), 'Pending', 0.0, 'القسط الأول بعد أسبوعين')
            """, (enrollment_id, half_balance))
            cur.execute("""
                INSERT INTO installments (enrollment_id, installment_number, amount, due_date, status, paid_amount, notes)
                VALUES (?, 2, ?, date('now', '+35 days'), 'Pending', 0.0, 'القسط النهائي')
            """, (enrollment_id, balance_due - half_balance))

    log_audit(current_user["id"], current_user["username"], "ENROLL_STUDENT", "ENROLLMENT", enrollment_id, f"تسجيل الطالب {student['full_name']} في المجموعة {group['group_name']} - المبلغ: {final_price}")

    return {
        "success": True,
        "enrollment_id": enrollment_id,
        "receipt_number": receipt_number,
        "message": {"ar": "تم تسجيل الطالب وإصدار السجل المالي بنجاح", "en": "Student enrolled successfully"}
    }

@router.post("/payments")
def record_payment(
    req: RecordPaymentRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_RECEPTIONIST, ROLE_ACCOUNTANT]))
):
    """Records a payment against an enrollment, auto-updates balance due, and generates a printable receipt."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail={"ar": "مبلغ الدفع يجب أن يكون أكبر من صفر", "en": "Amount must be greater than zero"})

    enrollment = query_one("""
        SELECT e.*, s.full_name as student_name, s.student_code, c.name_ar as course_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.id = ?
    """, (req.enrollment_id,))
    if not enrollment:
        raise HTTPException(status_code=404, detail={"ar": "سجل التسجيل غير موجود", "en": "Enrollment record not found"})

    if req.amount > enrollment["balance_due"]:
        raise HTTPException(
            status_code=400,
            detail={
                "ar": f"المبلغ المدخل ({req.amount} ج.م) يتجاوز الرصيد المستحق المتبقي ({enrollment['balance_due']} ج.م)",
                "en": f"Payment amount exceeds remaining balance due ({enrollment['balance_due']} EGP)"
            }
        )

    now_iso = datetime.now().isoformat()
    today_str = req.payment_date or datetime.now().strftime("%Y-%m-%d")

    last_p = query_one("SELECT COALESCE(MAX(id), 0) as m FROM payments")
    next_p = (last_p["m"] if last_p else 0) + 1
    receipt_number = f"RCP-{datetime.now().year}-{next_p:04d}"
    transaction_id = f"TXN-{datetime.now().year}-{next_p:04d}"

    with db_transaction() as conn:
        cur = conn.cursor()
        # 1. Insert Payment
        cur.execute("""
            INSERT INTO payments (
                receipt_number, transaction_id, enrollment_id, student_id, amount,
                payment_date, payment_method, reference_number, notes, recorded_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            receipt_number, transaction_id, req.enrollment_id, enrollment["student_id"], req.amount,
            today_str, req.payment_method, req.reference_number, req.notes, current_user["id"], now_iso
        ))
        payment_id = cur.lastrowid

        # 2. Update Enrollment
        new_total_paid = enrollment["total_paid"] + req.amount
        new_balance = max(0.0, enrollment["balance_due"] - req.amount)
        new_payment_status = "Paid" if new_balance == 0 else "Partial"

        cur.execute("""
            UPDATE enrollments SET
                total_paid = ?,
                balance_due = ?,
                payment_status = ?
            WHERE id = ?
        """, (new_total_paid, new_balance, new_payment_status, req.enrollment_id))

        # 3. Apply payment to pending/overdue installments
        remaining_pay = req.amount
        pending_installments = query_all("""
            SELECT * FROM installments
            WHERE enrollment_id = ? AND status != 'Paid'
            ORDER BY due_date ASC
        """, (req.enrollment_id,))

        for inst in pending_installments:
            inst_due = inst["amount"] - inst["paid_amount"]
            if remaining_pay <= 0:
                break
            if remaining_pay >= inst_due:
                cur.execute("""
                    UPDATE installments SET
                        status = 'Paid',
                        paid_amount = amount,
                        paid_at = ?
                    WHERE id = ?
                """, (today_str, inst["id"]))
                remaining_pay -= inst_due
            else:
                cur.execute("""
                    UPDATE installments SET
                        paid_amount = paid_amount + ?
                    WHERE id = ?
                """, (remaining_pay, inst["id"]))
                remaining_pay = 0

        # 4. If cash, update today's cash register inflow
        if req.payment_method == "Cash":
            cur.execute("""
                UPDATE cash_registers SET
                    total_inflow = total_inflow + ?,
                    expected_closing = opening_balance + (total_inflow + ?) - total_outflow
                WHERE register_date = ? AND status = 'Open'
            """, (req.amount, req.amount, today_str))

    log_audit(current_user["id"], current_user["username"], "RECORD_PAYMENT", "PAYMENT", payment_id, f"تسجيل دفعة بقيمة {req.amount} ج.م للطالب {enrollment['student_name']} - إيصال {receipt_number}")

    return {
        "success": True,
        "payment_id": payment_id,
        "receipt_number": receipt_number,
        "remaining_balance": new_balance,
        "message": {"ar": "تم تسجيل الدفعة وإصدار الإيصال المالي بنجاح", "en": "Payment recorded and receipt issued successfully"}
    }

@router.get("/receipt/{receipt_number}")
def get_receipt(receipt_number: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches complete formatted receipt object for official printing with branding."""
    payment = query_one("""
        SELECT 
            p.*,
            s.student_code, s.full_name as student_name, s.national_id, s.mobile_number,
            c.name_ar as course_name_ar, c.name_en as course_name_en, c.code as course_code,
            g.group_name, g.group_code,
            e.final_price, e.total_paid as enrollment_total_paid, e.balance_due,
            u.full_name as cashier_name
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN enrollments e ON p.enrollment_id = e.id
        JOIN training_groups g ON e.group_id = g.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE p.receipt_number = ?
    """, (receipt_number,))

    if not payment:
        raise HTTPException(status_code=404, detail={"ar": "الإيصال غير موجود", "en": "Receipt not found"})

    return {"receipt": payment}

@router.post("/refund")
def process_refund(
    req: RefundRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_ACCOUNTANT]))
):
    """Processes a traceable refund transaction, adjusts balances, and tracks reason."""
    enrollment = query_one("SELECT * FROM enrollments WHERE id = ?", (req.enrollment_id,))
    if not enrollment:
        raise HTTPException(status_code=404, detail={"ar": "التسجيل غير موجود", "en": "Enrollment not found"})

    if req.amount <= 0 or req.amount > enrollment["total_paid"]:
        raise HTTPException(status_code=400, detail={"ar": "قيمة الاسترداد غير صالحة أو تتجاوز إجمالي ما دفعه الطالب", "en": "Invalid refund amount"})

    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    last_adj = query_one("SELECT COALESCE(MAX(id), 0) as m FROM refunds_adjustments")
    next_adj = (last_adj["m"] if last_adj else 0) + 1
    adjustment_number = f"REF-{datetime.now().year}-{next_adj:04d}"

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO refunds_adjustments (
                adjustment_number, enrollment_id, type, amount, reason, approved_by, recorded_by, created_at
            ) VALUES (?, ?, 'Refund', ?, ?, ?, ?, ?)
        """, (
            adjustment_number, req.enrollment_id, req.amount, req.reason,
            current_user["id"], current_user["id"], now_iso
        ))
        adj_id = cur.lastrowid

        # Update enrollment total_paid and balance_due
        new_total_paid = enrollment["total_paid"] - req.amount
        new_balance = enrollment["balance_due"] + req.amount
        cur.execute("""
            UPDATE enrollments SET
                total_paid = ?,
                balance_due = ?,
                payment_status = 'Refunded'
            WHERE id = ?
        """, (new_total_paid, new_balance, req.enrollment_id))

        # If cash, record outflow
        if req.payment_method == "Cash":
            cur.execute("""
                UPDATE cash_registers SET
                    total_outflow = total_outflow + ?,
                    expected_closing = opening_balance + total_inflow - (total_outflow + ?)
                WHERE register_date = ? AND status = 'Open'
            """, (req.amount, req.amount, today_str))

    log_audit(current_user["id"], current_user["username"], "PROCESS_REFUND", "REFUND", adj_id, f"تسجيل استرداد مالي بقيمة {req.amount} ج.م للتسجيل {req.enrollment_id} - {req.reason}")

    return {
        "success": True,
        "adjustment_number": adjustment_number,
        "message": {"ar": "تم معالجة الاسترداد المالي وتسجيل السند بنجاح", "en": "Refund processed successfully"}
    }

@router.get("/debts")
def list_student_debts(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))):
    """Lists all students with outstanding balances and overdue installments."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    debts = query_all("""
        SELECT 
            s.id as student_id, s.student_code, s.full_name, s.mobile_number, s.whatsapp_number,
            e.id as enrollment_id, e.final_price, e.total_paid, e.balance_due,
            c.name_ar as course_name_ar,
            g.group_name,
            (SELECT COUNT(*) FROM installments i WHERE i.enrollment_id = e.id AND (i.status = 'Overdue' OR (i.status = 'Pending' AND i.due_date < ?))) as overdue_installments_count,
            (SELECT MIN(i.due_date) FROM installments i WHERE i.enrollment_id = e.id AND i.status != 'Paid') as next_due_date
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN courses c ON e.course_id = c.id
        JOIN training_groups g ON e.group_id = g.id
        WHERE e.balance_due > 0
        ORDER BY e.balance_due DESC
    """, (today_str,))

    total_debt = sum(d["balance_due"] for d in debts)

    return {
        "debts": debts,
        "total_outstanding_debt": total_debt,
        "count": len(debts)
    }

@router.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Deletes/cancels a payment transaction and updates enrollment debt balance."""
    payment = query_one("SELECT * FROM payments WHERE id = ?", (payment_id,))
    if not payment:
        raise HTTPException(status_code=404, detail={"ar": "سند القبض غير موجود", "en": "Payment record not found"})

    with db_transaction() as conn:
        cur = conn.cursor()
        amount = payment["amount"]
        enrollment_id = payment["enrollment_id"]
        
        # Revert enrollment balance
        cur.execute("""
            UPDATE enrollments SET
                total_paid = MAX(0.0, total_paid - ?),
                balance_due = balance_due + ?
            WHERE id = ?
        """, (amount, amount, enrollment_id))
        
        # Clean linked refunds or adjustments
        cur.execute("DELETE FROM refunds_adjustments WHERE payment_id = ?", (payment_id,))

        # If installment linked (if column exists)
        if payment.get("installment_id"):
            cur.execute("""
                UPDATE installments SET
                    paid_amount = MAX(0.0, paid_amount - ?),
                    status = 'Pending'
                WHERE id = ?
            """, (amount, payment["installment_id"]))
            
        cur.execute("DELETE FROM payments WHERE id = ?", (payment_id,))

    log_audit(current_user["id"], current_user["username"], "DELETE_PAYMENT", "PAYMENT", payment_id, f"إلغاء وحذف سند القبض {payment['receipt_number']} بمبلغ {amount} ج.م")
    return {"success": True, "message": {"ar": "تم حذف سند القبض وتحديث رصيد الطالب بنجاح", "en": "Payment deleted and balance adjusted successfully"}}
