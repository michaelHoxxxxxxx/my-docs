# SoulBox 计费系统实施指南

## 概述

本文档提供SoulBox计费系统的详细实施指南，包括技术选型、代码实现、测试策略和部署方案。这是对[计费系统设计方案](soulbox_billing_system_design.md)的具体实现指导。

## 1. 技术栈选择

### 1.1 核心技术栈

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| 计量收集 | Rust + Tokio | 高性能、低延迟 |
| 多模型数据库 | SurrealDB | 时序、文档、图数据库一体化 |
| 缓存层 | Redis | 实时计数、高并发 |
| 消息队列 | Redis Streams | 轻量级、易部署 |
| 支付网关 | Stripe | 成熟、文档完善 |
| API框架 | Axum | 与现有代码一致 |
| 监控 | Prometheus + Grafana | 标准监控方案 |

### 1.2 依赖包

```toml
# Cargo.toml 新增依赖
[dependencies]
# 计费相关
rust_decimal = "1.35"
rust_decimal_macros = "1.35"
stripe-rust = "0.13"

# 时序数据
surrealdb = { version = "1.5", features = ["protocol-ws", "protocol-http", "kv-rocksdb"] }
redis = { version = "0.27", features = ["tokio-comp", "streams"] }

# 监控
prometheus = "0.13"
prometheus-hyper = "0.2"

# 调度
tokio-cron-scheduler = "0.13"
```

## 2. 计量收集实现

### 2.1 Metrics收集器

```rust
// src/billing/metrics_collector.rs
use std::sync::Arc;
use tokio::time::{interval, Duration};
use redis::aio::MultiplexedConnection;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsCollector {
    redis_conn: Arc<Mutex<MultiplexedConnection>>,
    container_runtime: Arc<ContainerRuntime>,
    collection_interval: Duration,
}

impl MetricsCollector {
    pub fn new(
        redis_conn: MultiplexedConnection,
        container_runtime: Arc<ContainerRuntime>,
    ) -> Self {
        Self {
            redis_conn: Arc::new(Mutex::new(redis_conn)),
            container_runtime,
            collection_interval: Duration::from_secs(2), // 每2秒收集一次
        }
    }

    pub async fn start_collection(&self, sandbox_id: String) -> Result<()> {
        let mut ticker = interval(self.collection_interval);
        let start_time = Utc::now();
        
        // 初始指标
        self.collect_and_store_metrics(&sandbox_id, MetricsEventType::Started).await?;
        
        loop {
            ticker.tick().await;
            
            // 检查沙箱是否还在运行
            if !self.is_sandbox_running(&sandbox_id).await? {
                // 最终指标
                self.collect_and_store_metrics(&sandbox_id, MetricsEventType::Stopped).await?;
                break;
            }
            
            // 定期指标
            self.collect_and_store_metrics(&sandbox_id, MetricsEventType::Periodic).await?;
        }
        
        Ok(())
    }

    async fn collect_and_store_metrics(
        &self,
        sandbox_id: &str,
        event_type: MetricsEventType,
    ) -> Result<()> {
        // 1. 从容器运行时获取资源使用情况
        let stats = self.container_runtime.get_container_stats(sandbox_id).await?;
        
        // 2. 构建指标事件
        let event = MetricsEvent {
            sandbox_id: sandbox_id.to_string(),
            timestamp: Utc::now(),
            event_type,
            cpu_usage_pct: stats.cpu_percent,
            memory_usage_bytes: stats.memory_usage,
            memory_limit_bytes: stats.memory_limit,
            network_rx_bytes: stats.network_rx_bytes,
            network_tx_bytes: stats.network_tx_bytes,
            disk_read_bytes: stats.disk_read_bytes,
            disk_write_bytes: stats.disk_write_bytes,
        };
        
        // 3. 存储到Redis Stream
        self.store_to_redis(&event).await?;
        
        // 4. 更新实时统计
        self.update_realtime_stats(&event).await?;
        
        Ok(())
    }

    async fn store_to_redis(&self, event: &MetricsEvent) -> Result<()> {
        let mut conn = self.redis_conn.lock().await;
        
        // 使用Redis Stream存储事件
        let stream_key = format!("metrics:stream:{}", event.sandbox_id);
        
        redis::cmd("XADD")
            .arg(&stream_key)
            .arg("*") // 自动生成ID
            .arg("timestamp").arg(event.timestamp.timestamp())
            .arg("cpu_pct").arg(event.cpu_usage_pct.to_string())
            .arg("mem_bytes").arg(event.memory_usage_bytes)
            .arg("net_rx").arg(event.network_rx_bytes)
            .arg("net_tx").arg(event.network_tx_bytes)
            .query_async(&mut *conn)
            .await?;
        
        // 设置过期时间（7天）
        redis::cmd("EXPIRE")
            .arg(&stream_key)
            .arg(7 * 24 * 3600)
            .query_async(&mut *conn)
            .await?;
        
        Ok(())
    }
}
```

