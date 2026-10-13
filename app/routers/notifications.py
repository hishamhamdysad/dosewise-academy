from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends
from app.database import query_all, query_one, execute_update
from app.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications Center"])

@router.get("")
def list_notifications(is_read: Optional[int] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieves list of active alerts with unread counter."""
    where_sql = "1=1"
    params = []
    if is_read is not None:
        where_sql += " AND is_read = ?"
        params.append(is_read)

    notifications = query_all(f"""
        SELECT * FROM notifications
        WHERE {where_sql}
        ORDER BY priority = 'critical' DESC, priority = 'high' DESC, id DESC
        LIMIT 50
    """, tuple(params))

    unread_count = query_one("SELECT COUNT(*) as c FROM notifications WHERE is_read = 0")["c"]

    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Marks a single notification as read."""
    now_iso = datetime.now().isoformat()
    execute_update("UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?", (now_iso, notification_id))
    return {"success": True}

@router.put("/read-all")
def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Marks all notifications as read."""
    now_iso = datetime.now().isoformat()
    execute_update("UPDATE notifications SET is_read = 1, read_at = ? WHERE is_read = 0", (now_iso,))
    return {"success": True}
