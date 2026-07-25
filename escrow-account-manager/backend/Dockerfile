FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create upload and log directories
RUN mkdir -p uploads/properties uploads/mutations uploads/evidence uploads/kyc uploads/contracts logs

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
