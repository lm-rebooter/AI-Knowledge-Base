FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack enable && pnpm install

COPY . .

WORKDIR /app/apps/api

RUN pnpm prisma:generate && pnpm build

EXPOSE 3001

CMD ["pnpm", "start"]
