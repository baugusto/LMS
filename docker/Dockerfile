FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

RUN if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.build ? 0 : 1)"; then \
      npm run build; \
    else \
      echo "No build script found. Skipping build."; \
    fi

RUN npm prune --omit=dev

RUN node -e "const fs=require('fs'); const pkg=require('./package.json'); const hasStart=Boolean(pkg.scripts && pkg.scripts.start); const hasServer=fs.existsSync('server.js'); if (!hasStart && !hasServer) { console.error('Missing npm start script and server.js. Add a start script or a server.js file.'); process.exit(1);}"

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "if node -e \"const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.start ? 0 : 1)\"; then npm start; elif [ -f server.js ]; then node server.js; else echo 'Missing npm start script and server.js. Add a start script or a server.js file.' >&2; exit 1; fi"]
