# League of PRIDE 服务器

## 开发

### 安装依赖

```bash
yarn
yarn prisma generate
```

### 创建数据库环境变量

保存到 `.env` 文件中

```bash
DATABASE_URL="file:./dev.sqlite"
```

### 运行

```bash
yarn start:dev
```

