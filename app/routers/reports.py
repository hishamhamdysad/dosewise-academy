import io
import csv
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Response, Depends
from app.database import query_all, query_one
from app.auth import get_current_user, require_roles
from app.config import (
    ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT
)

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/financial-overview")
def get_financial_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Generates comprehensive financial summary: Revenue, Collections, Expenses, Debts, and Net Profit."""
    where_pay = ["1=1"]
    where_exp = ["1=1"]
    params_pay = []
    params_exp = []

    if start_date:
        where_pay.append("payment_date >= ?")
        where_exp.append("expense_date >= ?")
        params_pay.append(start_date)
        params_exp.append(start_date)
    if end_date:
        where_pay.append("payment_date <= ?")
        where_exp.append("expense_date <= ?")
        params_pay.append(end_date)
        params_exp.append(end_date)

    where_pay_sql = " AND ".join(where_pay)
    where_exp_sql = " AND ".join(where_exp)

    # Total Collections
    total_collections = query_one(f"SELECT COALESCE(SUM(amount), 0.0) as s FROM payments WHERE {where_pay_sql}", tuple(params_pay))["s"]

    # Collections by payment method
    methods_breakdown = query_all(f"""
        SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0.0) as total
        FROM payments
        WHERE {where_pay_sql}
        GROUP BY payment_method
    """, tuple(params_pay))

    # Total Expenses
    total_expenses = query_one(f"SELECT COALESCE(SUM(amount), 0.0) as s FROM expenses WHERE approval_status = 'Approved' AND {where_exp_sql}", tuple(params_exp))["s"]

    # Expenses by category
    categories_breakdown = query_all(f"""
        SELECT category, COUNT(*) as count, COALESCE(SUM(amount), 0.0) as total
        FROM expenses
        WHERE approval_status = 'Approved' AND {where_exp_sql}
        GROUP BY category
    """, tuple(params_exp))

    # Trainer payouts in period
    trainer_payouts_total = query_one("SELECT COALESCE(SUM(amount), 0.0) as s FROM trainer_payouts")["s"]

    # Total receivables (debts)
    total_debts = query_one("SELECT COALESCE(SUM(balance_due), 0.0) as s FROM enrollments WHERE balance_due > 0")["s"]

    # Net operating cash balance
    net_operating_result = total_collections - total_expenses

    return {
        "summary": {
            "total_collections": total_collections,
            "total_expenses": total_expenses,
            "trainer_payouts": trainer_payouts_total,
            "total_receivables_debts": total_debts,
            "net_operating_result": net_operating_result,
            "currency": "EGP"
        },
        "methods_breakdown": methods_breakdown,
        "categories_breakdown": categories_breakdown
    }

@router.get("/course-performance")
def get_courses_performance_report(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))):
    """Reports course profitability, total enrollments, collections, and outstanding debt."""
    report = query_all("""
        SELECT 
            c.code, c.name_ar, c.name_en, c.standard_price,
            COUNT(DISTINCT g.id) as active_groups_count,
            COUNT(e.id) as total_enrollments,
            COALESCE(SUM(e.final_price), 0.0) as total_revenue,
            COALESCE(SUM(e.total_paid), 0.0) as total_collected,
            COALESCE(SUM(e.balance_due), 0.0) as total_outstanding_debt
        FROM courses c
        LEFT JOIN training_groups g ON c.id = g.course_id
        LEFT JOIN enrollments e ON c.id = e.course_id
        GROUP BY c.id
        ORDER BY total_revenue DESC
    """)
    return {"courses_performance": report}

@router.get("/export/collections-csv")
def export_collections_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER, ROLE_ACCOUNTANT]))
):
    """Exports payment collections report into Excel-compatible UTF-8 CSV."""
    where_sql = "1=1"
    params = []
    if start_date:
        where_sql += " AND p.payment_date >= ?"
        params.append(start_date)
    if end_date:
        where_sql += " AND p.payment_date <= ?"
        params.append(end_date)

    payments = query_all(f"""
        SELECT 
            p.receipt_number, p.transaction_id, p.payment_date, p.amount, p.payment_method, p.reference_number,
            s.student_code, s.full_name as student_name, s.mobile_number,
            c.name_ar as course_name,
            u.full_name as cashier_name
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN enrollments e ON p.enrollment_id = e.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE {where_sql}
        ORDER BY p.payment_date ASC
    """, tuple(params))

    output = io.StringIO()
    output.write("\ufeff") # UTF-8 BOM
    writer = csv.writer(output)
    writer.writerow(["رقم الإيصال", "رقم المعاملة", "تاريخ السداد", "المبلغ (ج.م)", "طريقة الدفع", "رقم المرجع", "كود الطالب", "اسم الطالب", "الهاتف", "الدورة التدريبية", "المحصل"])

    for p in payments:
        writer.writerow([
            p["receipt_number"], p["transaction_id"], p["payment_date"], p["amount"],
            p["payment_method"], p["reference_number"] or "", p["student_code"],
            p["student_name"], p["mobile_number"], p["course_name"], p["cashier_name"] or ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=collections_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
