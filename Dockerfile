# La imagen del emisor (ADR-0004 y ADR-0017), en dos etapas como las demás apps: la primera corre el
# gate entero, y si falla no se publica nada; la final tiene Node 24 y el código del emisor, nada más.
#
# Qué corre en la VPS, y cómo (la red, las variables, el catálogo montado), se decide en el repo infra.

# Debian y no Alpine para el gate: workerd, que corre los tests del Worker, viene para glibc, y sin
# certificados de CA no arranca.
FROM node:24-bookworm-slim AS gate
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /src

# Primero sólo el lockfile: mientras no cambien las dependencias, la capa del npm ci sale de la cache.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run gate

# El emisor usa sólo lo que trae Node, que lo corre sin compilar: no hay node_modules. package.json va
# porque dice que el código es un módulo.
FROM node:24-alpine
WORKDIR /app
COPY --from=gate --chown=root:root /src/package.json ./
COPY --from=gate --chown=root:root /src/src/envio.ts ./src/
COPY --from=gate --chown=root:root /src/src/emisor ./src/emisor

USER node
CMD ["node", "src/emisor/principal.ts"]
