FROM node:20-trixie-slim AS base

FROM base AS builder
WORKDIR /app

RUN npm install turbo --global
COPY . .
RUN turbo prune @sr24/websocket --docker

FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN npm install

COPY --from=builder /app/out/full/ .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=installer /app .
EXPOSE 3002
CMD ["node", "apps/websocket/dist/index.js"]
