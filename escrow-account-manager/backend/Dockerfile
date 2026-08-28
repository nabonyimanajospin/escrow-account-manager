FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copy source
COPY . .

# Create upload, log, contract, and artifact directories
RUN mkdir -p uploads/properties uploads/mutations uploads/evidence uploads/kyc uploads/contracts logs artifacts contracts

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