### 2.2 容器统计获取

```rust
// src/billing/container_stats.rs
use bollard::container::Stats;

impl ContainerRuntime {
    pub async fn get_container_stats(&self, container_id: &str) -> Result<ContainerStats> {
        let docker = &self.docker;
        
        // 获取容器统计
        let stats_stream = docker.stats(
            container_id,
            Some(StatsOptions {
                stream: false,
                one_shot: true,
            }),
        );
        
        let stats: Stats = stats_stream
            .try_next()
            .await?
            .ok_or("No stats available")?;
        
        // 计算CPU使用率
        let cpu_delta = stats.cpu_stats.cpu_usage.total_usage 
            - stats.precpu_stats.cpu_usage.total_usage;
        let system_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0)
            - stats.precpu_stats.system_cpu_usage.unwrap_or(0);
        let cpu_percent = if system_delta > 0 && cpu_delta > 0 {
            (cpu_delta as f64 / system_delta as f64) * 100.0 * stats.cpu_stats.online_cpus.unwrap_or(1) as f64
        } else {
            0.0
        };
        
        Ok(ContainerStats {
            cpu_percent,
            memory_usage: stats.memory_stats.usage.unwrap_or(0),
            memory_limit: stats.memory_stats.limit.unwrap_or(0),
            network_rx_bytes: stats.networks
                .as_ref()
                .map(|n| n.values().map(|v| v.rx_bytes).sum())
                .unwrap_or(0),
            network_tx_bytes: stats.networks
                .as_ref()
                .map(|n| n.values().map(|v| v.tx_bytes).sum())
                .unwrap_or(0),
            disk_read_bytes: stats.blkio_stats
                .as_ref()
                .and_then(|b| b.io_service_bytes_recursive.as_ref())
                .map(|io| io.iter()
                    .filter(|s| s.op == "Read")
                    .map(|s| s.value)
                    .sum())
                .unwrap_or(0),
            disk_write_bytes: stats.blkio_stats
                .as_ref()
                .and_then(|b| b.io_service_bytes_recursive.as_ref())
                .map(|io| io.iter()
                    .filter(|s| s.op == "Write")
                    .map(|s| s.value)
                    .sum())
                .unwrap_or(0),
        })
    }
}
```

## 3. 计费计算实现

### 3.1 使用量聚合器

