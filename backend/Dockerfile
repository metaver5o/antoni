FROM node:22-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:22-slim
WORKDIR /app
RUN mkdir -p /tmp/recordings
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
