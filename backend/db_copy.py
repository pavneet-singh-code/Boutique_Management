"""Copy the whole boutique database from one place to another.

Used for:
- moving the SQLite file (boutique.db) into Neon Postgres  (migrate_to_postgres.py)
- the "Download backup" button when the app runs on Postgres: the data is
  copied into a fresh SQLite .db file, the same kind of file as before.

Both databases use the tables in models.py. The copy also writes Alembic's
version, so the result can be upgraded later with `alembic upgrade head`.
"""
from datetime import timezone

from sqlalchemy import DateTime, inspect, text

import models  # noqa: F401  (registers every table on Base.metadata)
from database import Base

SUPPORTED_REVISIONS = ("0006", "0007")
BATCH = 500


def read_revision(engine):
    if not inspect(engine).has_table("alembic_version"):
        return None
    with engine.connect() as connection:
        return connection.execute(text("SELECT version_num FROM alembic_version")).scalar()


def create_schema(engine, revision):
    """Creates every table, matching what the migrations give at `revision`."""
    if revision not in SUPPORTED_REVISIONS:
        raise RuntimeError(f"Unsupported database version {revision!r}; expected one of {SUPPORTED_REVISIONS}.")
    existing = set(inspect(engine).get_table_names()) & set(Base.metadata.tables)
    if existing:
        raise RuntimeError(
            "The target database already has boutique tables (" + ", ".join(sorted(existing)) + "). "
            "Use an empty database so nothing is overwritten."
        )
    with engine.begin() as connection:
        Base.metadata.create_all(connection)
        if revision == "0006":
            # Before migration 0007, order numbers may still be missing or repeated
            # (they are fixed on the "Order number check" screen), so the index
            # must not be unique yet. 0007 makes it unique later.
            connection.execute(text("DROP INDEX ix_orders_order_number"))
            connection.execute(text("CREATE INDEX ix_orders_order_number ON orders (order_number)"))
        connection.execute(text(
            "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, "
            "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
        ))
        connection.execute(text("INSERT INTO alembic_version (version_num) VALUES (:v)"), {"v": revision})


def _convert(value, column, target_is_sqlite):
    """Times are stored in UTC. SQLite keeps them without a time zone, Postgres with one."""
    if value is None or not isinstance(column.type, DateTime) or not column.type.timezone:
        return value
    if target_is_sqlite:
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def copy_rows(source_engine, target_engine, log=print):
    """Copies every row of every table. Returns {table: row count}."""
    target_is_sqlite = target_engine.dialect.name == "sqlite"
    source_inspector = inspect(source_engine)
    counts = {}

    source_connection = source_engine.connect()
    if source_engine.dialect.name == "postgresql":
        # One consistent snapshot, even while people are using the app.
        source_connection = source_connection.execution_options(isolation_level="REPEATABLE READ")

    with source_connection, target_engine.begin() as target:
        for table in Base.metadata.sorted_tables:  # parents before children
            if not source_inspector.has_table(table.name):
                log(f"  {table.name}: not in the source, skipped")
                counts[table.name] = 0
                continue
            source_columns = {c["name"] for c in source_inspector.get_columns(table.name)}
            extra = source_columns - set(table.columns.keys())
            if extra:
                # Columns the app no longer uses; refuse rather than silently lose data.
                filled = [
                    name for name in extra
                    if source_connection.execute(
                        text(f'SELECT COUNT(*) FROM {table.name} WHERE "{name}" IS NOT NULL')
                    ).scalar()
                ]
                if filled:
                    raise RuntimeError(f"{table.name} has data in columns the app doesn't know: {filled}")
            columns = [c for c in table.columns if c.name in source_columns]
            select = table.select().with_only_columns(*columns)
            if "id" in table.columns:
                select = select.order_by(table.c.id)
            elif table.primary_key.columns:
                select = select.order_by(*table.primary_key.columns)

            total = 0
            result = source_connection.execute(select)
            while True:
                rows = result.fetchmany(BATCH)
                if not rows:
                    break
                target.execute(
                    table.insert(),
                    [
                        {c.name: _convert(row._mapping[c.name], c, target_is_sqlite) for c in columns}
                        for row in rows
                    ],
                )
                total += len(rows)
            counts[table.name] = total
            log(f"  {table.name}: {total} rows")

        if target_engine.dialect.name == "postgresql":
            # New rows must get ids after the copied ones.
            for table in Base.metadata.sorted_tables:
                if "id" in table.columns and table.c.id.primary_key:
                    target.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table.name}), 1), "
                        f"(SELECT MAX(id) FROM {table.name}) IS NOT NULL)"
                    ))
    return counts


def count_rows(engine):
    with engine.connect() as connection:
        return {
            table.name: connection.execute(text(f"SELECT COUNT(*) FROM {table.name}")).scalar()
            for table in Base.metadata.sorted_tables
        }


def copy_database(source_engine, target_engine, log=print):
    """Creates the schema in the (empty) target and copies everything into it."""
    revision = read_revision(source_engine)
    create_schema(target_engine, revision)
    try:
        counts = copy_rows(source_engine, target_engine, log=log)
    except Exception:
        # Leave the target empty again, so the copy can simply be re-run.
        with target_engine.begin() as connection:
            Base.metadata.drop_all(connection)
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        raise
    return revision, counts
