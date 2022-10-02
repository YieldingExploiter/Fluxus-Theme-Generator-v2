FROM node:17-alpine3.14
WORKDIR /
ENV PATH="./node_modules/.bin:$PATH"
COPY . .
RUN npm i
RUN npm run build
RUN sudo pacman -S imagemagick graphicsmagick -y
CMD [ "npm", "run", "start" ]