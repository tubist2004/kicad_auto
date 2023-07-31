# syntax=docker/dockerfile:1
   
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN yarn install --production
RUN apk add --update nodejs nodejs-npm
RUN npm install
CMD ["sh"]
EXPOSE 3100