```rust
// src/billing/usage_aggregator.rs
use surrealdb::{Surreal, engine::remote::ws::Client};
use rust_decimal::Decimal;

pub struct UsageAggregator {
    db_pool: PgPool,
    redis_conn: Arc<Mutex<MultiplexedConnection>>,
}

impl UsageAggregator {
    pub async fn new(database_url: &str, redis_conn: MultiplexedConnection) -> Result<Self> {
        let db_pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await?;
        
        Ok(Self {
            db_pool,
            redis_conn: Arc::new(Mutex::new(redis_conn)),
        })
    }

    /// 聚合实时事件到SurrealDB时序数据
    pub async fn aggregate_usage(&self, user_id: &str, period: Period) -> Result<()> {
        // 1. 从Redis获取用户所有沙箱的指标流
        let sandbox_ids = self.get_user_sandboxes(user_id).await?;
        
        for sandbox_id in sandbox_ids {
            // 2. 读取指标流
            let metrics = self.read_metrics_stream(&sandbox_id, &period).await?;
            
            // 3. 计算使用量
            let usage = self.calculate_usage(metrics)?;
            
            // 4. 存储到SurrealDB
            self.store_usage(&sandbox_id, user_id, &usage, &period).await?;
        }
        
        Ok(())
    }

    async fn calculate_usage(&self, metrics: Vec<MetricsEvent>) -> Result<ResourceUsage> {
        let mut cpu_seconds = Decimal::ZERO;
        let mut memory_gb_seconds = Decimal::ZERO;
        let mut network_gb = Decimal::ZERO;
        
        // 按时间排序
        let mut sorted_metrics = metrics;
        sorted_metrics.sort_by_key(|m| m.timestamp);
        
        // 计算每个时间段的使用量
        for window in sorted_metrics.windows(2) {
            let start = &window[0];
            let end = &window[1];
            
            let duration_secs = (end.timestamp - start.timestamp).num_seconds() as i64;
            
            // CPU秒数 = CPU核心数 * 时间
            let cpu_cores = Decimal::from_f64_retain(start.cpu_usage_pct / 100.0)
                .unwrap_or(Decimal::ZERO);
            cpu_seconds += cpu_cores * Decimal::from(duration_secs);
            
            // 内存GB秒数
            let memory_gb = Decimal::from(start.memory_usage_bytes) / Decimal::from(1_073_741_824); // 1GB
            memory_gb_seconds += memory_gb * Decimal::from(duration_secs);
        }
        
        // 网络流量（最后一个值 - 第一个值）
        if let (Some(first), Some(last)) = (sorted_metrics.first(), sorted_metrics.last()) {
            let total_bytes = (last.network_tx_bytes - first.network_tx_bytes) as i64;
            network_gb = Decimal::from(total_bytes) / Decimal::from(1_073_741_824);
        }
        
        Ok(ResourceUsage {
            cpu_seconds,
            memory_gb_seconds,
            network_gb,
            storage_gb_hours: Decimal::ZERO, // TODO: 实现存储计算
        })
    }

    async fn store_usage(
        &self,
        sandbox_id: &str,
        user_id: &str,
        usage: &ResourceUsage,
        period: &Period,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO usage_records (
                sandbox_id, user_id, period_start, period_end,
                cpu_seconds, memory_gb_seconds, network_gb, storage_gb_hours,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (sandbox_id, period_start) DO UPDATE SET
                cpu_seconds = $5,
                memory_gb_seconds = $6,
                network_gb = $7,
                storage_gb_hours = $8,
                updated_at = NOW()
            "#,
            sandbox_id,
            user_id,
            period.start,
            period.end,
            usage.cpu_seconds,
            usage.memory_gb_seconds,
            usage.network_gb,
            usage.storage_gb_hours,
        )
        .execute(&self.db_pool)
        .await?;
        
        Ok(())
    }
}
```

### 3.2 费用计算引擎

