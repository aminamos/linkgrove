FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY profile.config.json ./profile.config.json
COPY tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

CMD ["node", "--import", "tsx", "src/server.ts"]
