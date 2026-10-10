FROM node:22-alpine

WORKDIR /marekerk-website-poc

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4321

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]