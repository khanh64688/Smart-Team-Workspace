import sys
import os
from pathlib import Path

# Add backend root to path so app.* imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Load .env file
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from alembic import context
from sqlalchemy import create_engine, pool
from app.database import Base
import app.models

config = context.config
target_metadata = Base.metadata

# Override sqlalchemy.url from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "")
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline():
    context.configure(url=DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_offline() if context.is_offline_mode() else run_migrations_online()

