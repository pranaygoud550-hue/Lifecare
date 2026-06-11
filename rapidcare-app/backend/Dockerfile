FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
RUN npm install -w rapidcare-backend 2>/dev/null || npm install --workspace=backend
COPY backend ./backend
RUN npm run build -w rapidcare-backend 2>/dev/null || npm run build --workspace=backend

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 5002
CMD ["node", "backend/dist/server.js"]
