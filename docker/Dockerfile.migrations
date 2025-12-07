FROM node:20-alpine

RUN apk update && apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/db ./packages/db

RUN npm install

RUN cd packages/db && npm run db:generate

CMD ["npm", "-w", "@sr24/db", "run", "db:deploy"]