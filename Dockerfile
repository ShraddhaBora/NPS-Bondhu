FROM python:3.10.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model during build so it's cached in the image
# This avoids a slow download on every cold start
COPY src/ src/
RUN python src/download_model.py

# Copy rest of the application
COPY . .

# HuggingFace Spaces requires port 7860
EXPOSE 7860

# Use a single gunicorn worker with uvicorn - enough for a free Space
CMD ["gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", \
     "--timeout", "300", "--bind", "0.0.0.0:7860", \
     "--log-level", "info", \
     "backend.main:app"]
