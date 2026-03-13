from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
from app.routes import auth, config_routes, plates, scan, stores, transactions

# Create tables (new tables: stores, memberships, credit_ledger)
Base.metadata.create_all(bind=engine)

# Migrate existing transactions table to add store_id column if missing
_insp = inspect(engine)
_existing_txn_cols = [c["name"] for c in _insp.get_columns("transactions")]
if "store_id" not in _existing_txn_cols:
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE transactions ADD COLUMN store_id INTEGER REFERENCES stores(id)"))
        _conn.commit()

# Migrate existing stores table to add email + hashed_password columns if missing
_existing_store_cols = [c["name"] for c in _insp.get_columns("stores")]
with engine.connect() as _conn:
    _changed = False
    if "email" not in _existing_store_cols:
        _conn.execute(text("ALTER TABLE stores ADD COLUMN email TEXT"))
        _changed = True
    if "hashed_password" not in _existing_store_cols:
        _conn.execute(text("ALTER TABLE stores ADD COLUMN hashed_password TEXT"))
        _changed = True
    if _changed:
        _conn.commit()

app = FastAPI(
    title="PlateDaddy",
    description="Drive-through payment system using license plate recognition",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plates.router)
app.include_router(scan.router)
app.include_router(transactions.router)
app.include_router(config_routes.router)
app.include_router(stores.router)
app.include_router(auth.router)


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
