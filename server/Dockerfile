FROM node:22

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn prisma generate
RUN yarn build

EXPOSE 5000

# volume for sqlite database
VOLUME /data

ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/pride.sqlite"
ENV LOG_OUTPUT_PATH="/data/logs"

# migrate database and start the server
CMD ["bash", "-c", "yarn prisma migrate deploy && yarn start"]