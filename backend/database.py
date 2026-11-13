import os

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Where the data lives:
# - Render + Neon: DATABASE_URL is the Neon Postgres address (postgresql://...).
# - PythonAnywhere: no DATABASE_URL, so the SQLite file below is used.
# - On your PC: e.g. DATABASE_URL=sqlite:///./boutique.db
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:////home/piggothegreat/Boutique_Management/backend/boutique.db",
)


def normalize_url(url):
    """Neon / Render give 'postgres://' or 'postgresql://' addresses; we use the
    psycopg (version 3) driver, which SQLAlchemy calls 'postgresql+psycopg'."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def make_engine(url):
    url = normalize_url(url)
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # Neon closes idle connections and sleeps when nobody uses the app, so check
    # each connection before use and don't keep them around for long.
    # prepare_threshold=None: no server-side prepared statements, which don't
    # mix reliably with Neon's connection pooler (the "-pooler" address).
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=5,
        connect_args={"prepare_threshold": None},
    )


engine = make_engine(SQLALCHEMY_DATABASE_URL)
IS_SQLITE = engine.dialect.name == "sqlite"

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
