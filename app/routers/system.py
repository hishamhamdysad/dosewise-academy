from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.database import query_all, query_one, log_audit
from app.auth import get_current_user, require_roles
from app.config import ROLE_SUPER_ADMIN
from app.seed_data import clear_all_operational_data, seed_all

router = APIRouter(prefix="/api/system", tags=["System Management & Data Reset"])

@router.get("/database-stats")
def get_database_stats(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Returns row counts of all operational tables."""
    tables = [
        ("students", "الطلاب"),
        ("courses", "الدورات"),
        ("training_groups", "المجموعات التدريبية"),
        ("trainers", "المدربين"),
        ("sessions", "المحاضرات"),
        ("attendance", "سجلات الحضور"),
        ("enrollments", "التسجيلات"),
        ("payments", "المقبوضات"),
        ("expenses", "المصروفات"),
        ("leads", "العملاء المحتملين"),
        ("certificates", "الشهادات الصادرة"),
        ("users", "المستخدمين")
    ]
    counts = {}
    total_records = 0
    for tbl, label in tables:
        c = query_one(f"SELECT COUNT(*) as c FROM {tbl}")["c"]
        counts[tbl] = {"count": c, "label": label}
        if tbl != "users":
            total_records += c

    return {
        "stats": counts,
        "total_operational_records": total_records
    }

@router.post("/clear-dummy-data")
def clear_dummy_data(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Completely wipes all dummy / operational data, resetting academy to empty clean slate."""
    try:
        clear_all_operational_data()
        log_audit(
            current_user["id"],
            current_user["username"],
            "CLEAR_DUMMY_DATA",
            "SYSTEM",
            1,
            "حذف وتفريغ كافة البيانات التجريبية والبدء بمركز نظيف"
        )
        return {
            "success": True,
            "message": {
                "ar": "تم تفريغ وحذف كافة البيانات التجريبية بنجاح. النظام الآن جاهز تماماً للبدء ببياناتكم الفعلية.",
                "en": "All dummy data successfully cleared. System is now ready for production data."
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"ar": f"حدث خطأ أثناء تفريغ البيانات: {str(e)}", "en": f"Error clearing data: {str(e)}"}
        )

@router.post("/reseed-dummy-data")
def reseed_dummy_data(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Allows re-populating dummy data for testing if needed."""
    try:
        clear_all_operational_data()
        seed_all()
        log_audit(
            current_user["id"],
            current_user["username"],
            "RESEED_DUMMY_DATA",
            "SYSTEM",
            1,
            "إعادة تعبئة البيانات التجريبية"
        )
        return {
            "success": True,
            "message": {
                "ar": "تمت إعادة توليد البيانات التجريبية بنجاح.",
                "en": "Dummy data re-seeded successfully."
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"ar": f"حدث خطأ أثناء إعادة توليد البيانات: {str(e)}", "en": f"Error reseeding data: {str(e)}"}
        )
