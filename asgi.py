"""
ASGI entrypoint for production servers (Uvicorn, Hypercorn, Daphne).
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("asgi:app", host="0.0.0.0", port=port)
