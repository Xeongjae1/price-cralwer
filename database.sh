mkdir -p packages/database/src
cd packages/database

# package.json 생성
cat > package.json << EOF
{
  "name": "@repo/database",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "db:migrate": "node dist/migrate.js",
    "db:seed": "node dist/seed.js"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "drizzle-orm": "^0.28.5"
  },
  "devDependencies": {
    "@types/pg": "^8.10.2",
    "drizzle-kit": "^0.19.13",
    "typescript": "^5.0.0"
  }
}
EOF

pnpm install