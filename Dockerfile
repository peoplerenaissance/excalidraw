FROM node:18

WORKDIR /excalidraw

COPY package.json yarn.lock ./
RUN yarn

ARG NODE_ENV=production

COPY . .
RUN yarn build:app:docker
