# syntax=docker/dockerfile:1
FROM node:14 as kicad
WORKDIR /home/node/app
COPY package*.json ./
RUN npm i
COPY . .
RUN npm i npx
RUN npm i ts-node
RUN apk install kicad-cli
CMD ["npx", "ts-node", "./src/service"]