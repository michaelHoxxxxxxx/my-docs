# SoulBox 计费系统设计方案

## 概述

基于E2B的成功经验，本文档为SoulBox设计了一套完整的计费系统方案。该方案采用按使用量计费（Usage-Based Billing）模式，既保证了定价的公平性，又提供了灵活的订阅选项。

## 1. 订阅层级设计

### 1.1 开发者版（Developer）- 免费
- **目标用户**：个人开发者、学生、开源项目
- **价格**：永久免费
- **包含内容**：
  - 一次性$50使用额度
  - 社区支持（Discord/GitHub）
  - 沙箱会话最长30分钟
  - 最多10个并发沙箱
  - 默认配置：1 vCPU, 256MB RAM, 512MB存储
  - 5GB总存储空间
  - 基础运行时支持（Node.js, Python）
- **限制**：
  - 无SLA保证
  - 社区支持响应时间：48小时
  - 不支持自定义镜像

### 1.2 专业版（Professional）- $99/月
- **目标用户**：专业开发者、小型团队、初创公司
- **价格**：$99/月 + 使用费
- **包含内容**：
  - 每月$100使用额度
  - 优先技术支持（工作时间）
  - 沙箱会话最长12小时
  - 最多50个并发沙箱
  - 默认配置：2 vCPU, 2GB RAM, 2GB存储
  - 50GB总存储空间
  - 全部运行时支持（Node.js, Python, Bun, Deno）
  - 自定义沙箱配置
  - API优先级访问
- **SLA**：99.5%可用性保证
- **支持响应时间**：12小时

### 1.3 团队版（Team）- $299/月
- **目标用户**：中型团队、成长期公司
- **价格**：$299/月 + 使用费
- **包含内容**：
  - 每月$300使用额度
  - 专属Slack频道支持
  - 沙箱会话最长48小时
  - 最多200个并发沙箱
  - 默认配置：4 vCPU, 8GB RAM, 10GB存储
  - 200GB总存储空间
  - 团队协作功能
  - 自定义沙箱镜像
  - 私有容器注册表
  - 审计日志
  - RBAC权限管理
- **SLA**：99.9%可用性保证
- **支持响应时间**：4小时

### 1.4 企业版（Enterprise）- 定制价格
- **目标用户**：大型企业、特殊需求客户
- **价格**：联系销售团队
- **包含内容**：
  - 定制使用额度
  - 24/7专属支持团队
  - 无限制沙箱会话时长
  - 无限制并发沙箱
  - 定制硬件配置（包括GPU）
  - 无限存储空间
  - 私有云部署选项
  - 自定义SLA
  - 专属账户经理
  - 定制功能开发
  - 合规认证支持
- **部署选项**：
  - SaaS（多租户）
  - 私有云（单租户）
  - 混合云
  - 本地部署

## 2. 使用费计算

### 2.1 基础费率

| 资源类型 | 费率 | 单位 |
|---------|------|------|
| CPU | $0.000012/vCPU/秒 | 比E2B便宜约15% |
| 内存 | $0.000004/GB/秒 | 比E2B便宜约11% |
| 存储 | $0.0001/GB/小时 | 持久化存储 |
| 网络流量 | $0.02/GB | 仅出站流量 |
| GPU (可选) | $0.0006/GPU/秒 | T4 GPU |

### 2.2 计费示例

#### 示例1：轻量级开发环境（1 vCPU + 512MB RAM）
```
运行1小时成本：
- CPU: 1 × $0.000012 × 3600 = $0.0432
- 内存: 0.5 × $0.000004 × 3600 = $0.0072
- 总计: $0.0504/小时
```

#### 示例2：标准开发环境（2 vCPU + 4GB RAM）
```
运行1小时成本：
- CPU: 2 × $0.000012 × 3600 = $0.0864
- 内存: 4 × $0.000004 × 3600 = $0.0576
- 总计: $0.144/小时
```

#### 示例3：AI训练环境（4 vCPU + 16GB RAM + 1 GPU）
```
运行1小时成本：
- CPU: 4 × $0.000012 × 3600 = $0.1728
- 内存: 16 × $0.000004 × 3600 = $0.2304
- GPU: 1 × $0.0006 × 3600 = $2.16
- 总计: $2.5632/小时
```

### 2.3 成本优化策略

1. **预付费折扣**：
   - 年付享受15%折扣
   - 两年付享受25%折扣

2. **承诺使用折扣**：
   - 承诺每月$500使用：额外5%折扣
   - 承诺每月$2000使用：额外10%折扣
   - 承诺每月$5000使用：额外15%折扣

3. **批量折扣**：
   - 使用超过$1000/月：超出部分9折
   - 使用超过$5000/月：超出部分8折
   - 使用超过$10000/月：超出部分7折

## 3. 技术实现架构

