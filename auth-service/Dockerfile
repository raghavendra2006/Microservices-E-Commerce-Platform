FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY --chown=node:node package*.json ./
RUN npm ci --only=production
COPY --chown=node:node . .
EXPOSE 3001
USER node
CMD ["node", "src/server.js"]
