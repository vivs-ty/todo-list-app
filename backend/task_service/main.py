import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field


DB_PATH = os.getenv("TASK_DB_PATH", "/tmp/task_service.db")
SECRET_KEY = os.getenv("SECRET_KEY", "todo-list-dev-secret")
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

app = FastAPI(title="task_service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskPayload(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=320)
    completed: bool = False
    priority: str = Field(default="medium")
    category: str = Field(default="general")


class TaskResponse(TaskPayload):
    id: int
    createdAt: str


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                completed INTEGER NOT NULL,
                priority TEXT NOT NULL,
                category TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def decode_username(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError as error:
        raise HTTPException(status_code=401, detail="Invalid token") from error

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return str(username)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return decode_username(credentials.credentials)


def row_to_task(row: sqlite3.Row) -> TaskResponse:
    return TaskResponse(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        completed=bool(row["completed"]),
        priority=row["priority"],
        category=row["category"],
        createdAt=row["created_at"],
    )


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/tasks", response_model=list[TaskResponse])
@app.get("/tasks/", response_model=list[TaskResponse])
def list_tasks(current_user: str = Depends(get_current_user)) -> list[TaskResponse]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, description, completed, priority, category, created_at
            FROM tasks
            WHERE username = ?
            ORDER BY id DESC
            """,
            (current_user,),
        ).fetchall()

    return [row_to_task(row) for row in rows]


@app.post("/tasks", response_model=TaskResponse)
@app.post("/tasks/", response_model=TaskResponse)
def create_task(task: TaskPayload, current_user: str = Depends(get_current_user)) -> TaskResponse:
    created_at = datetime.now(tz=timezone.utc).isoformat()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO tasks (username, title, description, completed, priority, category, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user,
                task.title.strip(),
                task.description.strip(),
                int(task.completed),
                task.priority,
                task.category,
                created_at,
            ),
        )
        connection.commit()
        task_id = cursor.lastrowid

    return TaskResponse(id=task_id, createdAt=created_at, **task.model_dump())


@app.put("/tasks/{task_id}", response_model=TaskResponse)
@app.put("/tasks/{task_id}/", response_model=TaskResponse)
def update_task(task_id: int, task: TaskPayload, current_user: str = Depends(get_current_user)) -> TaskResponse:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id, created_at
            FROM tasks
            WHERE id = ? AND username = ?
            """,
            (task_id, current_user),
        ).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Task not found")

        connection.execute(
            """
            UPDATE tasks
            SET title = ?, description = ?, completed = ?, priority = ?, category = ?
            WHERE id = ? AND username = ?
            """,
            (
                task.title.strip(),
                task.description.strip(),
                int(task.completed),
                task.priority,
                task.category,
                task_id,
                current_user,
            ),
        )
        connection.commit()

    return TaskResponse(id=task_id, createdAt=existing["created_at"], **task.model_dump())


@app.delete("/tasks/{task_id}")
@app.delete("/tasks/{task_id}/")
def delete_task(task_id: int, current_user: str = Depends(get_current_user)) -> dict:
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM tasks WHERE id = ? AND username = ?",
            (task_id, current_user),
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Task not found")

        connection.execute(
            "DELETE FROM tasks WHERE id = ? AND username = ?",
            (task_id, current_user),
        )
        connection.commit()

    return {"message": "Task deleted"}


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "task"}


