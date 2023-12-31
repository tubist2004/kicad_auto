# syntax=docker/dockerfile:1
FROM sitespeedio/node:ubuntu-22.04-nodejs-18.14.2
WORKDIR /home/node/app
COPY package*.json ./
RUN apt update
RUN apt -y install npm
RUN apt -y install software-properties-common
RUN add-apt-repository --yes ppa:kicad/kicad-7.0-releases
RUN apt update
RUN apt -y install kicad
RUN npm i
RUN apt -y install ssh
RUN < /dev/zero ssh-keygen -q -N ""
RUN ssh-keyscan github.com >> ~/.ssh/known_hosts
COPY . .
CMD ["npx", "ts-node", "./src/service"]
CMD ["npx", "nodemon"]
