FROM python:3.12-slim

WORKDIR /app

COPY services/api/requirements.txt services/api/requirements.txt
RUN pip install --no-cache-dir -r services/api/requirements.txt

COPY services/api/ services/api/

EXPOSE 8000

CMD ["uvicorn", "services.api.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
