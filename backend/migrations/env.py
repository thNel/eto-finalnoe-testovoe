from alembic import context

from app.database.connection import engine
from app.database.editor import EditorState


if context.is_offline_mode():
    context.configure(
        url=engine.url,
        target_metadata=EditorState.metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=EditorState.metadata)
        with context.begin_transaction():
            context.run_migrations()
