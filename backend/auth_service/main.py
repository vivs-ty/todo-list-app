import os
import sqlite3
from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac
import secrets

import jwt
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DB_PATH = os.getenv("AUTH_DB_PATH", "/tmp/auth_service.db")
SECRET_KEY = os.getenv("SECRET_KEY", "todo-list-dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

app = FastAPI(title="auth_service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserAuth(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    username: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL
            )
            """
        )


def create_access_token(username: str) -> str:
    expires_at = datetime.now(tz=timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expires_at}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{base64.b64encode(salt).decode('utf-8')}:{base64.b64encode(digest).decode('utf-8')}"


def verify_password(password: str, stored_hash: str) -> bool:
    parts = stored_hash.split(":")
    if len(parts) != 2:
        return False

    salt_b64, digest_b64 = parts
    salt = base64.b64decode(salt_b64.encode("utf-8"))
    expected_digest = base64.b64decode(digest_b64.encode("utf-8"))
    current_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return hmac.compare_digest(current_digest, expected_digest)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.post("/register", response_model=UserResponse)
@app.post("/register/", response_model=UserResponse)
def register(user: UserAuth) -> UserResponse:
    hashed_password = hash_password(user.password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
                (user.username.strip(), hashed_password),
            )
            user_id = cursor.lastrowid
            connection.commit()
            return UserResponse(id=user_id, username=user.username.strip())
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=400, detail="User already exists") from error


@app.post("/login", response_model=TokenResponse)
@app.post("/login/", response_model=TokenResponse)
def login(user: UserAuth) -> TokenResponse:
    with get_connection() as connection:
        db_user = connection.execute(
            "SELECT id, username, hashed_password FROM users WHERE username = ?",
            (user.username.strip(),),
        ).fetchone()

    if db_user is None or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token(db_user["username"])
    return TokenResponse(access_token=token, token_type="bearer")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "auth"}
