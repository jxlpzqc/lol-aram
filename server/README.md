# League of PRIDE Server

## Deploy guide

1. prepare `docker` and `docker-compose-v2`
2. prepare `docker-compose.yml`

```
services:
  server:
    build:
        context: ${REPO_PATH}/server
        dockerfile: Dockerfile
    ports:
      - ${PORT}:5000
    environment:
      - NODE_ENV=production
    volumes:
      - ${DATA_PATH}:/data
```

3. run `docker-compose up -d`