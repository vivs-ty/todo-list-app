FROM python:3.10
WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY auth_service /app/auth_service

EXPOSE 8001
CMD ["uvicorn", "auth_service.main:app", "--host", "0.0.0.0", "--port", "8001"]

