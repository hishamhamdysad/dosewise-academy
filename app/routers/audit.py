from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends
from app.database import query_all, query_one
from app.auth import get_current_user, require_roles
from app.config import ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])

@router.get("")
def list_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN, ROLE_CENTER_MANAGER]))
):
    """Retrieves chronological security and administrative audit trail."""
    where_clauses = ["1=1"]
    params = []
    if action:
        where_clauses.append("action = ?")
        params.append(action)
    if entity_type:
        where_clauses.append("entity_type = ?")
        params.append(entity_type)

    where_sql = " AND ".join(where_clauses)
    params.append(limit)

    logs = query_all(f"""
        SELECT * FROM audit_logs
        WHERE {where_sql}
        ORDER BY id DESC
        LIMIT ?
    """, tuple(params))

    return {"logs": logs}
