FROM node:20-alpine as builder

RUN apk add openssl

RUN npm install -g pnpm

WORKDIR /app
COPY . /app

ARG VITE_CLIENT_SOCKET_HOST
ARG VITE_CJS_IGNORE_WARNING
ARG VITE_API_URL

ENV VITE_CLIENT_SOCKET_HOST=$VITE_CLIENT_SOCKET_HOST
ENV VITE_CJS_IGNORE_WARNING=$VITE_CJS_IGNORE_WARNING
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm install
RUN pnpm run build


FROM node:20-alpine as api

# RUN apk add --no-cache openssl

WORKDIR /app

# COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/admin/dist ./apps/admin/dist
COPY --from=builder /app/apps/client/dist ./apps/client/dist

# COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# COPY --from=builder /app/apps/api/package.json ./apps/api/

CMD ["node", "apps/api/dist/main.js"]

FROM node:20-alpine as website

WORKDIR /app

ENV NODE_ENV=production

# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S nextjs -u 1001

COPY --from=builder /app/apps/website/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/website/.next/static ./.next/static

# USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD HOSTNAME="0.0.0.0" node server.js
