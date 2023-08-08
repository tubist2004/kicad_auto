# syntax=docker/dockerfile:1
FROM node:10-alpine
WORKDIR /home/node/app
COPY package*.json ./
RUN apk install npm
RUN npm i
COPY . .
RUN npm i npx
RUN npm i ts-node
RUN apk install kicad-cli
CMD ["npx", "ts-node", "./src/service"]