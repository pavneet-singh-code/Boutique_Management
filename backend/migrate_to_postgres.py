"""One-time move of boutique.db (SQLite) into an empty Neon Postgres database.

Usage (from the backend folder):
    .venv\\Scripts\\python migrate_to_postgres.py path\\to\\boutique.db

The Neon address is read from repo/.env.local (written by `neon init`), or from
NEON_DATABASE_URL; otherwise it asks for it (typing is hidden), so the password
never ends up in your command history.

Safe to try: it refuses to touch a database that already has boutique tables,
and it never changes the SQLite file. Afterwards it compares row counts.
"""
import getpass
import os
import sys
from pathlib import Path

# Don't let the app's default (PythonAnywhere) database be picked up by accident.
os.environ.setdefault("DATABASE_URL", "sqlite://")

from database import make_engine  # noqa: E402
from db_copy import copy_database, count_rows  # noqa: E402


NEON_ENV_FILE = Path(__file__).resolve().parent.parent / ".env.local"  # written by `neon init`


def neon_env_local_url():
    """The direct (unpooled) Neon address from repo/.env.local, best for a bulk copy."""
    if not NEON_ENV_FILE.is_file():
        return None
    from dotenv import dotenv_values

    values = dotenv_values(NEON_ENV_FILE)
    url = values.get("DATABASE_URL_UNPOOLED") or values.get("DATABASE_URL")
    if url:
        print(f"Using the Neon address from {NEON_ENV_FILE}")
    return url


def main():
    if len(sys.argv) != 2 or not os.path.isfile(sys.argv[1]):
        sys.exit("Usage: python migrate_to_postgres.py path/to/boutique.db")
    sqlite_path = os.path.abspath(sys.argv[1])

    target_url = (
        os.environ.get("NEON_DATABASE_URL")
        or neon_env_local_url()
        or getpass.getpass("Paste the Neon connection string (postgresql://..., typing is hidden): ").strip()
    )
    if not target_url.startswith(("postgres://", "postgresql://")):
        sys.exit("That doesn't look like a Postgres address (it should start with postgresql://).")

    # Read-only: the SQLite file is never changed.
    source = make_engine(f"sqlite:///{Path(sqlite_path).as_uri()}?mode=ro&uri=true")
    target = make_engine(target_url)

    print(f"Copying {sqlite_path} -> Neon ({target.url.host})")
    revision, copied = copy_database(source, target)

    source_counts, target_counts = count_rows(source), count_rows(target)
    problems = [t for t in source_counts if source_counts[t] != target_counts[t]]
    if problems:
        sys.exit(f"Row counts differ for: {problems}. Check before using Neon.")

    print()
    print(f"Done. Database version {revision}, {sum(copied.values())} rows copied, all counts match.")
    if revision == "0006":
        print("Order numbers are not unique yet: fix them on the 'Order number check' screen,")
        print("then run 'alembic upgrade head' with DATABASE_URL set to the Neon address.")


if __name__ == "__main__":
    main()
