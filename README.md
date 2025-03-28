# To-Do List Application (Microservices)

## Overview
A microservices-based To-Do List application built with FastAPI, PostgreSQL, and React.

  ```
  todo-list-app/
  │── backend/                  # Backend services (FastAPI)
  │   ├── auth_service/         # Authentication microservice
  │   ├── task_service/         # Task management microservice
  │   ├── user_service/         # User management microservice
  │   ├── common/               # Shared utilities & models
  │   ├── docker-compose.yml    # Docker setup
  │   └── requirements.txt      # Python dependencies
  │── frontend/                 # React frontend (optional)
  │── deployment/               # Deployment scripts
  │── .github/workflows/        # GitHub Actions for CI/CD
  │── README.md                 # Documentation

  ```

## Features

- User authentication
- Task management (CRUD operations)
- Secure JWT authentication
- Containerized with Docker
- Deployed using GitHub Actions

## Technologies Used

- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Frontend: React, Axios
- Deployment: Docker, GitHub Actions

## Setup Instructions

1. Clone the repository: `git clone https://github.com/YOUR_GITHUB_USERNAME/todo-list-app.git`
2. Navigate to the backend directory: `cd backend`
3. Run `docker-compose up --build` to start the services.
4. Navigate to the frontend directory: `cd ../frontend`
5. Run `npm install` and `npm start` to start the frontend.

## Endpoints

  | Method|	Endpoint | Description |
  |-------|----------|---------------------|   
  |POST	  | /login	 | User authentication |
  |POST	  | /register	| Register new user |
  |POST	  | /tasks/	  | Create a new task |
  |GET	  | /tasks/{id} |	Get task details |
  |PUT	  | /tasks/{id}	| Update task |
  |DELETE | /tasks/{id}	| Delete task |

# 8. Commit and Push

git add .
git commit -m "Initial commit: Microservices To-Do List App"
git push origin main
