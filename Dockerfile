FROM node:current
WORKDIR /app
ENV PATH="./node_modules/.bin:$PATH"
COPY . .
RUN apt update
RUN apt install imagemagick graphicsmagick -y
RUN npm i
RUN npm run build
CMD [ "npm", "run", "start" ]
