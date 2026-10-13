import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import STATIC_DIR, TEMPLATES_DIR
from app.seed_data import init_default_users

# Routers
from app.routers import (
    auth, dashboard, students, courses, groups,
    trainers, attendance, finance, expenses,
    leads, assessments, reports, notifications, audit, system
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is initialized and staff users created
    try:
        init_default_users()
    except Exception as e:
        print(f"Startup database initialization error: {e}")
    yield

app = FastAPI(
    title="DoseWise Academy Training Center Management System",
    description="Production-ready web application and API for DoseWise Academy",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"حدث خطأ في النظام: {str(exc)}"}
    )

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(groups.router)
app.include_router(trainers.router)
app.include_router(attendance.router)
app.include_router(finance.router)
app.include_router(expenses.router)
app.include_router(leads.router)
app.include_router(assessments.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(system.router)

# Mount Static Assets
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def serve_index():
    """Serves the main application SPA HTML."""
    index_file = TEMPLATES_DIR / "index.html"
    return FileResponse(index_file)

@app.get("/favicon.ico")
def serve_favicon():
    fav_file = STATIC_DIR / "img" / "logo-icon.svg"
    return FileResponse(fav_file, media_type="image/svg+xml")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
