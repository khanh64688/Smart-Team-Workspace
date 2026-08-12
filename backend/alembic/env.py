import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alembic import context
from sqlalchemy import engine_from_config, pool
from app.database import Base
import app.models

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Lấy DATABASE_URL từ settings/.env
database_url = str(settings.database_url)
database_url = database_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", database_url)

# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# Override sqlalchemy.url from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "")
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline():
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction(): context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction(): context.run_migrations()

run_migrations_offline() if context.is_offline_mode() else run_migrations_online()
