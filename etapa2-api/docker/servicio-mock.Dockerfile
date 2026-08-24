FROM python:3.11-slim
WORKDIR /app
COPY materiales/servicio_mock/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY materiales/servicio_mock/app.py ./app.py
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
