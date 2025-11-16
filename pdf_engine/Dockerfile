# Dockerfile for PDF Engine Service
# Multi-stage build for optimal image size

FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libwayland-client0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  libu2f-udev \
  libvulkan1 \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only for PDF generation)
RUN playwright install chromium && \
  playwright install-deps chromium

# Copy application code
COPY . .

# Create output directories
RUN mkdir -p generated_pdfs outputs

# Expose port (default 8000, configurable via PORT env var)
EXPOSE 8000

# Set default port if not specified
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import os; import requests; port = os.getenv('PORT', '8000'); requests.get(f'http://localhost:{port}/health')" || exit 1

# Run the application with configurable port
CMD uvicorn main_server:app --host 0.0.0.0 --port ${PORT}

