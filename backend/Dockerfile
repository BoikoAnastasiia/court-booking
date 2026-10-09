# --- build: full deps, compile TypeScript (also used to run tests) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime: production deps + compiled JS only ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
# Migrations and seed are idempotent, so running them on every start is safe.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/server.js"]
