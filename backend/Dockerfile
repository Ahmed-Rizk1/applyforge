# Multi-stage Dockerfile for FastAPI + Tectonic LaTeX compiler
FROM python:3.11-slim AS builder

# Install curl & tectonic
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.tectonic-typesetting.github.io/installer/tectonic.sh | sh -s -- --to /usr/local/bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-cache

FROM python:3.11-slim AS runner
WORKDIR /app

# Copy tectonic binary from builder
COPY --from=builder /usr/local/bin/tectonic /usr/local/bin/tectonic

# Copy python dependencies & app code
COPY --from=builder /app/.venv /app/.venv
COPY app /app/app
COPY latex /app/latex

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
