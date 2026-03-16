FROM python:3.10

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY task_service /app/task_service

EXPOSE 8002

CMD ["uvicorn", "task_service.main:app", "--host", "0.0.0.0", "--port", "8002"]

