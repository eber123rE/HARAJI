FROM node:18-alpine

WORKDIR /usr/src/app

# copy package files first for better caching
COPY package*.json ./
RUN npm install --production

# copy all sources
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD [ "npm", "start" ]
