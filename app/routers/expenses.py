from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import query_all, query_one, execute_insert, execute_update, log_audit, db_transaction
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT
)

router = APIRouter(prefix="/api/expenses", tags=["Expenses & Cash Management"])

EXPENSE_CATEGORIES_AR = {
    "Rent": "إيجار المقرات والقاعات (Rent)",
    "Utilities": "مرافق وفواتير (كهرباء / مياه / إنترنت)",
    "Marketing": "تسويق وإعلانات ممولة (Marketing)",
    "Salaries": "رواتب ومكافآت الموظفين (Salaries)",
    "Equipment": "أجهزة ومعدات وداتا شو (Equipment)",
    "Supplies": "مستلزمات طبية ومعملية ومطبوعات (Supplies)",
    "Maintenance": "صيانة ونظافة (Maintenance)",
    "Hospitality": "ضيافة وبوفيه (Hospitality)",
    "Other": "مصروفات إدارية ونثرية أخرى (Other)"
}

class ExpenseCreateRequest(BaseModel):
    category: str
    description: str
    amount: float
    expense_date: Optional[str] = None
    payment_method: Optional[str] = "Cash"
    vendor: Optional[str] = None
    receipt_attachment: Optional[str] = None

class CloseRegisterRequest(BaseModel):
    actual_closing: float
    notes: Optional[str] = None

@router.get("")
def list_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    approval_status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Lists recorded expenses with categories, vendor, and approval information."""
    where_clauses = ["1=1"]
    params = []

    if category:
        where_clauses.append("e.category = ?")
        params.append(category)
    if start_date:
        where_clauses.append("e.expense_date >= ?")
        params.append(start_date)
    if end_date:
        where_clauses.append("e.expense_date <= ?")
        params.append(end_date)
    if approval_status:
        where_clauses.append("e.approval_status = ?")
        params.append(approval_status)

    where_sql = " AND ".join(where_clauses)
    expenses = query_all(f"""
        SELECT 
            e.*,
            u1.full_name as recorded_by_name,
            u2.full_name as approved_by_name
        FROM expenses e
        LEFT JOIN users u1 ON e.recorded_by = u1.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        WHERE {where_sql}
        ORDER BY e.expense_date DESC, e.id DESC
    """, tuple(params))

    for exp in expenses:
        exp["category_label_ar"] = EXPENSE_CATEGORIES_AR.get(exp["category"], exp["category"])

    total_amount = sum(e["amount"] for e in expenses if e["approval_status"] == "Approved")

    return {
        "expenses": expenses,
        "total_approved_amount": total_amount,
        "categories": EXPENSE_CATEGORIES_AR
    }

@router.post("")
def record_expense(
    req: ExpenseCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Records an expense voucher and adjusts cash register outflow if paid in Cash."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail={"ar": "المبلغ يجب أن يكون أكبر من صفر", "en": "Amount must be greater than zero"})

    today_str = req.expense_date or datetime.now().strftime("%Y-%m-%d")
    now_iso = datetime.now().isoformat()

    last_exp = query_one("SELECT COALESCE(MAX(id), 0) as m FROM expenses")
    next_exp = (last_exp["m"] if last_exp else 0) + 1
    expense_number = f"EXP-{datetime.now().year}-{next_exp:04d}"

    # Auto-approve if recorder is super_admin or manager, or amount < 2000
    approval_status = "Approved" if (current_user["role"] in [ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER] or req.amount < 2000) else "Pending"
    approved_by = current_user["id"] if approval_status == "Approved" else None

    with db_transaction() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO expenses (
                expense_number, category, description, amount, expense_date,
                payment_method, vendor, receipt_attachment, approval_status,
                recorded_by, approved_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            expense_number, req.category, req.description.strip(), req.amount, today_str,
            req.payment_method or "Cash", req.vendor, req.receipt_attachment,
            approval_status, current_user["id"], approved_by, now_iso
        ))
        expense_id = cur.lastrowid

        # If Cash and approved, record in cash register outflow
        if req.payment_method == "Cash" and approval_status == "Approved":
            cur.execute("""
                UPDATE cash_registers SET
                    total_outflow = total_outflow + ?,
                    expected_closing = opening_balance + total_inflow - (total_outflow + ?)
                WHERE register_date = ? AND status = 'Open'
            """, (req.amount, req.amount, today_str))

    log_audit(current_user["id"], current_user["username"], "RECORD_EXPENSE", "EXPENSE", expense_id, f"تسجيل سند صرف {req.category} بمبلغ {req.amount} ج.م ({expense_number})")

    return {
        "success": True,
        "expense_id": expense_id,
        "expense_number": expense_number,
        "approval_status": approval_status,
        "message": {"ar": "تم تسجيل المصروف المالي بنجاح", "en": "Expense recorded successfully"}
    }

@router.put("/{expense_id}/approve")
def approve_expense(
    expense_id: int,
    approve: bool,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Approves or rejects a pending expense voucher."""
    exp = query_one("SELECT * FROM expenses WHERE id = ?", (expense_id,))
    if not exp:
        raise HTTPException(status_code=404, detail={"ar": "المصروف غير موجود", "en": "Expense not found"})

    new_status = "Approved" if approve else "Rejected"
    execute_update("""
        UPDATE expenses SET approval_status = ?, approved_by = ? WHERE id = ?
    """, (new_status, current_user["id"], expense_id))

    # If newly approved and was cash, update register
    if new_status == "Approved" and exp["payment_method"] == "Cash" and exp["approval_status"] != "Approved":
        execute_update("""
            UPDATE cash_registers SET
                total_outflow = total_outflow + ?,
                expected_closing = opening_balance + total_inflow - (total_outflow + ?)
            WHERE register_date = ? AND status = 'Open'
        """, (exp["amount"], exp["amount"], exp["expense_date"]))

    log_audit(current_user["id"], current_user["username"], "APPROVE_EXPENSE", "EXPENSE", expense_id, f"تعديل حالة المصروف إلى {new_status}")
    return {"success": True, "message": {"ar": f"تم تحديث حالة الاعتماد إلى: {new_status}", "en": f"Status updated to: {new_status}"}}

