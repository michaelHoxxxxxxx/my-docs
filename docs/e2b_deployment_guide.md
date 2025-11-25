# E2B 完整部署教程 - 从零开始搭建自己的代码执行环境

> 🎯 本教程面向零基础用户，手把手教你部署 E2B 系统

---

## 📋 目录

1. [部署前准备](#一部署前准备)
2. [快速开始 - 使用 E2B 云服务](#二快速开始---使用-e2b-云服务)
3. [本地开发环境部署](#三本地开发环境部署)
4. [生产环境部署](#四生产环境部署)
5. [自托管完整部署](#五自托管完整部署)
6. [故障排查指南](#六故障排查指南)

---

## 一、部署前准备

### 1.1 系统要求

#### 最低配置（开发测试）
- **CPU**: 4 核心
- **内存**: 8GB RAM
- **存储**: 50GB SSD
- **系统**: Ubuntu 20.04+ / Debian 11+

#### 推荐配置（生产环境）
- **CPU**: 8+ 核心
- **内存**: 16GB+ RAM
- **存储**: 100GB+ SSD
- **系统**: Ubuntu 22.04 LTS

### 1.2 前置知识检查清单

```bash
# 检查你是否具备以下基础知识
- [ ] 基本的 Linux 命令行操作
- [ ] 了解 Docker 基础概念
- [ ] 会使用 Git
- [ ] 理解 API 和 HTTP 请求
```

如果不熟悉，建议先学习相关基础知识。

---

## 二、快速开始 - 使用 E2B 云服务

> 💡 **推荐新手从这里开始**：无需自己部署，直接使用官方云服务

### 2.1 注册账号

1. 访问 [https://e2b.dev](https://e2b.dev)
2. 点击 "Sign Up" 注册账号
3. 验证邮箱

### 2.2 获取 API Key

```bash
# 1. 登录后访问仪表板
# 2. 进入 Settings -> API Keys
# 3. 点击 "Create New API Key"
# 4. 复制生成的密钥（只显示一次！）
```

### 2.3 安装 SDK

#### Python 用户
```bash
# 创建项目目录
mkdir my-e2b-project
cd my-e2b-project

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装 E2B SDK
pip install e2b
```

#### Node.js 用户
```bash
# 创建项目目录
mkdir my-e2b-project
cd my-e2b-project

# 初始化项目
npm init -y

# 安装 E2B SDK
npm install e2b
```

### 2.4 配置环境变量

```bash
# Linux/Mac
echo "export E2B_API_KEY='你的API密钥'" >> ~/.bashrc
source ~/.bashrc

# Windows (PowerShell)
[Environment]::SetEnvironmentVariable("E2B_API_KEY", "你的API密钥", "User")
```

### 2.5 第一个 E2B 程序

创建文件 `hello_e2b.py`:

```python
from e2b import Sandbox

# 创建沙箱
print("正在创建沙箱...")
sandbox = Sandbox()
print(f"沙箱创建成功！ID: {sandbox.sandbox_id}")

# 执行命令
print("\n执行命令: echo 'Hello from E2B!'")
result = sandbox.commands.run("echo 'Hello from E2B!'")
print(f"输出: {result.stdout}")

# 创建文件
print("\n创建文件...")
sandbox.files.write("/tmp/hello.txt", "Hello, E2B!")
content = sandbox.files.read("/tmp/hello.txt")
print(f"文件内容: {content}")

# 清理资源
print("\n清理沙箱...")
sandbox.kill()
print("完成！")
```

运行测试：
```bash
python hello_e2b.py
```

---

## 三、本地开发环境部署

> ⚠️ **注意**：本地部署仅用于开发测试，不支持完整的隔离功能

### 3.1 安装 Docker

#### Ubuntu/Debian
```bash
# 更新包索引
sudo apt update

# 安装依赖
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加 Docker 官方 GPG 密钥
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version
```

### 3.2 克隆 E2B 开发环境

```bash
# 克隆仓库
git clone https://github.com/e2b-dev/e2b.git
cd e2b

# 切换到稳定分支
git checkout main
```

### 3.3 启动本地开发服务

```bash
# 进入开发环境目录
cd packages/local-dev

# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps
```

### 3.4 配置本地环境

创建 `.env.local` 文件：
```bash
# API 配置
E2B_API_URL=http://localhost:3000
E2B_API_KEY=local-dev-key

# 服务配置
ENVD_PORT=49982
CONTROL_PLANE_PORT=3000

# 资源限制
MAX_SANDBOX_COUNT=10
DEFAULT_SANDBOX_TIMEOUT=300
```

### 3.5 测试本地环境

```python
from e2b import Sandbox

# 使用本地环境
sandbox = Sandbox(
    api_key="local-dev-key",
    domain="localhost:3000",
    debug=True
)

# 测试命令执行
result = sandbox.commands.run("echo 'Local E2B works!'")
print(result.stdout)

sandbox.kill()
```

---

## 四、生产环境部署

### 4.1 云服务商选择

#### 推荐方案对比

| 云服务商 | 优势 | 劣势 | 适用场景 |
|---------|------|------|---------|
| **AWS EC2** | KVM 支持好、网络稳定 | 成本较高 | 企业级部署 |
| **Google Cloud** | 性能优秀、全球节点 | 配置复杂 | 大规模部署 |
| **DigitalOcean** | 简单易用、价格适中 | 功能相对简单 | 中小型项目 |
| **Hetzner** | 性价比高 | 主要在欧洲 | 预算有限 |

### 4.2 服务器初始化

以 Ubuntu 22.04 为例：

```bash
# SSH 连接到服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y \
    curl \
    wget \
    git \
    htop \
    iotop \
    net-tools \
    build-essential

# 创建部署用户
adduser e2b
usermod -aG sudo e2b
su - e2b
```

### 4.3 安装必要组件

#### 1. 安装 KVM
```bash
# 检查 CPU 虚拟化支持
egrep -c '(vmx|svm)' /proc/cpuinfo
# 输出大于 0 表示支持

# 安装 KVM
sudo apt install -y \
    qemu-kvm \
    libvirt-daemon-system \
    libvirt-clients \
    bridge-utils \
    virtinst

# 添加用户到相关组
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# 验证安装
virsh list --all
```

#### 2. 安装 Firecracker
```bash
# 下载最新版本
LATEST=$(curl -s https://api.github.com/repos/firecracker-microvm/firecracker/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
curl -L https://github.com/firecracker-microvm/firecracker/releases/download/${LATEST}/firecracker-${LATEST}-x86_64.tgz | tar -xz

# 安装二进制文件
sudo mv release-${LATEST}-x86_64/firecracker-${LATEST}-x86_64 /usr/local/bin/firecracker
sudo mv release-${LATEST}-x86_64/jailer-${LATEST}-x86_64 /usr/local/bin/jailer

# 设置权限
sudo chmod +x /usr/local/bin/firecracker
sudo chmod +x /usr/local/bin/jailer

# 验证安装
firecracker --version
```

### 4.4 部署 E2B 控制平面

```bash
# 创建部署目录
mkdir -p ~/e2b-deployment
cd ~/e2b-deployment

# 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: e2b
      POSTGRES_USER: e2b
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - e2b_network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - e2b_network

  control-plane:
    image: e2b/control-plane:latest
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://e2b:${DB_PASSWORD}@postgres:5432/e2b
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      FIRECRACKER_BIN: /usr/local/bin/firecracker
      JAILER_BIN: /usr/local/bin/jailer
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /dev/kvm:/dev/kvm
      - ./config:/app/config
    ports:
      - "3000:3000"
    networks:
      - e2b_network
    privileged: true

  envd:
    image: e2b/envd:latest
    depends_on:
      - control-plane
    environment:
      CONTROL_PLANE_URL: http://control-plane:3000
    ports:
      - "49982:49982"
    networks:
      - e2b_network

volumes:
  postgres_data:
  redis_data:

networks:
  e2b_network:
    driver: bridge
EOF
```

创建环境变量文件 `.env`:
```bash
# 生成安全的密码
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

cat > .env << EOF
DB_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
EOF

# 保护配置文件
chmod 600 .env
```

### 4.5 配置防火墙

```bash
# 安装 UFW
sudo apt install -y ufw

# 配置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Control Plane API
sudo ufw allow 49982/tcp # envd gRPC

# 启用防火墙
sudo ufw enable
```

### 4.6 启动生产服务

```bash
# 拉取镜像
docker compose pull

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 健康检查
curl http://localhost:3000/health
```

---

## 五、自托管完整部署

> 🔧 **高级用户**：完整的自托管部署，包括镜像构建和定制

### 5.1 构建系统要求

- Kubernetes 集群 (1.24+)
- Helm 3.0+
- 支持 KVM 的节点
- 存储类 (StorageClass) 支持

### 5.2 准备 Kubernetes 集群

#### 使用 k3s（轻量级）
```bash
# 安装 k3s
curl -sfL https://get.k3s.io | sh -

# 获取 kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config

# 验证集群
kubectl get nodes
```

### 5.3 安装 E2B Operator

```bash
# 添加 Helm 仓库
helm repo add e2b https://charts.e2b.dev
helm repo update

# 创建命名空间
kubectl create namespace e2b-system

# 安装 Operator
helm install e2b-operator e2b/e2b-operator \
  --namespace e2b-system \
  --set operator.image.tag=latest
```

### 5.4 配置存储

创建 `storage-config.yaml`:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: e2b-templates
  namespace: e2b-system
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: nfs-client
```

应用配置：
```bash
kubectl apply -f storage-config.yaml
```

### 5.5 部署 E2B 集群

创建 `e2b-cluster.yaml`:
```yaml
apiVersion: e2b.dev/v1
kind: E2BCluster
metadata:
  name: production
  namespace: e2b-system
spec:
  controlPlane:
    replicas: 3
    resources:
      requests:
        cpu: 2
        memory: 4Gi
      limits:
        cpu: 4
        memory: 8Gi
  
  workerNodes:
    - name: cpu-nodes
      replicas: 5
      nodeSelector:
        e2b.dev/node-type: cpu
      resources:
        requests:
          cpu: 8
          memory: 16Gi
        limits:
          cpu: 16
          memory: 32Gi
    
    - name: gpu-nodes
      replicas: 2
      nodeSelector:
        e2b.dev/node-type: gpu
      resources:
        requests:
          cpu: 8
          memory: 32Gi
          nvidia.com/gpu: 1
        limits:
          cpu: 16
          memory: 64Gi
          nvidia.com/gpu: 1
  
  storage:
    templates:
      size: 100Gi
      storageClass: fast-ssd
    
    sandboxes:
      size: 500Gi
      storageClass: fast-ssd
  
  networking:
    ingressClass: nginx
    domain: e2b.company.com
    tls:
      enabled: true
      issuer: letsencrypt-prod
  
  monitoring:
    enabled: true
    prometheus:
      retention: 30d
    grafana:
      enabled: true
```

部署集群：
```bash
kubectl apply -f e2b-cluster.yaml

# 监控部署状态
kubectl get e2bcluster -n e2b-system -w
```

### 5.6 配置监控和告警

```bash
# 获取 Grafana 密码
kubectl get secret -n e2b-system e2b-grafana -o jsonpath="{.data.admin-password}" | base64 -d

# 端口转发访问 Grafana
kubectl port-forward -n e2b-system svc/e2b-grafana 3000:80

# 访问 http://localhost:3000
# 用户名: admin
# 密码: 上面获取的密码
```

### 5.7 配置自动扩缩容

创建 `autoscaling.yaml`:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: e2b-worker-hpa
  namespace: e2b-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: e2b-worker
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

应用配置：
```bash
kubectl apply -f autoscaling.yaml
```

---

## 六、故障排查指南

### 6.1 常见问题

#### 问题 1：沙箱创建失败

**症状**：
```python
SandboxException: Failed to create sandbox: timeout
```

**解决方案**：
```bash
# 1. 检查 Firecracker 是否正常
sudo systemctl status firecracker

# 2. 检查 KVM 模块
lsmod | grep kvm

# 3. 检查日志
docker compose logs control-plane | grep ERROR

# 4. 验证资源
df -h  # 检查磁盘空间
free -h  # 检查内存
```

#### 问题 2：网络连接问题

**症状**：
```
ConnectionError: Failed to connect to envd service
```

**解决方案**：
```bash
# 1. 检查端口
netstat -tlnp | grep 49982

# 2. 测试连接
telnet localhost 49982

# 3. 检查防火墙
sudo ufw status

# 4. 重启网络服务
sudo systemctl restart docker
docker compose restart envd
```

#### 问题 3：性能问题

**症状**：
- 沙箱启动慢
- 命令执行延迟

**解决方案**：
```bash
# 1. 优化镜像缓存
docker system prune -a
docker pull e2b/base-images:latest

# 2. 调整资源限制
# 编辑 docker-compose.yml
services:
  control-plane:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

# 3. 启用镜像预热
cat > preload.sh << 'EOF'
#!/bin/bash
TEMPLATES=("python3.11" "nodejs18" "ubuntu22")
for template in "${TEMPLATES[@]}"; do
  echo "Preloading $template..."
  docker pull e2b/template:$template
done
EOF

chmod +x preload.sh
./preload.sh
```

### 6.2 日志分析

```bash
# 收集所有日志
mkdir -p ~/e2b-logs
docker compose logs > ~/e2b-logs/all.log

# 分析错误
grep -i error ~/e2b-logs/all.log | less

# 实时监控
docker compose logs -f --tail=100

# 特定服务日志
docker compose logs control-plane -f
```

### 6.3 性能监控脚本

创建 `monitor.sh`:
```bash
#!/bin/bash

echo "E2B 系统监控"
echo "============="

# 系统资源
echo -e "\n[系统资源]"
echo "CPU 使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
echo "内存使用: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "磁盘使用: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"

# Docker 容器状态
echo -e "\n[容器状态]"
docker compose ps

# 沙箱统计
echo -e "\n[沙箱统计]"
SANDBOX_COUNT=$(docker ps | grep -c "e2b-sandbox")
echo "运行中的沙箱: $SANDBOX_COUNT"

# 网络连接
echo -e "\n[网络连接]"
netstat -tn | grep -E "3000|49982" | wc -l | xargs echo "活跃连接数:"

# 最近错误
echo -e "\n[最近错误]"
docker compose logs --tail=20 | grep -i error || echo "无错误"
```

使用监控脚本：
```bash
chmod +x monitor.sh
watch -n 5 ./monitor.sh  # 每5秒刷新
```

### 6.4 备份和恢复

#### 备份脚本
```bash
#!/bin/bash
BACKUP_DIR="/backup/e2b/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 备份数据库
docker compose exec postgres pg_dump -U e2b e2b > $BACKUP_DIR/database.sql

# 备份配置
cp -r ./config $BACKUP_DIR/
cp .env $BACKUP_DIR/

# 备份 Docker 卷
docker run --rm -v e2b_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

echo "备份完成: $BACKUP_DIR"
```

#### 恢复脚本
```bash
#!/bin/bash
BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "用法: ./restore.sh <backup_directory>"
  exit 1
fi

# 停止服务
docker compose down

# 恢复配置
cp $BACKUP_DIR/.env .
cp -r $BACKUP_DIR/config ./

# 恢复数据库
docker compose up -d postgres
sleep 10
docker compose exec -T postgres psql -U e2b e2b < $BACKUP_DIR/database.sql

# 恢复 Docker 卷
docker run --rm -v e2b_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data

# 重启所有服务
docker compose up -d

echo "恢复完成"
```

---

## 七、性能优化建议

### 7.1 系统级优化

```bash
# 内核参数优化
cat >> /etc/sysctl.conf << EOF
# 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# 文件系统优化
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF

# 应用配置
sysctl -p
```

### 7.2 Docker 优化

```bash
# Docker daemon 配置
cat > /etc/docker/daemon.json << EOF
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

systemctl restart docker
```

### 7.3 监控指标

使用 Prometheus + Grafana 监控关键指标：

1. **系统指标**
   - CPU 使用率 < 80%
   - 内存使用率 < 85%
   - 磁盘 I/O < 80% 利用率

2. **应用指标**
   - 沙箱创建时间 < 2s
   - API 响应时间 < 100ms
   - 并发沙箱数量

3. **告警规则**
   - 沙箱创建失败率 > 5%
   - API 错误率 > 1%
   - 资源使用超过阈值

---

## 八、安全加固

### 8.1 基础安全配置

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装安全工具
apt install -y fail2ban ufw

# 3. 配置 SSH
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 4. 配置 fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 8.2 SSL/TLS 配置

```bash
# 安装 Certbot
snap install certbot --classic

# 获取证书
certbot certonly --standalone -d e2b.yourdomain.com

# 配置自动续期
echo "0 0 * * * root certbot renew --quiet" > /etc/cron.d/certbot
```

### 8.3 API 安全

```nginx
# Nginx 配置示例
server {
    listen 443 ssl http2;
    server_name e2b.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/e2b.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/e2b.yourdomain.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 九、总结和下一步

### 9.1 部署检查清单

- [ ] 系统满足最低要求
- [ ] 所有服务正常运行
- [ ] 网络连接正常
- [ ] 安全配置完成
- [ ] 监控系统就绪
- [ ] 备份策略实施

### 9.2 推荐学习路径

1. **入门级**：先使用云服务熟悉 E2B
2. **进阶级**：尝试本地开发环境
3. **专业级**：部署生产环境
4. **专家级**：自托管完整集群

### 9.3 获取帮助

- 官方文档：https://e2b.dev/docs
- GitHub Issues：https://github.com/e2b-dev/e2b/issues
- 社区论坛：https://community.e2b.dev
- Discord：https://discord.gg/e2b

---

🎉 恭喜！你已经掌握了 E2B 的部署方法。现在可以开始构建自己的 AI 应用了！