FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack enable && pnpm install

COPY . .

WORKDIR /app/apps/web

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
