# League of PRIDE

![](./client/renderer/public/images/lop-logo-text.png)

该工具可以帮助多人进行极地大乱斗内战。


## 功能描述

由于《英雄联盟》客户端本身不支持创建带重随英雄功能的极地大乱斗房间，该工具可以在客户端以外完成英雄选择的过程，然后通过 LCU API 自动创建一个英雄自选房间，然后所有人加入房间后自动开始游戏，选择英雄。

由于国服客户端在管理员模式下运行，为了获取 LCU 客户端的 API Key，该工具需要在管理员模式下运行。

## 构建

### 客户端

```bash
cd client
yarn
yarn build
```

### 服务器
```
cd server
yarn
yarn build
```


## 服务器运行

服务器的运行可以采用以下方式

1. 在 linux 服务器中准备 `docker` and `docker-compose-v2`
2. 准备 `docker-compose.yml`
  
    方式1：使用 Docker Hub 上的镜像
    ```yml
    services:
      server:
        image: jxlpzqc/league-of-pride-server
        ports:
          - ${PORT}:5000
        volumes:
          - ${DATA_PATH}:/data
    ```

    方式2：使用本地构建的镜像，将 `docker-compose.yml` 放在 `Dockerfile` 同级下
    ```yml
    services:
      server:
        build: .
        ports:
          - ${PORT}:5000
        volumes:
          - ${DATA_PATH}:/data
    ```

3. 运行 `docker-compose up -d`


之后，在客户端中输入服务器的地址（格式 `地址:域名`，不要加 `http://` 等前后缀）即可使用。