FROM python:3.10

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY user_service /app/user_service

EXPOSE 8003

CMD ["uvicorn", "user_service.main:app", "--host", "0.0.0.0", "--port", "8003"]

