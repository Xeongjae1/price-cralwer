mkdir -p apps/api/src
cd apps/api

# package.json 생성
cat > package.json << EOF
{
  "name": "@repo/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint . --max-warnings 0"
  },
  "dependencies": {
    "@repo/database": "workspace:*",
    "@repo/shared": "workspace:*",
    "fastify": "^4.21.0",
    "@fastify/cors": "^8.3.0",
    "@fastify/swagger": "^8.8.0",
    "@fastify/swagger-ui": "^1.9.3",
    "puppeteer": "^24.15.0",
    "drizzle-orm": "^0.28.5",
    "pg": "^8.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.5.2",
    "@types/pg": "^8.10.2",
    "tsx": "^3.12.7",
    "typescript": "^5.0.0"
  }
}
EOF

pnpm install