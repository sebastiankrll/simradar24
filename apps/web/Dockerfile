# Correct multi-stage setup
FROM node:20-alpine AS base

RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app

FROM base AS prepare
RUN npm install turbo --global
COPY . .
RUN turbo prune @sr24/web --docker

FROM base AS builder
# First install the dependencies (as they change less often)
COPY --from=prepare /app/out/json/ .
RUN npm install
# Build the project
COPY --from=prepare /app/out/full/ .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_R2_BUCKET_URL
ARG API_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG VATSIM_CLIENT_ID
ARG VATSIM_CLIENT_SECRET
ARG VATSIM_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_R2_BUCKET_URL=$NEXT_PUBLIC_R2_BUCKET_URL
ENV API_URL=$API_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV VATSIM_CLIENT_ID=$VATSIM_CLIENT_ID
ENV VATSIM_CLIENT_SECRET=$VATSIM_CLIENT_SECRET
ENV VATSIM_AUTH_URL=$VATSIM_AUTH_URL

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
EXPOSE 3000

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

CMD node apps/web/server.js