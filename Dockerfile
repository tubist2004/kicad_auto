# syntax=docker/dockerfile:1
FROM node:14 as base
WORKDIR /home/node/app
COPY package*.json ./
RUN npm i
COPY . .
RUN npm i npx
RUN npm i ts-node
CMD ["npx", "ts-node", "./src/service"]