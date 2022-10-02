FROM node:17-alpine3.14
WORKDIR /app
ENV PATH="./node_modules/.bin:$PATH"
COPY . .
RUN npm i
RUN npm run build
RUN npm run start