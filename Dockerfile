# syntax=docker/dockerfile:1
FROM sitespeedio/node:ubuntu-22.04-nodejs-18.14.2
WORKDIR /home/node/app
COPY package*.json ./
RUN apt update
RUN apt install npm
RUN apt install kicad-cli
RUN npm i
COPY . .
RUN npm i npx
RUN npm i ts-node
#CMD ["npx", "ts-node", "./src/service"]