"""SQLAlchemy/SQLModel engine and session management.

`get_session` is the FastAPI dependency that injects a per-request session;
`create_db_and_tables` is called once at app startup to ensure schema exists.
"""

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, echo=False)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
