from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import config_routes, plates, scan, transactions, video

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PlateDaddy",
    description="Drive-through payment system using license plate recognition",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plates.router)
app.include_router(scan.router)
app.include_router(transactions.router)
app.include_router(config_routes.router)
app.include_router(video.router)


@app.get("/")
def root():
    return {
        "name": "PlateDaddy",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
