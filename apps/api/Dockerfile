# Build from the repo root: docker build -f apps/api/Dockerfile .
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS build
RUN npm install -g pnpm@12.5.1
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@school-mgmt/api..."
RUN pnpm --filter @school-mgmt/api build
# Production-only node_modules + dist; workspace packages are already bundled into dist.
RUN pnpm --filter @school-mgmt/api deploy --prod /out

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "--enable-source-maps", "dist/server.js"]
