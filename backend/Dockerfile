FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Run migrations then start the server
CMD node db/migrate.js && node src/api/index.js
