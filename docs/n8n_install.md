# n8n 安装与配置

## 快速开始

立即使用 [npx](https://docs.n8n.io/hosting/installation/npm/) 尝试 n8n (需要 [Node.js](https://nodejs.org/en/)):

```
npx n8n
```

或者使用 [Docker](https://docs.n8n.io/hosting/installation/docker/):

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

访问编辑器：http://localhost:5678
