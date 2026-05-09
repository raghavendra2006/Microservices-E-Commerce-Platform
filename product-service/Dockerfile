FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY --chown=node:node package*.json ./
RUN npm ci --only=production
COPY --chown=node:node . .
EXPOSE 3002
USER node
CMD ["node", "src/server.js"]
