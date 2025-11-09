FROM node:22

COPY package.json package-lock.json ./

RUN npm i

COPY . ./

RUN npm run build

CMD ["npm", "run", "prod"]
