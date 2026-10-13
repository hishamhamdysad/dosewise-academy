import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "app" / "static"
TEMPLATES_DIR = BASE_DIR / "app" / "templates"

DATA_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "dosewise.db"
SECRET_KEY = os.getenv("DOSEWISE_SECRET_KEY", "dosewise_super_secret_production_key_2026_egp")
SESSION_COOKIE_NAME = "dosewise_session"
DEFAULT_CURRENCY = "EGP"
DEFAULT_LOCALE = "ar-EG"

# System User Roles
ROLE_SUPER_ADMIN = "super_admin"
ROLE_CENTER_MANAGER = "center_manager"
ROLE_RECEPTIONIST = "receptionist"
ROLE_ACCOUNTANT = "accountant"
ROLE_TRAINER = "trainer"

ROLES_ALL = [
    ROLE_SUPER_ADMIN,
    ROLE_CENTER_MANAGER,
    ROLE_RECEPTIONIST,
    ROLE_ACCOUNTANT,
    ROLE_TRAINER,
]

ROLE_LABELS_AR = {
    ROLE_SUPER_ADMIN: "مدير عام النظام (Super Admin)",
    ROLE_CENTER_MANAGER: "مدير المركز (Center Manager)",
    ROLE_RECEPTIONIST: "موظف استقبال (Receptionist)",
    ROLE_ACCOUNTANT: "محاسب مالي (Accountant)",
    ROLE_TRAINER: "محاضر / مدرب (Trainer)",
}

ROLE_LABELS_EN = {
    ROLE_SUPER_ADMIN: "Super Admin",
    ROLE_CENTER_MANAGER: "Center Manager",
    ROLE_RECEPTIONIST: "Receptionist",
    ROLE_ACCOUNTANT: "Accountant",
    ROLE_TRAINER: "Trainer",
}
