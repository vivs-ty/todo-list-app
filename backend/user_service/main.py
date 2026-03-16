import os
from datetime import datetime
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


SECRET_KEY = os.getenv("SECRET_KEY", "todo-list-dev-secret")
ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

app = FastAPI(title="user_service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError as error:
        raise HTTPException(status_code=401, detail="Invalid token") from error

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return str(username)


@app.get("/users/me")
def get_current_user_profile(username: str = Depends(get_current_user)) -> dict:
    return {
        "username": username,
        "message": "Profile loaded",
        "fetched_at": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "user"}

