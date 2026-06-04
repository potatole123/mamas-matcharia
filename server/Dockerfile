FROM node:22-alpine

WORKDIR /app

ENV PORT=5001

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

EXPOSE 5001

CMD ["npm", "run", "dev"]
