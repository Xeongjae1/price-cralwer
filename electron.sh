mkdir -p apps/desktop/src
cd apps/desktop

# package.json 생성
cat > package.json << EOF
{
  "name": "@repo/desktop",
  "version": "0.0.0",
  "private": true,
  "main": "dist/electron/main.js",
  "scripts": {
    "build": "vite build && tsc -p tsconfig.electron.json",
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron": "electron .",
    "dist": "npm run build && electron-builder",
    "preview": "vite preview"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "electron": "^33.2.1",
    "@tanstack/react-query": "^5.62.2",
    "axios": "^1.7.9",
    "react-router-dom": "^6.28.0",
    "zustand": "^5.0.2",
    "date-fns": "^4.1.0",
    "recharts": "^2.13.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react-swc": "^3.7.1",
    "vite": "^6.0.1",
    "typescript": "^5.7.2",
    "tailwindcss": "^3.4.15",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "concurrently": "^9.1.0",
    "wait-on": "^8.0.1",
    "electron-builder": "^25.1.8",
    "@types/node": "^22.10.1"
  }
}
EOF

pnpm install