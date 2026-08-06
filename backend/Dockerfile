# Multi-stage Dockerfile for FastAPI + Tectonic LaTeX compiler
FROM python:3.11-slim AS builder

# Install curl, ca-certificates, tar & tectonic binary directly from GitHub release
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    tar \
    && (curl -fsSL https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-gnu.tar.gz | tar -xz -C /usr/local/bin || curl -fsSL -k https://drop-sh.tectonic-typesetting.github.io/installer/tectonic.sh | sh -s -- --to /usr/local/bin) \
    && chmod +x /usr/local/bin/tectonic \
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

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
