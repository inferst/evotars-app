FROM node:20-alpine AS builder

RUN apk add openssl

RUN npm install -g pnpm
RUN npm install -g @vercel/ncc

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY apps/website/package.json ./apps/website/package.json

COPY packages/database/package.json ./packages/database/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

ARG VITE_CLIENT_SOCKET_HOST
ARG VITE_CJS_IGNORE_WARNING
ARG VITE_API_URL

ENV VITE_CLIENT_SOCKET_HOST=$VITE_CLIENT_SOCKET_HOST
ENV VITE_CJS_IGNORE_WARNING=$VITE_CJS_IGNORE_WARNING
ENV VITE_API_URL=$VITE_API_URL

COPY . /app
RUN pnpm run build

RUN ncc build apps/api/dist/main.js -o apps/api/build


FROM node:20-alpine AS app

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/static /app/static

COPY --from=builder /app/packages/database/generated /app/packages/database/generated

COPY --from=builder /app/apps/api/build /app/apps/api/build

COPY --from=builder /app/apps/admin/dist /app/apps/admin/dist
COPY --from=builder /app/apps/client/dist /app/apps/client/dist

WORKDIR /app/apps/api

CMD ["node", "build/index.js"]


FROM node:20-alpine AS website

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/website/public ./apps/website/public

COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/website/.next/static ./apps/website/.next/static

CMD ["node", "apps/website/server.js"]
