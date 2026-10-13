from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from pydantic import BaseModel
from app.database import query_one, query_all, execute_insert, execute_update, log_audit
from app.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_roles
)
from app.config import (
    SESSION_COOKIE_NAME, ROLE_SUPER_ADMIN, ROLES_ALL,
    ROLE_LABELS_AR, ROLE_LABELS_EN
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str
    phone: Optional[str] = None

class UpdateUserRequest(BaseModel):
    full_name: str
    username: str
    email: str
    role: str
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

@router.post("/login")
def login(req: LoginRequest, response: Response, request: Request):
    """Authenticates user, sets session cookie and returns token with user profile."""
    username = req.username.strip()
    user = query_one(
        "SELECT id, username, email, password_hash, salt, full_name, role, phone, is_active FROM users WHERE username = ? OR email = ?",
        (username, username)
    )
    
    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ar": "اسم المستخدم أو كلمة المرور غير صحيحة", "en": "Invalid username or password"}
        )
        
    if not verify_password(req.password, user["salt"], user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ar": "اسم المستخدم أو كلمة المرور غير صحيحة", "en": "Invalid username or password"}
        )

    # Update last login
    now_iso = datetime.now().isoformat()
    execute_update("UPDATE users SET last_login = ? WHERE id = ?", (now_iso, user["id"]))

    token = create_access_token({
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"]
    })

    # Set HTTP-only secure cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=86400 * 7,
        samesite="lax",
        secure=False # allows localhost execution
    )

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_audit(user["id"], user["username"], "LOGIN", "USER", user["id"], "تسجيل دخول ناجح للنظام", client_ip)

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "role_label_ar": ROLE_LABELS_AR.get(user["role"], user["role"]),
            "role_label_en": ROLE_LABELS_EN.get(user["role"], user["role"]),
            "phone": user["phone"]
        }
    }

@router.post("/logout")
def logout(response: Response, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logs out user by clearing the session cookie."""
    response.delete_cookie(SESSION_COOKIE_NAME)
    log_audit(current_user["id"], current_user["username"], "LOGOUT", "USER", current_user["id"], "تسجيل خروج من النظام")
    return {"success": True, "message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns current authenticated user details."""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "role_label_ar": ROLE_LABELS_AR.get(current_user["role"], current_user["role"]),
        "role_label_en": ROLE_LABELS_EN.get(current_user["role"], current_user["role"]),
        "phone": current_user.get("phone")
    }

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Allows user to change their account password."""
    user = query_one("SELECT password_hash, salt FROM users WHERE id = ?", (current_user["id"],))
    if not user or not verify_password(req.current_password, user["salt"], user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"ar": "كلمة المرور الحالية غير صحيحة", "en": "Current password is incorrect"}
        )
    
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"ar": "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف", "en": "New password must be at least 6 characters"}
        )
        
    salt, new_hash = hash_password(req.new_password)
    execute_update("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (new_hash, salt, current_user["id"]))
    log_audit(current_user["id"], current_user["username"], "CHANGE_PASSWORD", "USER", current_user["id"], "تم تغيير كلمة المرور")
    return {"success": True, "message": {"ar": "تم تغيير كلمة المرور بنجاح", "en": "Password changed successfully"}}

@router.get("/users")
def list_users(current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Super Admin: Lists all staff and administrative users."""
    users = query_all("SELECT id, username, email, full_name, role, phone, is_active, created_at, last_login FROM users ORDER BY id ASC")
    for u in users:
        u["role_label_ar"] = ROLE_LABELS_AR.get(u["role"], u["role"])
        u["role_label_en"] = ROLE_LABELS_EN.get(u["role"], u["role"])
    return {"users": users}

