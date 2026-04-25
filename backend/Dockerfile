FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init && addgroup -S app && adduser -S app -G app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER app
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
