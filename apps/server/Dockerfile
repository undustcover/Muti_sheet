# 多阶段构建，非 root 运行
FROM node:20 AS builder
WORKDIR /app
COPY package.json tsconfig.json tsconfig.build.json /app/
COPY src /app/src
COPY prisma /app/prisma
RUN npm i -g pnpm \
  && pnpm install --prod=false \
  && pnpm prisma generate \
  && pnpm run build

FROM node:20 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN useradd -m -r -s /bin/bash appuser
USER appuser
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/prisma /app/prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]