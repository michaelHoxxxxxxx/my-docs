# E2B计费系统分析报告

## 概述

本文档详细分析了E2B（Environment to Build）的计费模式和实现架构，为SoulBox项目的计费系统设计提供参考。

## E2B收费模式

### 订阅层级

#### 1. Hobby（免费版）
- **价格**：免费
- **包含内容**：
  - 一次性$100使用额度
  - 社区支持
  - 沙箱会话最长1小时
  - 最多20个并发沙箱
  - 默认配置：2 vCPU, 512MB RAM, 1GB存储
  - 10GB免费存储空间
- **特点**：无需信用卡

#### 2. Pro（专业版）
- **价格**：$150/月 + 使用费
- **包含内容**：
  - 一次性$100使用额度
  - 专属Slack支持
  - 沙箱会话最长24小时
  - 最多100个并发沙箱
  - 默认配置：4 vCPU, 4GB RAM, 5GB存储
  - 20GB免费存储空间
  - 可自定义CPU和内存配置
  - 优先获得新功能
- **支付方式**：通过Stripe

#### 3. Enterprise（企业版）
- **价格**：定制价格
- **包含内容**：定制解决方案
- **联系方式**：需要联系销售团队

### 使用费计算（按秒计费）

#### 基础费率
- **CPU**: $0.000014/vCPU/秒
- **内存**: $0.0000045/GB/秒

#### 计费示例

1. **轻量级沙箱（2 vCPU + 512MB RAM）运行1小时**：
   ```
   CPU费用：2 × $0.000014 × 3600秒 = $0.1008
   内存费用：0.5 × $0.0000045 × 3600秒 = $0.0081
   总计：约$0.11/小时
   ```

2. **标准沙箱（4 vCPU + 4GB RAM）运行1小时**：
   ```
   CPU费用：4 × $0.000014 × 3600秒 = $0.2016
   内存费用：4 × $0.0000045 × 3600秒 = $0.0648
   总计：约$0.27/小时
   ```

### 计费特点
1. **透明定价**：按秒计费，用多少付多少
2. **初始额度**：所有用户都获得$100初始额度
3. **灵活配置**：Pro用户可以自定义沙箱规格
4. **无隐藏费用**：存储有免费额度，超出部分另计

## 技术架构分析

### 1. 架构概览

E2B的计费系统采用了**前后端分离**的架构设计：

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│   客户端    │────▶│  E2B API     │────▶│ 计费后端    │────▶│ Stripe   │
│   (SDK)     │     │  Gateway     │     │  Service    │     │ 支付系统 │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
       │                    │                     │
       │                    │                     ▼
       │                    │              ┌──────────────┐
       │                    ▼              │ 时序数据库   │
       │             ┌──────────────┐      │ (使用记录)  │
       └────────────▶│ Sandbox      │      └──────────────┘
                     │ Runtime      │
                     └──────────────┘
```

### 2. 核心组件

#### 2.1 资源计量系统（Metering System）

```rust
// 资源使用事件结构
#[derive(Debug, Serialize, Deserialize)]
struct UsageEvent {
    sandbox_id: String,
    user_id: String,
    timestamp: SystemTime,
    event_type: UsageEventType,
    resources: ResourceSnapshot,
}

#[derive(Debug, Serialize, Deserialize)]
struct ResourceSnapshot {
    vcpu_count: f64,
    memory_gb: f64,
    storage_gb: f64,
}

#[derive(Debug, Serialize, Deserialize)]
enum UsageEventType {
    SandboxStarted,
    SandboxStopped,
    ResourcesUpdated,
}
```

#### 2.2 实时计量收集器

```rust
struct UsageCollector {
    event_queue: Arc<Mutex<VecDeque<UsageEvent>>>,
    ticker: tokio::time::Interval,
}

impl UsageCollector {
    async fn start_collection(&self, sandbox_id: String) {
        let mut ticker = tokio::time::interval(Duration::from_secs(1));
        
        loop {
            ticker.tick().await;
            
            // 每秒获取当前资源使用
            let resources = self.get_current_resources(&sandbox_id).await;
            
            let event = UsageEvent {
                sandbox_id: sandbox_id.clone(),
                user_id: self.get_user_id(&sandbox_id),
                timestamp: SystemTime::now(),
                event_type: UsageEventType::ResourcesUpdated,
                resources,
            };
            
            // 发送到事件队列
            self.event_queue.lock().await.push_back(event);
        }
    }
}
```

#### 2.3 计费引擎（Billing Engine）

```rust
struct BillingEngine {
    cpu_rate_per_second: Decimal,     // $0.000014/vCPU/s
    memory_rate_per_second: Decimal,  // $0.0000045/GB/s
}