### 3.1 计量系统架构

```rust
// 使用事件结构
#[derive(Debug, Serialize, Deserialize)]
pub struct UsageEvent {
    pub sandbox_id: String,
    pub user_id: String,
    pub organization_id: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub event_type: UsageEventType,
    pub resources: ResourceSnapshot,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceSnapshot {
    pub vcpu_count: f64,
    pub memory_gb: f64,
    pub storage_gb: f64,
    pub gpu_count: Option<f64>,
    pub network_bytes_out: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum UsageEventType {
    SandboxStarted,
    SandboxStopped,
    ResourcesUpdated,
    ResourcesScaled,
    StorageAllocated,
    NetworkTransfer,
}
```

### 3.2 实时计费引擎

```rust
pub struct BillingEngine {
    // 费率配置
    rates: BillingRates,
    // 折扣规则
    discount_rules: Vec<DiscountRule>,
    // 使用额度
    credits: HashMap<String, Credits>,
}

#[derive(Debug, Clone)]
pub struct BillingRates {
    pub cpu_per_second: Decimal,        // $0.000012
    pub memory_per_gb_second: Decimal,  // $0.000004
    pub storage_per_gb_hour: Decimal,   // $0.0001
    pub network_per_gb: Decimal,        // $0.02
    pub gpu_per_second: Option<Decimal>, // $0.0006
}

impl BillingEngine {
    pub async fn calculate_usage_cost(
        &self,
        user_id: &str,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Result<UsageCost> {
        // 1. 获取时间段内的所有事件
        let events = self.get_usage_events(user_id, start_time, end_time).await?;
        
        // 2. 按资源类型聚合
        let aggregated = self.aggregate_usage(events);
        
        // 3. 计算原始费用
        let raw_cost = self.calculate_raw_cost(aggregated);
        
        // 4. 应用折扣
        let discounts = self.apply_discounts(user_id, raw_cost).await?;
        
        // 5. 扣除使用额度
        let final_cost = self.apply_credits(user_id, raw_cost - discounts).await?;
        
        Ok(UsageCost {
            raw_cost,
            discounts,
            credits_used: raw_cost - discounts - final_cost,
            final_cost,
            breakdown: self.generate_breakdown(aggregated),
        })
    }
}
```

### 3.3 数据存储方案

1. **时序数据库（TimescaleDB）**：
   - 存储原始使用事件
   - 支持高效的时间范围查询
   - 自动数据压缩和分区

2. **缓存层（Redis）**：
   - 实时使用统计
   - 用户额度余额
   - 热点数据缓存

3. **主数据库（PostgreSQL）**：
   - 用户订阅信息
   - 账单历史
   - 支付记录

### 3.4 支付集成

```rust
// Stripe集成示例
pub struct PaymentService {
    stripe_client: StripeClient,
    billing_db: BillingDatabase,
}

impl PaymentService {
    pub async fn create_monthly_invoice(&self, user_id: &str) -> Result<Invoice> {
        // 1. 计算当月使用费用
        let usage_cost = self.calculate_monthly_usage(user_id).await?;
        
        // 2. 获取订阅费用
        let subscription = self.get_user_subscription(user_id).await?;
        
        // 3. 创建Stripe发票
        let invoice = self.stripe_client
            .create_invoice()
            .customer(user_id)
            .add_line_item(InvoiceItem {
                description: format!("{} Subscription", subscription.tier),
                amount: subscription.monthly_fee,
            })
            .add_line_item(InvoiceItem {
                description: "Usage Charges",
                amount: usage_cost.final_cost,
                metadata: usage_cost.breakdown,
            })
            .auto_advance(true)
            .send()
            .await?;
        
        // 4. 记录到数据库
        self.billing_db.record_invoice(&invoice).await?;
        
        Ok(invoice)
    }
}
```

## 4. 监控与限制

### 4.1 实时使用监控

```rust
pub struct UsageMonitor {
    limits: Arc<RwLock<HashMap<String, TierLimits>>>,
    current_usage: Arc<DashMap<String, CurrentUsage>>,
    alert_service: AlertService,
}

impl UsageMonitor {
    pub async fn check_limits(&self, user_id: &str) -> Result<LimitStatus> {
        let limits = self.get_user_limits(user_id).await?;
        let current = self.get_current_usage(user_id).await?;
        
        // 检查各项限制
        let checks = vec![
            self.check_concurrent_sandboxes(&current, &limits),
            self.check_session_duration(&current, &limits),
            self.check_storage_usage(&current, &limits),
            self.check_monthly_quota(&current, &limits),
        ];
        
        // 发送警告
        for check in &checks {
            if let LimitStatus::Warning(msg) = check {
                self.alert_service.send_warning(user_id, msg).await?;
            }
        }
        
        Ok(LimitStatus::aggregate(checks))
    }
}
```