```rust
// src/billing/cost_calculator.rs
use rust_decimal::prelude::*;
use rust_decimal_macros::dec;

pub struct CostCalculator {
    rates: BillingRates,
    discount_rules: Vec<Box<dyn DiscountRule>>,
}

impl CostCalculator {
    pub fn new() -> Self {
        Self {
            rates: BillingRates::default(),
            discount_rules: vec![
                Box::new(VolumeDiscount::new()),
                Box::new(CommitmentDiscount::new()),
                Box::new(AnnualDiscount::new()),
            ],
        }
    }

    pub async fn calculate_cost(
        &self,
        user_id: &str,
        usage: &ResourceUsage,
        subscription: &Subscription,
    ) -> Result<CostBreakdown> {
        // 1. 计算原始成本
        let cpu_cost = usage.cpu_seconds * self.rates.cpu_per_second;
        let memory_cost = usage.memory_gb_seconds * self.rates.memory_per_gb_second;
        let network_cost = usage.network_gb * self.rates.network_per_gb;
        let storage_cost = usage.storage_gb_hours * self.rates.storage_per_gb_hour;
        
        let raw_cost = cpu_cost + memory_cost + network_cost + storage_cost;
        
        // 2. 应用折扣
        let mut total_discount = dec!(0);
        let mut discount_details = Vec::new();
        
        for rule in &self.discount_rules {
            if let Some(discount) = rule.calculate_discount(user_id, &raw_cost, subscription).await? {
                total_discount += discount.amount;
                discount_details.push(discount);
            }
        }
        
        // 3. 应用订阅额度
        let credits_available = subscription.monthly_credits.min(raw_cost - total_discount);
        
        // 4. 计算最终成本
        let final_cost = raw_cost - total_discount - credits_available;
        
        Ok(CostBreakdown {
            cpu_cost,
            memory_cost,
            network_cost,
            storage_cost,
            raw_cost,
            discounts: discount_details,
            total_discount,
            credits_used: credits_available,
            final_cost: final_cost.max(dec!(0)),
        })
    }
}

impl Default for BillingRates {
    fn default() -> Self {
        Self {
            cpu_per_second: dec!(0.000012),
            memory_per_gb_second: dec!(0.000004),
            storage_per_gb_hour: dec!(0.0001),
            network_per_gb: dec!(0.02),
            gpu_per_second: Some(dec!(0.0006)),
        }
    }
}
```

## 4. 支付集成

### 4.1 Stripe集成

```rust
// src/billing/stripe_integration.rs
use stripe::{
    Client, Customer, Invoice, InvoiceItem, Subscription,
    CreateCustomer, CreateInvoice, CreateInvoiceItem, CreateSubscription,
};

pub struct StripeService {
    client: Client,
    webhook_secret: String,
}

impl StripeService {
    pub fn new(api_key: &str, webhook_secret: &str) -> Self {
        Self {
            client: Client::new(api_key),
            webhook_secret: webhook_secret.to_string(),
        }
    }

    /// 创建客户
    pub async fn create_customer(&self, user: &User) -> Result<String> {
        let customer = Customer::create(
            &self.client,
            CreateCustomer {
                email: Some(&user.email),
                name: Some(&user.name),
                metadata: Some(HashMap::from([
                    ("user_id", user.id.to_string()),
                    ("organization_id", user.organization_id.as_ref().unwrap_or(&"".to_string())),
                ])),
                ..Default::default()
            },
        ).await?;
        
        Ok(customer.id.to_string())
    }

    /// 创建订阅
    pub async fn create_subscription(
        &self,
        customer_id: &str,
        tier: SubscriptionTier,
    ) -> Result<String> {
        let price_id = match tier {
            SubscriptionTier::Developer => return Ok("free".to_string()),
            SubscriptionTier::Professional => "price_soulbox_pro_monthly",
            SubscriptionTier::Team => "price_soulbox_team_monthly",
            SubscriptionTier::Enterprise => return Err("Enterprise requires custom pricing"),
        };
        
        let subscription = Subscription::create(
            &self.client,
            CreateSubscription {
                customer: customer_id.to_string(),
                items: vec![CreateSubscriptionItem {
                    price: Some(price_id.to_string()),
                    quantity: Some(1),
                    ..Default::default()
                }],
                metadata: Some(HashMap::from([
                    ("tier", tier.to_string()),
                ])),
                ..Default::default()
            },
        ).await?;
        
        Ok(subscription.id.to_string())
    }

    /// 创建使用量发票
    pub async fn create_usage_invoice(
        &self,
        customer_id: &str,
        cost_breakdown: &CostBreakdown,
        period: &Period,
    ) -> Result<String> {
        // 1. 创建发票项目
        if cost_breakdown.final_cost > dec!(0) {
            InvoiceItem::create(
                &self.client,
                CreateInvoiceItem {
                    customer: customer_id.to_string(),
                    amount: Some(cost_breakdown.final_cost.to_i64().unwrap_or(0)),
                    currency: Currency::USD,
                    description: Some(format!(
                        "Usage charges for {} - {}",
                        period.start.format("%Y-%m-%d"),
                        period.end.format("%Y-%m-%d")
                    )),
                    metadata: Some(HashMap::from([
                        ("cpu_cost", cost_breakdown.cpu_cost.to_string()),
                        ("memory_cost", cost_breakdown.memory_cost.to_string()),
                        ("network_cost", cost_breakdown.network_cost.to_string()),
                        ("storage_cost", cost_breakdown.storage_cost.to_string()),
                        ("total_discount", cost_breakdown.total_discount.to_string()),
                        ("credits_used", cost_breakdown.credits_used.to_string()),
                    ])),
                    ..Default::default()
                },
            ).await?;
        }
        
        // 2. 创建并最终确定发票
        let invoice = Invoice::create(
            &self.client,
            CreateInvoice {
                customer: customer_id.to_string(),
                auto_advance: Some(true),
                collection_method: Some(CollectionMethod::ChargeAutomatically),
                description: Some(format!("SoulBox Invoice - {}", period.end.format("%B %Y"))),
                ..Default::default()
            },
        ).await?;
        
        Ok(invoice.id.to_string())
    }

    /// 处理Webhook
    pub async fn handle_webhook(&self, payload: &str, signature: &str) -> Result<WebhookEvent> {
        let event = Webhook::construct_event(payload, signature, &self.webhook_secret)?;
        
        match event.type_ {
            EventType::PaymentIntentSucceeded => {
                // 处理成功支付
                self.handle_payment_success(event).await?;
            }
            EventType::PaymentIntentFailed => {
                // 处理支付失败
                self.handle_payment_failure(event).await?;
            }
            EventType::CustomerSubscriptionDeleted => {
                // 处理订阅取消
                self.handle_subscription_cancelled(event).await?;
            }
            _ => {
                // 忽略其他事件
            }
        }
        
        Ok(WebhookEvent { processed: true })
    }
}
```