impl BillingEngine {
    fn calculate_cost(&self, events: Vec<UsageEvent>) -> BillingResult {
        let mut total_cost = Decimal::zero();
        let mut usage_details = Vec::new();
        
        // 按时间排序事件
        let sorted_events = self.sort_events_by_time(events);
        
        // 计算每个时间段的费用
        for window in sorted_events.windows(2) {
            let start_event = &window[0];
            let end_event = &window[1];
            
            let duration_secs = end_event.timestamp
                .duration_since(start_event.timestamp)
                .unwrap()
                .as_secs();
            
            // CPU费用
            let cpu_cost = self.cpu_rate_per_second 
                * Decimal::from(start_event.resources.vcpu_count)
                * Decimal::from(duration_secs);
            
            // 内存费用
            let memory_cost = self.memory_rate_per_second
                * Decimal::from(start_event.resources.memory_gb)
                * Decimal::from(duration_secs);
            
            let period_cost = cpu_cost + memory_cost;
            total_cost += period_cost;
            
            usage_details.push(UsageDetail {
                start_time: start_event.timestamp,
                end_time: end_event.timestamp,
                vcpu_seconds: start_event.resources.vcpu_count * duration_secs as f64,
                memory_gb_seconds: start_event.resources.memory_gb * duration_secs as f64,
                cost: period_cost,
            });
        }
        
        BillingResult {
            total_cost,
            usage_details,
            billing_period: self.get_billing_period(),
        }
    }
}
```

#### 2.4 数据持久化与聚合

```rust
// 使用时序数据库存储使用数据
struct UsageDataStore {
    // 可以使用 InfluxDB, TimescaleDB 等时序数据库
    db_client: TimeSeriesDbClient,
}

impl UsageDataStore {
    async fn store_usage_event(&self, event: UsageEvent) -> Result<()> {
        // 写入时序数据库
        self.db_client
            .write_point(
                "sandbox_usage",
                event.timestamp,
                vec![
                    ("sandbox_id", event.sandbox_id),
                    ("user_id", event.user_id),
                ],
                vec![
                    ("vcpu", event.resources.vcpu_count),
                    ("memory_gb", event.resources.memory_gb),
                ],
            )
            .await?;
        Ok(())
    }
    
    // 聚合查询
    async fn get_usage_summary(&self, user_id: &str, period: Period) -> UsageSummary {
        let query = format!(
            "SELECT 
                SUM(vcpu) as total_vcpu_seconds,
                SUM(memory_gb) as total_memory_gb_seconds,
                COUNT(*) as data_points
             FROM sandbox_usage
             WHERE user_id = '{}' 
             AND time >= {} AND time <= {}",
            user_id, period.start, period.end
        );
        
        self.db_client.query(&query).await
    }
}
```

#### 2.5 支付系统集成（Stripe Integration）

```rust
struct BillingIntegration {
    stripe_client: StripeClient,
    usage_store: UsageDataStore,
    billing_engine: BillingEngine,
}

impl BillingIntegration {
    // 每月生成账单
    async fn generate_monthly_invoice(&self, user_id: &str) -> Result<Invoice> {
        // 获取当月使用数据
        let usage_events = self.usage_store
            .get_monthly_usage(user_id)
            .await?;
        
        // 计算费用
        let billing_result = self.billing_engine
            .calculate_cost(usage_events);
        
        // 创建Stripe发票项
        let invoice_item = self.stripe_client
            .create_invoice_item(CreateInvoiceItem {
                customer: user_id,
                amount: billing_result.total_cost.to_cents(),
                currency: "usd",
                description: format!(
                    "Sandbox usage: {} vCPU-seconds, {} GB-seconds",
                    billing_result.total_vcpu_seconds,
                    billing_result.total_memory_gb_seconds
                ),
            })
            .await?;
        
        // 创建发票
        let invoice = self.stripe_client
            .create_invoice(CreateInvoice {
                customer: user_id,
                auto_advance: true,
            })
            .await?;
        
        Ok(invoice)
    }
}
```

#### 2.6 实时监控与限制

```rust
struct UsageMonitor {
    limits: HashMap<String, UserLimits>,
    current_usage: Arc<Mutex<HashMap<String, CurrentUsage>>>,
}