@router.post("/users")
def create_user(req: CreateUserRequest, current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Super Admin: Creates a new staff user with designated role."""
    if req.role not in ROLES_ALL:
        raise HTTPException(status_code=400, detail={"ar": "الدور المحدد غير صالح", "en": "Invalid role"})
        
    existing = query_one("SELECT id FROM users WHERE username = ? OR email = ?", (req.username.strip(), req.email.strip()))
    if existing:
        raise HTTPException(status_code=400, detail={"ar": "اسم المستخدم أو البريد الإلكتروني مسجل بالفعل", "en": "Username or email already exists"})
        
    salt, p_hash = hash_password(req.password)
    user_id = execute_insert(
        """
        INSERT INTO users (username, email, password_hash, salt, full_name, role, phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """,
        (req.username.strip(), req.email.strip(), p_hash, salt, req.full_name.strip(), req.role, req.phone, datetime.now().isoformat())
    )
    log_audit(current_user["id"], current_user["username"], "CREATE_USER", "USER", user_id, f"إنشاء مستخدم جديد: {req.username} بدور {req.role}")
    return {"success": True, "user_id": user_id, "message": {"ar": "تم إنشاء حساب المستخدم بنجاح", "en": "User created successfully"}}

@router.put("/users/{user_id}/status")
def toggle_user_status(user_id: int, is_active: bool, current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Super Admin: Activates or deactivates a user."""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail={"ar": "لا يمكنك تعطيل حسابك الشخصي", "en": "Cannot deactivate your own account"})
    execute_update("UPDATE users SET is_active = ? WHERE id = ?", (1 if is_active else 0, user_id))
    log_audit(current_user["id"], current_user["username"], "TOGGLE_USER_STATUS", "USER", user_id, f"تعديل حالة المستخدم إلى: {is_active}")
    return {"success": True}

@router.get("/users/{user_id}")
def get_user(user_id: int, current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Super Admin: Fetches user details by ID."""
    user = query_one("SELECT id, username, email, full_name, role, phone, is_active, created_at, last_login FROM users WHERE id = ?", (user_id,))
    if not user:
        raise HTTPException(status_code=404, detail={"ar": "المستخدم غير موجود", "en": "User not found"})
    user["role_label_ar"] = ROLE_LABELS_AR.get(user["role"], user["role"])
    user["role_label_en"] = ROLE_LABELS_EN.get(user["role"], user["role"])
    return {"user": user}

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    req: UpdateUserRequest,
    current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))
):
    """Super Admin: Updates staff user profile and credentials."""
    user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        raise HTTPException(status_code=404, detail={"ar": "المستخدم غير موجود", "en": "User not found"})

    if req.role not in ROLES_ALL:
        raise HTTPException(status_code=400, detail={"ar": "الدور المحدد غير صالح", "en": "Invalid role"})

    # Check for duplicate username or email with other users
    duplicate = query_one(
        "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
        (req.username.strip(), req.email.strip(), user_id)
    )
    if duplicate:
        raise HTTPException(
            status_code=400,
            detail={"ar": "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل من قِبل حساب آخر", "en": "Username or email is already taken by another user"}
        )

    # Protect super admin from self-demoting role or self-deactivating
    is_self = user_id == current_user["id"]
    if is_self and req.role != ROLE_SUPER_ADMIN:
        raise HTTPException(
            status_code=400,
            detail={"ar": "لا يمكنك تغيير أو تقليص دور حسابك الحالي كمدير عام", "en": "Cannot change your own role from Super Admin"}
        )
    if is_self and req.is_active is False:
        raise HTTPException(
            status_code=400,
            detail={"ar": "لا يمكنك تعطيل حسابك الشخصي الحالي", "en": "Cannot deactivate your own account"}
        )

    new_active = user["is_active"] if req.is_active is None else (1 if req.is_active else 0)

    # If new password provided
    if req.password and req.password.strip():
        if len(req.password.strip()) < 6:
            raise HTTPException(
                status_code=400,
                detail={"ar": "كلمة المرور يجب ألا تقل عن 6 أحرف", "en": "Password must be at least 6 characters"}
            )
        salt, p_hash = hash_password(req.password.strip())
        execute_update(
            """
            UPDATE users SET
                full_name = ?,
                username = ?,
                email = ?,
                role = ?,
                phone = ?,
                password_hash = ?,
                salt = ?,
                is_active = ?
            WHERE id = ?
            """,
            (
                req.full_name.strip(),
                req.username.strip(),
                req.email.strip(),
                req.role,
                req.phone.strip() if req.phone else None,
                p_hash,
                salt,
                new_active,
                user_id
            )
        )
    else:
        execute_update(
            """
            UPDATE users SET
                full_name = ?,
                username = ?,
                email = ?,
                role = ?,
                phone = ?,
                is_active = ?
            WHERE id = ?
            """,
            (
                req.full_name.strip(),
                req.username.strip(),
                req.email.strip(),
                req.role,
                req.phone.strip() if req.phone else None,
                new_active,
                user_id
            )
        )

    log_audit(
        current_user["id"],
        current_user["username"],
        "UPDATE_USER",
        "USER",
        user_id,
        f"تعديل بيانات المستخدم {req.username} بدور {req.role}"
    )
    return {
        "success": True,
        "message": {
            "ar": "تم تحديث بيانات المستخدم بنجاح",
            "en": "User updated successfully"
        }
    }

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: Dict[str, Any] = Depends(require_roles([ROLE_SUPER_ADMIN]))):
    """Super Admin: Deletes a user account."""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail={"ar": "لا يمكنك حذف حسابك الشخصي الحالي", "en": "Cannot delete your own active account"})
    user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        raise HTTPException(status_code=404, detail={"ar": "المستخدم غير موجود", "en": "User not found"})
        
    execute_update("DELETE FROM users WHERE id = ?", (user_id,))
    log_audit(current_user["id"], current_user["username"], "DELETE_USER", "USER", user_id, f"حذف حساب المستخدم {user['username']}")
    return {"success": True, "message": {"ar": "تم حذف المستخدم بنجاح", "en": "User deleted successfully"}}
