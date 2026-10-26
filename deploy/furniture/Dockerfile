# Local candidate only. Assets must be explicitly prepared and verified first.
FROM python:3.11-slim-trixie@sha256:b7a9e5f6a93d6d4a31f129bbd4bdee69efccb6ded0fb230d78aafaf37af98377 AS verified-source
WORKDIR /source
COPY . .
RUN python tools/verify_furniture_context.py /source

FROM node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS web
WORKDIR /app
COPY --from=verified-source /source/package.json /source/package-lock.json ./
COPY --from=verified-source /source/apps/web/package.json apps/web/package.json
RUN npm ci --ignore-scripts
COPY --from=verified-source /source/apps/web apps/web
COPY --from=verified-source /source/packages/contracts packages/contracts
COPY --from=verified-source /source/tests/fixtures/synthetic.scene.json tests/fixtures/synthetic.scene.json
COPY --from=verified-source /source/config/placement-30669-alt-02-v3.json config/placement-30669-alt-02-v3.json
COPY --from=verified-source /source/config/sets.json config/sets.json
COPY --from=verified-source /source/config/furniture config/furniture
RUN npm run build

FROM python:3.11-slim-trixie@sha256:b7a9e5f6a93d6d4a31f129bbd4bdee69efccb6ded0fb230d78aafaf37af98377
COPY --from=ghcr.io/astral-sh/uv:0.9.2@sha256:6dbd7c42a9088083fa79e41431a579196a189bcee3ae68ba904ac2bf77765867 /uv /usr/local/bin/uv
WORKDIR /app
COPY --from=verified-source /source/pyproject.toml /source/uv.lock ./
COPY --from=verified-source /source/apps/api/src apps/api/src
RUN uv sync --frozen --no-dev --no-editable --no-cache
# Runtime needs no package installer or vendored wheel/archive build tooling.
RUN /usr/local/bin/python -m pip uninstall --yes setuptools wheel pip && rm /usr/local/bin/uv
COPY --from=verified-source /source/config/furniture config/furniture
# Named context is opt-in; do not broaden root .dockerignore to include manuals.
COPY --from=furniture-assets /documents /app/var/furniture/documents
COPY --from=verified-source /source/release.json /app/release.json
COPY --from=verified-source /source/tools/check_furniture_release.py tools/check_furniture_release.py
COPY --from=web /app/apps/web/dist apps/web/dist
ENV PYTHONPATH=/app/apps/api/src PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN python tools/check_furniture_release.py --cache /app/var/furniture --web-dist /app/apps/web/dist --release-record /app/release.json --strict-cache
RUN useradd --uid 10001 --no-create-home app
# Remove unused mount executables through the package manager. The guard
# refuses Essential/Protected packages or any additional dependency removals; no force flags.
COPY --from=verified-source /source/deploy/furniture/remove_unused_packages.py /tmp/remove_unused_packages.py
RUN python /tmp/remove_unused_packages.py && rm /tmp/remove_unused_packages.py
RUN python -c "import ctypes, curses, readline, sqlite3, ssl, uuid; uuid.uuid4(); ssl.create_default_context()"
USER 10001
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=15s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/v1/furniture/health', timeout=12)"
CMD ["uvicorn", "guide2build.furniture.public:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log", "--no-proxy-headers"]
