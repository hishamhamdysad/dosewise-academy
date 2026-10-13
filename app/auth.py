import hmac
import hashlib
import secrets
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import Request, HTTPException, status, Depends
from app.config import SECRET_KEY, SESSION_COOKIE_NAME, ROLES_ALL, ROLE_SUPER_ADMIN
from app.database import query_one

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hashes a password with PBKDF2-HMAC-SHA256 and returns (salt, password_hash)."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return salt, key.hex()

def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    """Verifies a password against the stored salt and hash."""
    _, calculated_hash = hash_password(password, salt)
    return hmac.compare_digest(calculated_hash, expected_hash)

def create_access_token(user_data: Dict[str, Any], expires_hours: int = 24) -> str:
    """Creates a signed JWT-like token using HMAC-SHA256."""
    payload = {
        "sub": user_data["id"],
        "username": user_data["username"],
        "role": user_data["role"],
        "full_name": user_data["full_name"],
        "exp": (datetime.utcnow() + timedelta(hours=expires_hours)).timestamp()
    }
    header_json = json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8')
    payload_json = json.dumps(payload).encode('utf-8')
    
    b64_header = base64.urlsafe_b64encode(header_json).decode('utf-8').rstrip("=")
    b64_payload = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip("=")
    
    signing_input = f"{b64_header}.{b64_payload}"
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input.encode('utf-8'), hashlib.sha256).digest()
    b64_signature = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip("=")
    
    return f"{b64_header}.{b64_payload}.{b64_signature}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Validates the signature and expiration of a token and returns the payload."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        b64_header, b64_payload, b64_signature = parts
        
        signing_input = f"{b64_header}.{b64_payload}"
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input.encode('utf-8'), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(b64_signature + "=" * (-len(b64_signature) % 4))
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        
        payload_bytes = base64.urlsafe_b64decode(b64_payload + "=" * (-len(b64_payload) % 4))
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        if datetime.utcnow().timestamp() > payload.get("exp", 0):
            return None
        
        return payload
    except Exception:
        return None

def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Extracts the logged-in user from Bearer header or cookie if present."""
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    
    if not token:
        token = request.cookies.get(SESSION_COOKIE_NAME)
        
    if not token:
        return None
        
    payload = decode_access_token(token)
    if not payload:
        return None
        
    user = query_one(
        "SELECT id, username, email, full_name, role, phone, is_active FROM users WHERE id = ? AND is_active = 1",
        (payload["sub"],)
    )
    return user

def get_current_user(request: Request) -> Dict[str, Any]:
    """Dependency that guarantees an authenticated active user or raises 401."""
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ar": "يرجى تسجيل الدخول للمتابعة", "en": "Authentication required"}
        )
    return user

def require_roles(allowed_roles: List[str]):
    """Returns a dependency function checking if current user has one of the allowed roles."""
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user["role"] == ROLE_SUPER_ADMIN or user["role"] in allowed_roles:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "ar": "ليس لديك صلاحية للوصول إلى هذا الإجراء",
                "en": "You do not have permission to perform this action"
            }
        )
    return role_checker
