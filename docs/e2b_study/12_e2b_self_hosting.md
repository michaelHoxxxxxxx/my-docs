# E2B 自托管部署指南

本文档详细介绍如何在自己的基础设施上部署 E2B 平台，包括不同云平台的部署方案、配置优化和运维管理。

## 📋 目录

- [自托管概述](#自托管概述)
- [GCP 部署指南](#gcp-部署指南)
- [AWS 部署指南](#aws-部署指南)
- [Azure 部署指南](#azure-部署指南)
- [本地部署指南](#本地部署指南)
- [高可用配置](#高可用配置)
- [监控和运维](#监控和运维)
- [安全配置](#安全配置)
- [性能调优](#性能调优)

## 自托管概述

### 为什么选择自托管

1. **数据安全**: 完全控制数据存储和处理
2. **合规要求**: 满足特定行业的合规需求
3. **成本控制**: 长期使用可能更经济
4. **定制化**: 可以根据需求定制配置
5. **网络隔离**: 在私有网络中运行

### 架构组件

E2B 自托管版本包含以下核心组件：

```mermaid
graph TB
    A[Load Balancer] --> B[API Gateway]
    B --> C[E2B API Server]
    C --> D[Sandbox Manager]
    D --> E[Container Orchestrator]
    E --> F[Firecracker VMs]
    
    C --> G[Database]
    C --> H[Redis Cache]
    C --> I[File Storage]
    
    J[Monitoring] --> C
    J --> D
    J --> E
```

### 系统要求

#### 最小配置
- **CPU**: 4 cores
- **内存**: 8GB RAM
- **存储**: 100GB SSD
- **网络**: 1Gbps

#### 推荐配置（生产环境）
- **CPU**: 16+ cores
- **内存**: 32GB+ RAM
- **存储**: 500GB+ SSD
- **网络**: 10Gbps

## GCP 部署指南

### 环境准备

```bash
# 1. 安装必要工具
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz
tar -xf google-cloud-cli-linux-x86_64.tar.gz
./google-cloud-sdk/install.sh

# 安装 Terraform
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# 2. 认证
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Terraform 配置

```hcl
# main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0"
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# 变量定义
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP Zone"
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "GKE Cluster Name"
  type        = string
  default     = "e2b-cluster"
}

# VPC 网络
resource "google_compute_network" "e2b_network" {
  name                    = "e2b-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "e2b_subnet" {
  name          = "e2b-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.e2b_network.name

  secondary_ip_range {
    range_name    = "services-range"
    ip_cidr_range = "192.168.1.0/24"
  }

  secondary_ip_range {
    range_name    = "pod-ranges"
    ip_cidr_range = "192.168.64.0/22"
  }
}

# GKE 集群
resource "google_container_cluster" "e2b_cluster" {
  name     = var.cluster_name
  location = var.zone

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.e2b_network.name
  subnetwork = google_compute_subnetwork.e2b_subnet.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pod-ranges"
    services_secondary_range_name = "services-range"
  }

  # 启用网络策略
  network_policy {
    enabled = true
  }

  # 启用 Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # 私有集群配置
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All"
    }
  }
}

# 节点池
resource "google_container_node_pool" "e2b_nodes" {
  name       = "e2b-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.e2b_cluster.name
  node_count = 3

  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    service_account = google_service_account.e2b_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # 标签
    labels = {
      app = "e2b"
    }

    # 启用嵌套虚拟化（用于 Firecracker）
    metadata = {
      "nested-virtualization-enabled" = "true"
    }
  }

  # 自动缩放
  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  # 节点管理
  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# 服务账号
resource "google_service_account" "e2b_sa" {
  account_id   = "e2b-service-account"
  display_name = "E2B Service Account"
}

# Cloud SQL 实例
resource "google_sql_database_instance" "e2b_db" {
  name             = "e2b-database"
  database_version = "POSTGRES_14"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.e2b_network.id
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# 私有服务连接
resource "google_compute_global_address" "private_ip_address" {
  name          = "private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.e2b_network.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.e2b_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Redis 实例
resource "google_redis_instance" "e2b_cache" {
  name           = "e2b-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = var.region

  authorized_network = google_compute_network.e2b_network.id
}

# 文件存储
resource "google_storage_bucket" "e2b_storage" {
  name          = "${var.project_id}-e2b-storage"
  location      = var.region
  force_destroy = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# 输出
output "cluster_endpoint" {
  value = google_container_cluster.e2b_cluster.endpoint
}

output "cluster_ca_certificate" {
  value = google_container_cluster.e2b_cluster.master_auth.0.cluster_ca_certificate
}

output "database_connection" {
  value = google_sql_database_instance.e2b_db.connection_name
}
```

### Kubernetes 部署配置

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: e2b-system
  labels:
    name: e2b-system

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: e2b-config
  namespace: e2b-system
data:
  database_url: "postgresql://username:password@database-host:5432/e2b"
  redis_url: "redis://cache-host:6379"
  storage_bucket: "project-e2b-storage"
  firecracker_path: "/usr/local/bin/firecracker"
  log_level: "info"
  max_sandboxes: "100"
  sandbox_timeout: "300"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: e2b-secrets
  namespace: e2b-system
type: Opaque
data:
  database_password: <base64-encoded-password>
  api_key_secret: <base64-encoded-secret>
  jwt_secret: <base64-encoded-jwt-secret>

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e2b-api
  namespace: e2b-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: e2b-api
  template:
    metadata:
      labels:
        app: e2b-api
    spec:
      serviceAccountName: e2b-service-account
      containers:
      - name: e2b-api
        image: e2b/api:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: e2b-config
              key: database_url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: e2b-config
              key: redis_url
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: e2b-secrets
              key: database_password
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
          requests:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/sandbox-manager.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: e2b-sandbox-manager
  namespace: e2b-system
spec:
  selector:
    matchLabels:
      app: e2b-sandbox-manager
  template:
    metadata:
      labels:
        app: e2b-sandbox-manager
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: sandbox-manager
        image: e2b/sandbox-manager:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /dev
        - name: sys
          mountPath: /sys
        - name: proc
          mountPath: /proc
        - name: firecracker-bin
          mountPath: /usr/local/bin/firecracker
        env:
        - name: MAX_SANDBOXES
          valueFrom:
            configMapKeyRef:
              name: e2b-config
              key: max_sandboxes
        - name: SANDBOX_TIMEOUT
          valueFrom:
            configMapKeyRef:
              name: e2b-config
              key: sandbox_timeout
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: dev
        hostPath:
          path: /dev
      - name: sys
        hostPath:
          path: /sys
      - name: proc
        hostPath:
          path: /proc
      - name: firecracker-bin
        hostPath:
          path: /usr/local/bin/firecracker

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: e2b-api-service
  namespace: e2b-system
spec:
  selector:
    app: e2b-api
  ports:
  - name: http
    port: 80
    targetPort: 8080
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: e2b-ingress
  namespace: e2b-system
  annotations:
    kubernetes.io/ingress.class: "gce"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.your-domain.com
    secretName: e2b-tls
  rules:
  - host: api.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: e2b-api-service
            port:
              number: 80
```

### 部署脚本

```bash
#!/bin/bash
# deploy-gcp.sh

set -e

PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"us-central1"}
ZONE=${3:-"us-central1-a"}

echo "部署 E2B 到 GCP..."
echo "项目: $PROJECT_ID"
echo "区域: $REGION"
echo "可用区: $ZONE"

# 1. 部署基础设施
echo "1. 部署基础设施..."
terraform init
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE"
terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE" -auto-approve

# 2. 配置 kubectl
echo "2. 配置 kubectl..."
gcloud container clusters get-credentials e2b-cluster --zone=$ZONE --project=$PROJECT_ID

# 3. 安装 cert-manager
echo "3. 安装 cert-manager..."
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.8.0/cert-manager.yaml

# 等待 cert-manager 就绪
echo "等待 cert-manager 就绪..."
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s

# 4. 创建 ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@your-domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: gce
EOF

# 5. 部署 E2B
echo "5. 部署 E2B..."
kubectl apply -f k8s/

# 6. 等待部署完成
echo "6. 等待部署完成..."
kubectl wait --for=condition=available --timeout=300s deployment/e2b-api -n e2b-system

# 7. 获取访问信息
echo "7. 部署完成！"
echo "API 端点: https://$(kubectl get ingress e2b-ingress -n e2b-system -o jsonpath='{.spec.rules[0].host}')"

# 8. 运行健康检查
echo "8. 运行健康检查..."
kubectl get pods -n e2b-system
kubectl get services -n e2b-system
kubectl get ingress -n e2b-system

echo "部署完成！"
```

## AWS 部署指南

### EKS 部署配置

```hcl
# aws/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "e2b-cluster"
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "e2b-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Terraform   = "true"
    Environment = "production"
    Application = "e2b"
  }
}

# EKS 集群
module "eks" {
  source = "terraform-aws-modules/eks/aws"

  cluster_name    = var.cluster_name
  cluster_version = "1.27"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  # EKS 节点组
  eks_managed_node_groups = {
    main = {
      name = "e2b-nodes"

      instance_types = ["m5.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 1
      max_size     = 10
      desired_size = 3

      # 启用 IMDSv2
      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 2
      }

      # 磁盘配置
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            encrypted            = true
            delete_on_termination = true
          }
        }
      }

      tags = {
        Application = "e2b"
      }
    }
  }

  # IRSA for service accounts
  enable_irsa = true

  tags = {
    Environment = "production"
    Application = "e2b"
  }
}

# RDS 数据库
resource "aws_db_subnet_group" "e2b_db_subnet" {
  name       = "e2b-db-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "E2B DB subnet group"
  }
}

resource "aws_security_group" "e2b_db_sg" {
  name_prefix = "e2b-db-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "e2b_db" {
  identifier = "e2b-database"

  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "e2b"
  username = "e2b_admin"
  password = "your-secure-password"  # 使用 AWS Secrets Manager

  vpc_security_group_ids = [aws_security_group.e2b_db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.e2b_db_subnet.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true

  tags = {
    Name = "E2B Database"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "e2b_cache_subnet" {
  name       = "e2b-cache-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "e2b_cache_sg" {
  name_prefix = "e2b-cache-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_replication_group" "e2b_cache" {
  replication_group_id       = "e2b-cache"
  description                = "E2B Redis Cache"
  
  node_type                  = "cache.t3.micro"
  parameter_group_name       = "default.redis7"
  port                       = 6379
  
  num_cache_clusters         = 2
  
  subnet_group_name          = aws_elasticache_subnet_group.e2b_cache_subnet.name
  security_group_ids         = [aws_security_group.e2b_cache_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

# S3 存储
resource "aws_s3_bucket" "e2b_storage" {
  bucket = "e2b-storage-${random_string.bucket_suffix.result}"
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_versioning" "e2b_storage_versioning" {
  bucket = aws_s3_bucket.e2b_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "e2b_storage_encryption" {
  bucket = aws_s3_bucket.e2b_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 输出
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "database_endpoint" {
  value = aws_db_instance.e2b_db.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.e2b_cache.primary_endpoint_address
}

output "s3_bucket" {
  value = aws_s3_bucket.e2b_storage.bucket
}
```

### AWS 部署脚本

```bash
#!/bin/bash
# deploy-aws.sh

set -e

REGION=${1:-"us-east-1"}
CLUSTER_NAME=${2:-"e2b-cluster"}

echo "部署 E2B 到 AWS..."
echo "区域: $REGION"
echo "集群: $CLUSTER_NAME"

# 1. 检查 AWS CLI 配置
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "错误: AWS CLI 未配置，请运行 'aws configure'"
    exit 1
fi

# 2. 部署基础设施
echo "1. 部署基础设施..."
cd aws/
terraform init
terraform plan -var="region=$REGION" -var="cluster_name=$CLUSTER_NAME"
terraform apply -var="region=$REGION" -var="cluster_name=$CLUSTER_NAME" -auto-approve

# 3. 配置 kubectl
echo "2. 配置 kubectl..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

# 4. 安装 AWS Load Balancer Controller
echo "3. 安装 AWS Load Balancer Controller..."
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.5.4/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# 5. 部署 E2B
echo "4. 部署 E2B..."
kubectl apply -f ../k8s/

# 6. 等待部署完成
echo "5. 等待部署完成..."
kubectl wait --for=condition=available --timeout=300s deployment/e2b-api -n e2b-system

echo "AWS 部署完成！"
```

## Azure 部署指南

### AKS 部署配置

```hcl
# azure/main.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "e2b-rg"
}

variable "location" {
  description = "Azure location"
  type        = string
  default     = "East US"
}

variable "cluster_name" {
  description = "AKS cluster name"
  type        = string
  default     = "e2b-aks"
}

# 资源组
resource "azurerm_resource_group" "e2b_rg" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = "production"
    Application = "e2b"
  }
}

# 虚拟网络
resource "azurerm_virtual_network" "e2b_vnet" {
  name                = "e2b-network"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.e2b_rg.location
  resource_group_name = azurerm_resource_group.e2b_rg.name
}

resource "azurerm_subnet" "e2b_subnet" {
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.e2b_rg.name
  virtual_network_name = azurerm_virtual_network.e2b_vnet.name
  address_prefixes     = ["10.0.2.0/24"]
}

# AKS 集群
resource "azurerm_kubernetes_cluster" "e2b_aks" {
  name                = var.cluster_name
  location            = azurerm_resource_group.e2b_rg.location
  resource_group_name = azurerm_resource_group.e2b_rg.name
  dns_prefix          = "e2b-k8s"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"
    vnet_subnet_id = azurerm_subnet.e2b_subnet.id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }

  tags = {
    Environment = "production"
    Application = "e2b"
  }
}

# PostgreSQL 数据库
resource "azurerm_postgresql_flexible_server" "e2b_db" {
  name                   = "e2b-psql-server"
  resource_group_name    = azurerm_resource_group.e2b_rg.name
  location              = azurerm_resource_group.e2b_rg.location
  version               = "14"
  administrator_login    = "e2badmin"
  administrator_password = "H@Sh1CoR3!"
  
  storage_mb = 32768
  sku_name   = "B_Standard_B1ms"
}

resource "azurerm_postgresql_flexible_server_database" "e2b_database" {
  name      = "e2b"
  server_id = azurerm_postgresql_flexible_server.e2b_db.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Redis Cache
resource "azurerm_redis_cache" "e2b_cache" {
  name                = "e2b-cache"
  location            = azurerm_resource_group.e2b_rg.location
  resource_group_name = azurerm_resource_group.e2b_rg.name
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}

# 存储账户
resource "azurerm_storage_account" "e2b_storage" {
  name                     = "e2bstorage${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.e2b_rg.name
  location                 = azurerm_resource_group.e2b_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "random_string" "storage_suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_storage_container" "e2b_container" {
  name                  = "e2b-files"
  storage_account_name  = azurerm_storage_account.e2b_storage.name
  container_access_type = "private"
}

# 输出
output "kube_config" {
  value = azurerm_kubernetes_cluster.e2b_aks.kube_config_raw
  sensitive = true
}

output "client_certificate" {
  value = azurerm_kubernetes_cluster.e2b_aks.kube_config.0.client_certificate
  sensitive = true
}

output "cluster_endpoint" {
  value = azurerm_kubernetes_cluster.e2b_aks.kube_config.0.host
}
```

## 本地部署指南

### Docker Compose 方式

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: e2b
      POSTGRES_USER: e2b_user
      POSTGRES_PASSWORD: e2b_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U e2b_user -d e2b"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # E2B API 服务
  e2b-api:
    image: e2b/api:latest
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://e2b_user:e2b_password@postgres:5432/e2b
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-jwt-secret-here
      API_KEY_SECRET: your-api-key-secret-here
      LOG_LEVEL: info
      MAX_SANDBOXES: 10
      SANDBOX_TIMEOUT: 300
    ports:
      - "8080:8080"
    volumes:
      - ./config:/app/config
      - e2b_storage:/app/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # E2B 沙箱管理器
  e2b-sandbox-manager:
    image: e2b/sandbox-manager:latest
    depends_on:
      - e2b-api
    privileged: true
    volumes:
      - /dev:/dev
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - e2b_sandbox_data:/var/lib/e2b
    environment:
      API_URL: http://e2b-api:8080
      MAX_SANDBOXES: 10
      SANDBOX_TIMEOUT: 300
      LOG_LEVEL: info
    network_mode: host

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    depends_on:
      - e2b-api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped

  # Prometheus 监控
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  # Grafana 仪表板
  grafana:
    image: grafana/grafana
    depends_on:
      - prometheus
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

volumes:
  postgres_data:
  redis_data:
  e2b_storage:
  e2b_sandbox_data:
  prometheus_data:
  grafana_data:
```

### 本地部署脚本

```bash
#!/bin/bash
# deploy-local.sh

set -e

echo "部署 E2B 本地环境..."

# 检查依赖
check_dependencies() {
    echo "检查系统依赖..."
    
    if ! command -v docker &> /dev/null; then
        echo "错误: Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "错误: Docker Compose 未安装"
        exit 1
    fi
    
    # 检查是否支持嵌套虚拟化
    if [[ -f /proc/cpuinfo ]]; then
        if ! grep -q "vmx\|svm" /proc/cpuinfo; then
            echo "警告: 处理器不支持硬件虚拟化，Firecracker 可能无法工作"
        fi
    fi
    
    echo "依赖检查完成"
}

# 初始化配置
init_config() {
    echo "初始化配置文件..."
    
    # 创建目录
    mkdir -p config ssl grafana/provisioning/dashboards grafana/provisioning/datasources
    
    # 生成 SSL 证书（自签名）
    if [[ ! -f ssl/server.crt ]]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/server.key \
            -out ssl/server.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    fi
    
    # 创建 Nginx 配置
    cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream e2b_api {
        server e2b-api:8080;
    }
    
    server {
        listen 80;
        server_name localhost;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl;
        server_name localhost;
        
        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        
        location / {
            proxy_pass http://e2b_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /ws {
            proxy_pass http://e2b_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF
    
    # 创建 Prometheus 配置
    cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'e2b-api'
    static_configs:
      - targets: ['e2b-api:8080']
    metrics_path: /metrics
    
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

    # 创建 Grafana 数据源配置
    cat > grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
EOF

    # 创建数据库初始化脚本
    cat > init.sql << 'EOF'
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sandboxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'creating',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试用户
INSERT INTO users (email, api_key) 
VALUES ('admin@example.com', 'test-api-key-12345')
ON CONFLICT (email) DO NOTHING;
EOF

    echo "配置文件初始化完成"
}

# 启动服务
start_services() {
    echo "启动 E2B 服务..."
    
    # 构建镜像（如果需要）
    if [[ -d "./docker" ]]; then
        echo "构建自定义镜像..."
        docker-compose build
    fi
    
    # 启动服务
    docker-compose up -d
    
    echo "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    docker-compose ps
    
    # 等待 API 服务就绪
    echo "等待 API 服务就绪..."
    timeout=60
    while ! curl -s http://localhost:8080/health > /dev/null; do
        sleep 5
        timeout=$((timeout - 5))
        if [[ $timeout -le 0 ]]; then
            echo "错误: API 服务启动超时"
            docker-compose logs e2b-api
            exit 1
        fi
    done
    
    echo "服务启动完成！"
}

# 运行健康检查
health_check() {
    echo "运行健康检查..."
    
    # API 健康检查
    if curl -s http://localhost:8080/health | grep -q "ok"; then
        echo "✓ API 服务正常"
    else
        echo "✗ API 服务异常"
    fi
    
    # 数据库连接检查
    if docker-compose exec -T postgres pg_isready -U e2b_user -d e2b; then
        echo "✓ 数据库连接正常"
    else
        echo "✗ 数据库连接异常"
    fi
    
    # Redis 连接检查
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        echo "✓ Redis 连接正常"
    else
        echo "✗ Redis 连接异常"
    fi
    
    echo "健康检查完成"
}

# 显示访问信息
show_info() {
    echo ""
    echo "E2B 本地部署完成！"
    echo "=========================="
    echo "API 端点: https://localhost/"
    echo "Grafana 监控: http://localhost:3000 (admin/admin)"
    echo "Prometheus: http://localhost:9090"
    echo ""
    echo "测试 API Key: test-api-key-12345"
    echo ""
    echo "管理命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
    echo "=========================="
}

# 主函数
main() {
    check_dependencies
    init_config
    start_services
    health_check
    show_info
}

# 处理中断信号
trap 'echo "部署被中断"; docker-compose down; exit 1' INT TERM

# 运行主函数
main "$@"
```

## 高可用配置

### 负载均衡配置

```yaml
# ha/load-balancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: e2b-api-lb
  namespace: e2b-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  selector:
    app: e2b-api
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8080

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: e2b-network-policy
  namespace: e2b-system
spec:
  podSelector:
    matchLabels:
      app: e2b-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### 自动扩缩配置

```yaml
# ha/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: e2b-api-hpa
  namespace: e2b-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: e2b-api
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
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      selectPolicy: Max

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: e2b-sandbox-manager-hpa
  namespace: e2b-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: DaemonSet
    name: e2b-sandbox-manager
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

### 集群自动扩缩

```yaml
# ha/cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
spec:
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        resources:
          limits:
            cpu: 100m
            memory: 300Mi
          requests:
            cpu: 100m
            memory: 300Mi
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/e2b-cluster
        env:
        - name: AWS_REGION
          value: us-east-1
```

## 监控和运维

### Prometheus 监控配置

```yaml
# monitoring/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    rule_files:
      - "e2b_alerts.yml"

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

    scrape_configs:
      - job_name: 'kubernetes-apiservers'
        kubernetes_sd_configs:
        - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
          action: keep
          regex: default;kubernetes;https

      - job_name: 'e2b-api'
        kubernetes_sd_configs:
        - role: endpoints
          namespaces:
            names:
            - e2b-system
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_name]
          action: keep
          regex: e2b-api-service
        - source_labels: [__meta_kubernetes_endpoint_port_name]
          action: keep
          regex: http

      - job_name: 'e2b-sandbox-manager'
        kubernetes_sd_configs:
        - role: pod
          namespaces:
            names:
            - e2b-system
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_label_app]
          action: keep
          regex: e2b-sandbox-manager

  e2b_alerts.yml: |
    groups:
    - name: e2b_alerts
      rules:
      - alert: E2BAPIDown
        expr: up{job="e2b-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "E2B API is down"
          description: "E2B API has been down for more than 1 minute"

      - alert: E2BHighCPUUsage
        expr: rate(container_cpu_usage_seconds_total{container="e2b-api"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "E2B API high CPU usage"
          description: "E2B API CPU usage is above 80% for 5 minutes"

      - alert: E2BHighMemoryUsage
        expr: container_memory_usage_bytes{container="e2b-api"} / container_spec_memory_limit_bytes{container="e2b-api"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "E2B API high memory usage"
          description: "E2B API memory usage is above 90% for 5 minutes"

      - alert: E2BSandboxQueueHigh
        expr: e2b_sandbox_queue_length > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "E2B sandbox queue is high"
          description: "E2B sandbox queue length is above 10 for 2 minutes"
```

### Grafana 仪表板

```json
{
  "dashboard": {
    "id": null,
    "title": "E2B Monitoring Dashboard",
    "tags": ["e2b"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"e2b-api\"}[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ]
      },
      {
        "id": 2,
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"e2b-api\"}[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"e2b-api\"}[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (seconds)",
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Active Sandboxes",
        "type": "singlestat",
        "targets": [
          {
            "expr": "e2b_active_sandboxes_total",
            "legendFormat": "Active Sandboxes"
          }
        ]
      },
      {
        "id": 4,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{container=\"e2b-api\"}[5m])",
            "legendFormat": "API Server"
          },
          {
            "expr": "rate(container_cpu_usage_seconds_total{container=\"e2b-sandbox-manager\"}[5m])",
            "legendFormat": "Sandbox Manager"
          }
        ],
        "yAxes": [
          {
            "label": "CPU Usage",
            "min": 0,
            "max": 1
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### 日志聚合配置

```yaml
# monitoring/fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: monitoring
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*e2b*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>

    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>

    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.monitoring.svc.cluster.local
      port 9200
      index_name e2b-logs
      type_name _doc
    </match>
```

## 安全配置

### 网络安全策略

```yaml
# security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: e2b-security-policy
  namespace: e2b-system
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

### Pod 安全策略

```yaml
# security/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: e2b-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 性能调优

### 资源配置优化

```yaml
# optimization/resource-limits.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: e2b-resource-quota
  namespace: e2b-system
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "50"
    limits.memory: 100Gi
    persistentvolumeclaims: "10"

---
apiVersion: v1
kind: LimitRange
metadata:
  name: e2b-limit-range
  namespace: e2b-system
spec:
  limits:
  - default:
      cpu: "1"
      memory: "1Gi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

### 性能调优参数

```yaml
# optimization/performance-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: e2b-performance-config
  namespace: e2b-system
data:
  # API 服务器优化
  api_workers: "4"
  api_max_connections: "1000"
  api_request_timeout: "30s"
  api_keepalive_timeout: "65s"
  
  # 沙箱管理器优化
  sandbox_pool_size: "20"
  sandbox_warm_pool_size: "5"
  sandbox_max_idle_time: "300s"
  sandbox_cleanup_interval: "60s"
  
  # 数据库优化
  db_max_connections: "100"
  db_idle_timeout: "300s"
  db_connection_lifetime: "3600s"
  
  # Redis 优化
  redis_max_connections: "100"
  redis_connection_timeout: "5s"
  redis_read_timeout: "3s"
  redis_write_timeout: "3s"
```

通过以上配置，你可以在各种环境中成功部署 E2B 自托管版本，并根据具体需求进行定制和优化。每种部署方式都有其优势和适用场景，选择最适合你组织需求的方案。