### 4.2 使用预警通知

1. **80%使用警告**：当月使用达到额度80%时邮件通知
2. **100%使用通知**：额度用完时立即通知
3. **异常使用检测**：检测异常高的使用模式
4. **成本预测**：基于当前使用预测月底费用

## 5. 用户界面设计

### 5.1 计费仪表板

```typescript
interface BillingDashboard {
  // 当前计费周期
  currentPeriod: {
    start: Date;
    end: Date;
    usage: UsageSummary;
    estimatedCost: number;
  };
  
  // 实时使用情况
  realTimeUsage: {
    activeSandboxes: number;
    currentCost: number;
    remainingCredits: number;
  };
  
  // 使用趋势
  usageTrends: {
    daily: ChartData;
    weekly: ChartData;
    monthly: ChartData;
  };
  
  // 成本明细
  costBreakdown: {
    compute: number;
    storage: number;
    network: number;
    gpu?: number;
  };
}
```

### 5.2 API接口

```yaml
# 获取当前使用情况
GET /api/v1/billing/usage/current
Response:
  {
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-31T23:59:59Z"
    },
    "usage": {
      "cpu_seconds": 1234567,
      "memory_gb_seconds": 456789,
      "storage_gb_hours": 12345,
      "network_gb": 123
    },
    "cost": {
      "raw": 123.45,
      "discounts": 12.34,
      "credits": 50.00,
      "final": 61.11
    }
  }

# 获取账单历史
GET /api/v1/billing/invoices
Response:
  {
    "invoices": [
      {
        "id": "inv_123",
        "period": "2024-12",
        "amount": 149.99,
        "status": "paid",
        "paidAt": "2025-01-05T10:00:00Z"
      }
    ]
  }
```

## 6. 迁移策略

### 6.1 从E2B迁移

为了吸引E2B用户迁移到SoulBox，我们提供：

1. **迁移优惠**：
   - 首3个月享受50%折扣
   - 免费迁移协助服务
   - 额外$200使用额度

2. **API兼容层**：
   - 完全兼容E2B API
   - 无需修改代码即可迁移
   - 渐进式迁移支持

3. **数据迁移工具**：
   ```bash
   soulbox migrate from-e2b \
     --e2b-api-key=xxx \
     --soulbox-api-key=yyy \
     --include-templates \
     --preserve-sandbox-ids
   ```

### 6.2 竞争优势

| 特性 | E2B | SoulBox |
|-----|-----|---------|
| 免费额度 | $100一次性 | $50/月持续 |
| CPU价格 | $0.000014/vCPU/秒 | $0.000012/vCPU/秒 |
| 内存价格 | $0.0000045/GB/秒 | $0.000004/GB/秒 |
| 中文支持 | 无 | 原生支持 |
| 本地部署 | 仅企业版 | Pro版即可 |
| 自定义镜像 | Pro版 | Pro版 |
| GPU支持 | 无 | 支持 |

## 7. 实施路线图

### Phase 1: MVP（4周）
- [ ] 基础计量系统
- [ ] 使用事件收集
- [ ] 简单费用计算
- [ ] 基础API

### Phase 2: 支付集成（4周）
- [ ] Stripe集成
- [ ] 发票生成
- [ ] 支付处理
- [ ] 订阅管理

### Phase 3: 高级功能（4周）
- [ ] 实时监控仪表板
- [ ] 使用预警系统
- [ ] 成本优化建议
- [ ] 详细报表

### Phase 4: 企业功能（4周）
- [ ] 团队计费
- [ ] 成本分配
- [ ] 预算管理
- [ ] 合规报告

## 8. 关键指标（KPIs）

1. **业务指标**：
   - 月经常性收入（MRR）
   - 客户获取成本（CAC）
   - 客户生命周期价值（LTV）
   - 流失率（Churn Rate）

2. **技术指标**：
   - 计费准确率 > 99.99%
   - 计量延迟 < 1秒
   - 系统可用性 > 99.95%
   - 支付成功率 > 98%

3. **用户体验指标**：
   - 账单透明度评分
   - 支持响应时间
   - 用户满意度（NPS）

## 总结

SoulBox的计费系统设计充分借鉴了E2B的成功经验，同时针对中国市场和开发者需求进行了优化。通过更有竞争力的定价、更灵活的订阅选项和更好的本地化支持，SoulBox有望在云端开发环境市场占据一席之地。

关键成功因素：
1. **透明定价**：让用户清楚了解费用构成
2. **灵活计费**：按秒计费，用多少付多少
3. **成本可控**：提供预警和限制机制
4. **简单迁移**：降低用户切换成本
5. **持续优化**：根据市场反馈调整定价策略

---

*文档版本：1.0*  
*最后更新：2025-01-07*  
*作者：SoulBox Team & Claude Assistant*