impl UsageMonitor {
    async fn check_usage_limits(&self, user_id: &str) -> Result<()> {
        let limits = self.limits.get(user_id)
            .ok_or("User limits not found")?;
        
        let usage = self.current_usage.lock().await;
        let current = usage.get(user_id)
            .ok_or("Usage data not found")?;
        
        // 检查并发沙箱限制
        if current.active_sandboxes > limits.max_concurrent_sandboxes {
            return Err("Concurrent sandbox limit exceeded");
        }
        
        // 检查月度使用额度
        if current.monthly_cost > limits.monthly_credit_limit {
            return Err("Monthly credit limit exceeded");
        }
        
        Ok(())
    }
}
```

### 3. 开源代码中的计费相关部分

从E2B的开源代码分析，我们发现：

1. **Metrics API端点**：
   - `GET /sandboxes/metrics` - 批量获取沙箱指标
   - `GET /sandboxes/{sandboxID}/metrics` - 获取单个沙箱指标
   - 返回CPU使用率、内存使用量等数据

2. **错误处理**：
   ```typescript
   // RateLimitError - 超过API调用限制
   export class RateLimitError extends SandboxError {
     constructor(message: any) {
       super(message)
       this.name = 'RateLimitError'
     }
   }
   ```

3. **资源指标定义**：
   ```typescript
   interface Metrics {
     cpu_used_pct?: number;  // CPU使用百分比
     mem_bytes?: number;     // 内存使用字节数
   }
   ```

### 4. 关键实现要点

1. **高精度计时**：使用系统时间戳精确到秒级
2. **事件驱动架构**：每个资源变化都生成事件
3. **异步处理**：计量收集与计费计算分离
4. **数据聚合**：使用时序数据库优化查询性能
5. **实时限制**：防止超额使用
6. **幂等性**：确保重复事件不会重复计费
7. **容错机制**：事件队列确保数据不丢失

### 5. 为什么计费代码不在开源仓库中

1. **商业敏感性**：计费逻辑是商业核心，通常不开源
2. **安全考虑**：避免客户端篡改计费数据
3. **灵活性**：可以独立更新计费策略而不影响SDK
4. **合规要求**：支付相关代码需要符合PCI DSS等标准
5. **解耦设计**：SDK专注于沙箱功能，计费系统独立演进

## 对SoulBox的启示

### 1. 架构设计建议

1. **分离计费系统**：
   - SDK只负责上报资源使用指标
   - 独立的计费服务处理费用计算
   - 使用成熟的支付服务（如Stripe）处理实际收费

2. **数据流设计**：
   ```
   SoulBox SDK → Metrics API → 计费服务 → Stripe/支付系统
        ↓                          ↓
   沙箱运行时                  时序数据库
   ```

3. **技术选型建议**：
   - **时序数据库**：InfluxDB 或 TimescaleDB
   - **消息队列**：Redis Streams 或 Kafka
   - **支付集成**：Stripe 或 Paddle
   - **监控系统**：Prometheus + Grafana

### 2. 实现优先级

1. **第一阶段**：基础计量
   - 实现资源使用数据收集
   - 建立Metrics API
   - 存储使用数据

2. **第二阶段**：计费计算
   - 实现费用计算引擎
   - 集成时序数据库
   - 生成使用报告

3. **第三阶段**：支付集成
   - 集成Stripe API
   - 实现订阅管理
   - 自动生成发票

### 3. 最佳实践

1. **数据准确性**：
   - 使用原子操作记录事件
   - 实现数据校验机制
   - 保留原始事件日志

2. **性能优化**：
   - 批量处理计费事件
   - 使用缓存减少数据库查询
   - 异步处理非关键路径

3. **用户体验**：
   - 提供实时使用监控
   - 发送使用预警通知
   - 透明的计费明细

4. **安全性**：
   - 所有计费计算在服务端
   - 使用HTTPS传输敏感数据
   - 实施访问控制和审计日志

## 总结

E2B的计费系统展示了一个成熟的按使用量计费（Usage-Based Billing）实现。通过分离计费逻辑与核心功能，E2B实现了既灵活又安全的计费架构。SoulBox在实现类似功能时，可以参考这种设计模式，但需要根据自身的业务需求进行适当调整。

关键要点：
- 计费系统应该作为独立服务运行
- 使用事件驱动架构收集使用数据
- 利用时序数据库优化存储和查询
- 集成成熟的支付服务简化实现
- 保持计费透明，提供详细的使用报告

---

*文档生成时间：2025-08-07*
*作者：Claude Assistant for SoulBox Project*