# Cash Register (Treasury / الخزينة) endpoints
@router.get("/treasury/today")
def get_today_treasury(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))):
    """Fetches status and live cash inflows/outflows for today's cash register."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    register = query_one("SELECT * FROM cash_registers WHERE register_date = ?", (today_str,))
    
    if not register:
        # Check yesterday's actual closing to use as opening balance
        yesterday_reg = query_one("SELECT actual_closing, expected_closing FROM cash_registers ORDER BY id DESC LIMIT 1")
        opening = yesterday_reg["actual_closing"] if (yesterday_reg and yesterday_reg["actual_closing"] is not None) else (yesterday_reg["expected_closing"] if yesterday_reg else 15000.0)
        
        # Calculate today's cash inflows (payments made in cash)
        cash_inflows = query_one("SELECT COALESCE(SUM(amount), 0.0) as s FROM payments WHERE payment_date = ? AND payment_method = 'Cash'", (today_str,))["s"]
        
        # Calculate today's cash outflows (approved expenses + payouts in cash)
        cash_exp = query_one("SELECT COALESCE(SUM(amount), 0.0) as s FROM expenses WHERE expense_date = ? AND payment_method = 'Cash' AND approval_status = 'Approved'", (today_str,))["s"]
        cash_pay = query_one("SELECT COALESCE(SUM(amount), 0.0) as s FROM trainer_payouts WHERE payment_date = ? AND payment_method = 'Cash'", (today_str,))["s"]
        cash_outflows = cash_exp + cash_pay
        
        expected_closing = opening + cash_inflows - cash_outflows
        
        now_iso = datetime.now().isoformat()
        reg_id = execute_insert("""
            INSERT INTO cash_registers (register_date, opening_balance, total_inflow, total_outflow, expected_closing, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'Open', ?)
        """, (today_str, opening, cash_inflows, cash_outflows, expected_closing, now_iso))
        
        register = query_one("SELECT * FROM cash_registers WHERE id = ?", (reg_id,))

    # Today's cash transactions list
    cash_payments = query_all("""
        SELECT p.receipt_number, p.amount, s.full_name as student_name, c.name_ar as course_name, p.created_at
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN enrollments e ON p.enrollment_id = e.id
        JOIN courses c ON e.course_id = c.id
        WHERE p.payment_date = ? AND p.payment_method = 'Cash'
        ORDER BY p.id DESC
    """, (today_str,))

    cash_expenses = query_all("""
        SELECT expense_number, category, description, amount, vendor, created_at
        FROM expenses
        WHERE expense_date = ? AND payment_method = 'Cash' AND approval_status = 'Approved'
        ORDER BY id DESC
    """, (today_str,))

    return {
        "register": register,
        "cash_payments": cash_payments,
        "cash_expenses": cash_expenses
    }

@router.post("/treasury/close")
def close_treasury(
    req: CloseRegisterRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Closes and reconciles today's treasury cash register with physical cash count."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    register = query_one("SELECT * FROM cash_registers WHERE register_date = ?", (today_str,))
    if not register:
        raise HTTPException(status_code=404, detail={"ar": "سجل الخزينة غير موجود لليوم", "en": "Cash register not found"})

    difference = req.actual_closing - register["expected_closing"]

    execute_update("""
        UPDATE cash_registers SET
            actual_closing = ?,
            difference = ?,
            status = 'Closed',
            notes = ?,
            closed_by = ?
        WHERE id = ?
    """, (req.actual_closing, difference, req.notes, current_user["id"], register["id"]))

    log_audit(current_user["id"], current_user["username"], "CLOSE_TREASURY", "CASH_REGISTER", register["id"], f"إغلاق خزينة يوم {today_str} - الرصيد الفعلي: {req.actual_closing} ج.م (الفارق: {difference})")

    return {
        "success": True,
        "actual_closing": req.actual_closing,
        "expected_closing": register["expected_closing"],
        "difference": difference,
        "message": {"ar": "تم إغلاق الخزينة وجرد النقدية بنجاح", "en": "Cash register reconciled and closed successfully"}
    }

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Deletes an expense voucher."""
    expense = query_one("SELECT * FROM expenses WHERE id = ?", (expense_id,))
    if not expense:
        raise HTTPException(status_code=404, detail={"ar": "سند الصرف غير موجود", "en": "Expense not found"})

    execute_update("DELETE FROM expenses WHERE id = ?", (expense_id,))
    log_audit(current_user["id"], current_user["username"], "DELETE_EXPENSE", "EXPENSE", expense_id, f"حذف سند الصرف {expense['expense_number']} بمبلغ {expense['amount']} ج.م")
    return {"success": True, "message": {"ar": "تم حذف سند الصرف بنجاح", "en": "Expense voucher deleted successfully"}}
