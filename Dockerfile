FROM node:22

COPY ./server/package.json ./server/yarn.lock /app/server/
WORKDIR /app/server
RUN yarn

COPY ./server /app/server
COPY ./shared /app/shared
COPY ./tsconfig.json /app/tsconfig.json

RUN yarn prisma generate
RUN yarn build

EXPOSE 5000

# volume for sqlite database
VOLUME /data

ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/pride.sqlite"
ENV LOG_OUTPUT_DIR="/data/logs"

# migrate database and start the server
CMD ["bash", "-c", "yarn prisma migrate deploy && yarn start:prod"]