## 5. 数据库架构

### 5.1 SurrealDB 时序数据

```sql
-- 启用TimescaleDB扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 用户订阅表
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    tier VARCHAR(50) NOT NULL,
    monthly_credits DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 使用记录表（时序数据）
CREATE TABLE usage_records (
    time TIMESTAMPTZ NOT NULL,
    sandbox_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    cpu_seconds DECIMAL(20,6) NOT NULL DEFAULT 0,
    memory_gb_seconds DECIMAL(20,6) NOT NULL DEFAULT 0,
    network_gb DECIMAL(20,6) NOT NULL DEFAULT 0,
    storage_gb_hours DECIMAL(20,6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sandbox_id, period_start)
);

-- 转换为超表
SELECT create_hypertable('usage_records', 'time');

-- 创建索引
CREATE INDEX idx_usage_records_user_time ON usage_records (user_id, time DESC);
CREATE INDEX idx_usage_records_sandbox_time ON usage_records (sandbox_id, time DESC);

-- 设置数据保留策略（保留90天）
SELECT add_retention_policy('usage_records', INTERVAL '90 days');

-- 账单表
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subscription_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    usage_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    discounts DECIMAL(10,2) NOT NULL DEFAULT 0,
    credits_used DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 折扣规则表
CREATE TABLE discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- volume, commitment, annual
    min_amount DECIMAL(10,2),
    discount_percent DECIMAL(5,2),
    discount_amount DECIMAL(10,2),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 实时使用统计视图
CREATE MATERIALIZED VIEW daily_usage_summary AS
SELECT 
    user_id,
    DATE(time) as usage_date,
    SUM(cpu_seconds) as total_cpu_seconds,
    SUM(memory_gb_seconds) as total_memory_gb_seconds,
    SUM(network_gb) as total_network_gb,
    SUM(storage_gb_hours) as total_storage_gb_hours,
    COUNT(DISTINCT sandbox_id) as unique_sandboxes
FROM usage_records
GROUP BY user_id, DATE(time);

-- 定期刷新物化视图
SELECT add_continuous_aggregate_policy('daily_usage_summary',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

## 6. API端点实现

### 6.1 计费API路由

```rust
// src/api/billing_routes.rs
use axum::{
    extract::{Path, Query, State},
    response::Json,
    routing::{get, post},
    Router,
};

