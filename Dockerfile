# syntax=docker/dockerfile:1
   
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN yarn install --production
CMD [ "/bin/ls", "-l" ]
EXPOSE 3100