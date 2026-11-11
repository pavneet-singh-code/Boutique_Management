from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv

load_dotenv()

from database import engine  # noqa: E402
import models  # noqa: E402,F401  (registers the tables)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = models.Base.metadata


def run_migrations_online():
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite can't ALTER columns; batch mode rebuilds the table safely.
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    raise SystemExit("Offline migrations are not supported; run 'alembic upgrade head'.")

run_migrations_online()