pub fn billing_routes() -> Router<AppState> {
    Router::new()
        // 使用量查询
        .route("/usage/current", get(get_current_usage))
        .route("/usage/history", get(get_usage_history))
        .route("/usage/summary/:period", get(get_usage_summary))
        
        // 账单管理
        .route("/invoices", get(list_invoices))
        .route("/invoices/:id", get(get_invoice))
        .route("/invoices/:id/download", get(download_invoice))
        
        // 订阅管理
        .route("/subscription", get(get_subscription))
        .route("/subscription", post(update_subscription))
        .route("/subscription/cancel", post(cancel_subscription))
        
        // 支付方式
        .route("/payment-methods", get(list_payment_methods))
        .route("/payment-methods", post(add_payment_method))
        .route("/payment-methods/:id", delete(remove_payment_method))
        
        // Webhook
        .route("/webhook/stripe", post(stripe_webhook))
}

async fn get_current_usage(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<CurrentUsage>> {
    let usage_service = &state.usage_service;
    
    // 获取当前计费周期
    let period = Period::current_month();
    
    // 获取使用量
    let usage = usage_service
        .get_period_usage(&user.id, &period)
        .await?;
    
    // 计算成本
    let cost = state.cost_calculator
        .calculate_cost(&user.id, &usage, &user.subscription)
        .await?;
    
    Ok(Json(CurrentUsage {
        period,
        usage,
        cost,
        remaining_credits: user.subscription.monthly_credits - cost.credits_used,
    }))
}

async fn get_usage_history(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Query(params): Query<HistoryParams>,
) -> Result<Json<Vec<UsageHistory>>> {
    let history = state.usage_service
        .get_usage_history(
            &user.id,
            params.start_date,
            params.end_date,
            params.granularity,
        )
        .await?;
    
    Ok(Json(history))
}
```

## 7. 监控和告警

### 7.1 Prometheus指标

```rust
// src/billing/metrics.rs
use prometheus::{
    register_counter_vec, register_gauge_vec, register_histogram_vec,
    CounterVec, GaugeVec, HistogramVec,
};

lazy_static! {
    // 使用量指标
    pub static ref USAGE_COUNTER: CounterVec = register_counter_vec!(
        "soulbox_usage_total",
        "Total resource usage",
        &["resource_type", "user_id"]
    ).unwrap();
    
    // 计费指标
    pub static ref BILLING_AMOUNT: HistogramVec = register_histogram_vec!(
        "soulbox_billing_amount",
        "Billing amounts",
        &["type"],
        vec![0.1, 1.0, 10.0, 100.0, 1000.0]
    ).unwrap();
    
    // 实时使用量
    pub static ref ACTIVE_SANDBOXES: GaugeVec = register_gauge_vec!(
        "soulbox_active_sandboxes",
        "Number of active sandboxes",
        &["user_id"]
    ).unwrap();
    
    // 支付成功率
    pub static ref PAYMENT_SUCCESS_RATE: GaugeVec = register_gauge_vec!(
        "soulbox_payment_success_rate",
        "Payment success rate",
        &["period"]
    ).unwrap();
}

// 使用示例
impl MetricsCollector {
    fn record_usage(&self, user_id: &str, resource: &str, amount: f64) {
        USAGE_COUNTER
            .with_label_values(&[resource, user_id])
            .inc_by(amount);
    }
}
```

### 7.2 告警规则

```yaml
# prometheus/alerts.yml
groups:
  - name: billing_alerts
    rules:
      # 使用量激增告警
      - alert: HighUsageSpike
        expr: |
          rate(soulbox_usage_total[5m]) > 10 * rate(soulbox_usage_total[1h] offset 1h)
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "用户 {{ $labels.user_id }} 使用量激增"
          description: "过去5分钟使用量是平时的10倍以上"
      
      # 支付失败率告警
      - alert: HighPaymentFailureRate
        expr: |
          soulbox_payment_success_rate < 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "支付成功率低于95%"
          description: "当前支付成功率: {{ $value }}"
      
      # 账单生成失败
      - alert: InvoiceGenerationFailed
        expr: |
          increase(soulbox_invoice_generation_errors_total[1h]) > 5
        labels:
          severity: critical
        annotations:
          summary: "账单生成失败次数过多"
          description: "过去1小时有 {{ $value }} 次账单生成失败"
```

## 8. 测试策略

### 8.1 单元测试

```rust
// src/billing/tests/cost_calculator_test.rs
#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[tokio::test]
    async fn test_basic_cost_calculation() {
        let calculator = CostCalculator::new();
        
        let usage = ResourceUsage {
            cpu_seconds: dec!(3600),      // 1 CPU hour
            memory_gb_seconds: dec!(7200), // 2 GB hours
            network_gb: dec!(10),
            storage_gb_hours: dec!(100),
        };
        
        let subscription = Subscription {
            tier: SubscriptionTier::Professional,
            monthly_credits: dec!(100),
            ..Default::default()
        };
        
        let cost = calculator.calculate_cost("user123", &usage, &subscription).await.unwrap();
        
        // CPU: 3600 * 0.000012 = 0.0432
        assert_eq!(cost.cpu_cost, dec!(0.0432));
        
        // Memory: 7200 * 0.000004 = 0.0288
        assert_eq!(cost.memory_cost, dec!(0.0288));
        
        // Network: 10 * 0.02 = 0.2
        assert_eq!(cost.network_cost, dec!(0.2));
        
        // Total before credits: 0.0432 + 0.0288 + 0.2 + 0.01 = 0.282
        let expected_raw = dec!(0.282);
        assert_eq!(cost.raw_cost, expected_raw);
    }

    #[tokio::test]
    async fn test_volume_discount() {
        let calculator = CostCalculator::new();
        
        // 大量使用应该触发批量折扣
        let usage = ResourceUsage {
            cpu_seconds: dec!(36000000),   // 10000 CPU hours
            memory_gb_seconds: dec!(72000000), // 20000 GB hours
            network_gb: dec!(1000),
            storage_gb_hours: dec!(10000),
        };
        
        let subscription = Subscription {
            tier: SubscriptionTier::Team,
            monthly_credits: dec!(300),
            ..Default::default()
        };
        
        let cost = calculator.calculate_cost("user123", &usage, &subscription).await.unwrap();
        
        // 应该有折扣
        assert!(cost.total_discount > dec!(0));
        assert!(cost.final_cost < cost.raw_cost);
    }
}
```

### 8.2 集成测试

```rust
// tests/billing_integration_test.rs
#[tokio::test]
async fn test_end_to_end_billing_flow() {
    let app = create_test_app().await;
    
    // 1. 创建用户和订阅
    let user = create_test_user(&app).await;
    let subscription = create_subscription(&app, &user, SubscriptionTier::Professional).await;
    
    // 2. 模拟沙箱使用
    let sandbox = create_sandbox(&app, &user).await;
    
    // 运行一些任务
    tokio::time::sleep(Duration::from_secs(10)).await;
    
    // 3. 收集指标
    let metrics = get_sandbox_metrics(&app, &sandbox.id).await;
    assert!(!metrics.is_empty());
    
    // 4. 触发计费
    trigger_billing(&app, &user.id).await;
    
    // 5. 验证账单
    let invoices = get_invoices(&app, &user).await;
    assert_eq!(invoices.len(), 1);
    
    let invoice = &invoices[0];
    assert!(invoice.usage_fee > Decimal::ZERO);
    assert_eq!(invoice.credits_used, subscription.monthly_credits.min(invoice.usage_fee));
}
```

## 9. 部署和运维

### 9.1 Docker Compose配置

```yaml
# docker-compose.billing.yml
services:
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: soulbox_billing
      POSTGRES_USER: billing_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - timescale_data:/var/lib/postgresql/data
      - ./sql/billing_schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U billing_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  billing_service:
    build: 
      context: .
      dockerfile: Dockerfile.billing
    environment:
      SURREALDB_HOST: surrealdb
      SURREALDB_PORT: 8000
      SURREALDB_NS: soulbox_billing
      SURREALDB_DB: main
      SURREALDB_USER: ${DB_USERNAME}
      SURREALDB_PASS: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379
      STRIPE_API_KEY: ${STRIPE_API_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
    depends_on:
      timescaledb:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3001:3001"

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    ports:
      - "9091:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana_data:/var/lib/grafana
    ports:
      - "3002:3000"

volumes:
  timescale_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

### 9.2 Kubernetes部署

```yaml
# k8s/billing-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing-service
  namespace: soulbox
spec:
  replicas: 3
  selector:
    matchLabels:
      app: billing-service
  template:
    metadata:
      labels:
        app: billing-service
    spec:
      containers:
      - name: billing
        image: soulbox/billing-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: billing-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: billing-secrets
              key: redis-url
        - name: STRIPE_API_KEY
          valueFrom:
            secretKeyRef:
              name: billing-secrets
              key: stripe-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: billing-service
  namespace: soulbox
spec:
  selector:
    app: billing-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: billing-service-hpa
  namespace: soulbox
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: billing-service
  minReplicas: 2
  maxReplicas: 10
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
```

## 10. 运维手册

### 10.1 日常运维任务

```bash
# 1. 检查计费服务健康状态
curl http://billing-service/health

# 2. 查看实时指标
curl http://billing-service/metrics

# 3. 手动触发账单生成（月初）
curl -X POST http://billing-service/admin/generate-invoices \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. 导出使用报告
curl http://billing-service/admin/usage-report?month=2025-01 \
  -o usage_report_202501.csv

# 5. 清理过期数据
psql $DATABASE_URL -c "SELECT cleanup_old_metrics();"
```

### 10.2 故障处理

1. **支付失败处理**：
   ```sql
   -- 查找失败的支付
   SELECT * FROM invoices 
   WHERE status = 'payment_failed' 
   AND created_at > NOW() - INTERVAL '7 days';
   
   -- 重试支付
   UPDATE invoices 
   SET status = 'pending_retry' 
   WHERE id = 'xxx';
   ```

2. **指标收集中断**：
   ```bash
   # 检查Redis Stream积压
   redis-cli XLEN metrics:stream:sandbox_xxx
   
   # 手动处理积压数据
   ./scripts/process_backlog.sh
   ```

3. **成本异常**：
   ```sql
   -- 查找异常高的使用量
   SELECT user_id, SUM(cpu_seconds) as total_cpu
   FROM usage_records
   WHERE time > NOW() - INTERVAL '1 day'
   GROUP BY user_id
   HAVING SUM(cpu_seconds) > 100000
   ORDER BY total_cpu DESC;
   ```

### 10.3 性能优化

1. **查询优化**：
   - 使用物化视图加速聚合查询
   - 定期VACUUM和ANALYZE表
   - 监控慢查询日志

2. **缓存策略**：
   - 用户订阅信息缓存1小时
   - 实时使用量缓存30秒
   - 历史账单缓存24小时

3. **批处理优化**：
   - 批量处理指标事件（每批1000条）
   - 异步生成账单
   - 使用任务队列处理耗时操作

## 总结

本实施指南提供了SoulBox计费系统的完整实现方案，包括：

1. ✅ 详细的代码实现
2. ✅ 数据库设计和优化
3. ✅ 支付系统集成
4. ✅ 监控和告警配置
5. ✅ 测试策略
6. ✅ 部署方案
7. ✅ 运维手册

下一步建议按照以下顺序实施：
1. 先实现基础的指标收集
2. 搭建数据存储层
3. 实现费用计算逻辑
4. 集成支付系统
5. 添加监控和告警
6. 进行全面测试
7. 逐步上线

---

*文档版本：1.0*  
*最后更新：2025-01-07*  
*作者：SoulBox Team & Claude Assistant*