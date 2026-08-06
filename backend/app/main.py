from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.routes.upload import router as upload_router
from app.routes.profile import router as profile_router
from app.routes.generate import router as generate_router
from app.routes.validate_key import router as validate_key_router

app = FastAPI(
    title="ApplyForge API",
    description="AI-powered, JD-tailored job application toolkit",
    version="0.1.0",
)

app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(validate_key_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}
