# SoulBox 计费系统监控仪表板配置

## 概述

本文档提供SoulBox计费系统的Grafana监控仪表板配置，包括关键指标、可视化面板和告警规则。

## 1. 仪表板布局

### 1.1 总览仪表板（Overview Dashboard）

```json
{
  "dashboard": {
    "title": "SoulBox Billing Overview",
    "uid": "soulbox-billing-overview",
    "tags": ["billing", "revenue", "monitoring"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-24h",
      "to": "now"
    }
  }
}
```

### 1.2 核心指标面板

#### 实时收入指标
```json
{
  "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
  "panels": [
    {
      "title": "今日收入",
      "type": "stat",
      "targets": [{
        "expr": "sum(increase(soulbox_billing_amount_sum{type=\"revenue\"}[24h]))",
        "legendFormat": "Today's Revenue"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "currencyUSD",
          "decimals": 2,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 100},
              {"color": "green", "value": 1000}
            ]
          }
        }
      }
    },
    {
      "title": "本月收入",
      "type": "stat",
      "targets": [{
        "expr": "sum(increase(soulbox_billing_amount_sum{type=\"revenue\"}[30d]))",
        "legendFormat": "Monthly Revenue"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "currencyUSD",
          "decimals": 2
        }
      }
    },
    {
      "title": "活跃付费用户",
      "type": "stat",
      "targets": [{
        "expr": "count(sum by (user_id)(soulbox_usage_total{}) > 0)",
        "legendFormat": "Active Paid Users"
      }]
    },
    {
      "title": "平均客单价(ARPU)",
      "type": "stat",
      "targets": [{
        "expr": "sum(soulbox_billing_amount_sum) / count(distinct(user_id))",
        "legendFormat": "ARPU"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "currencyUSD",
          "decimals": 2
        }
      }
    }
  ]
}
```

## 2. 使用量监控

### 2.1 资源使用趋势

```yaml
# 资源使用趋势图
- title: "Resource Usage Trends"
  type: graph
  gridPos: {x: 0, y: 8, w: 12, h: 8}
  targets:
    - expr: |
        sum(rate(soulbox_usage_total{resource_type="cpu"}[5m])) by (user_id)
      legendFormat: "CPU - {{user_id}}"
    - expr: |
        sum(rate(soulbox_usage_total{resource_type="memory"}[5m])) by (user_id)
      legendFormat: "Memory - {{user_id}}"
    - expr: |
        sum(rate(soulbox_usage_total{resource_type="network"}[5m])) by (user_id)
      legendFormat: "Network - {{user_id}}"
  yaxes:
    - format: "short"
      label: "Usage Rate"
    - format: "short"
```

### 2.2 并发沙箱数量

```yaml
- title: "Active Sandboxes"
  type: graph
  targets:
    - expr: |
        sum(soulbox_active_sandboxes) by (user_id)
      legendFormat: "{{user_id}}"
  alert:
    condition: "WHEN max() OF query(A, 5m, now) IS ABOVE 100"
    message: "High number of active sandboxes"
```

### 2.3 使用量热力图

```json
{
  "title": "Usage Heatmap",
  "type": "heatmap",
  "gridPos": {"h": 10, "w": 12, "x": 12, "y": 8},
  "targets": [{
    "expr": "sum by (le)(rate(soulbox_billing_amount_bucket[5m]))",
    "format": "heatmap",
    "legendFormat": "{{le}}"
  }],
  "dataFormat": "timeseries",
  "cards": {
    "cardPadding": 2,
    "cardRound": 2
  },
  "color": {
    "mode": "spectrum",
    "scheme": "interpolateOranges"
  },
  "yAxis": {
    "format": "currencyUSD",
    "decimals": 0
  }
}
```

## 3. 支付监控

### 3.1 支付成功率

```yaml
- title: "Payment Success Rate"
  type: gauge
  gridPos: {x: 0, y: 16, w: 6, h: 6}
  targets:
    - expr: |
        soulbox_payment_success_rate{period="24h"}
      instant: true
  fieldConfig:
    defaults:
      unit: percentunit
      min: 0
      max: 1
      thresholds:
        mode: absolute
        steps:
          - color: red
            value: 0
          - color: yellow
            value: 0.9
          - color: green
            value: 0.95
```

### 3.2 支付失败分析

```json
{
  "title": "Payment Failures by Reason",
  "type": "piechart",
  "gridPos": {"h": 8, "w": 8, "x": 6, "y": 16},
  "targets": [{
    "expr": "sum by (reason)(increase(soulbox_payment_failures_total[24h]))",
    "legendFormat": "{{reason}}"
  }],
  "options": {
    "pieType": "donut",
    "displayLabels": ["name", "percent"],
    "legendDisplayMode": "table",
    "legendPlacement": "right"
  }
}
```

## 4. 成本分析

### 4.1 成本构成

```yaml
- title: "Cost Breakdown"
  type: piechart
  targets:
    - expr: sum(soulbox_cost_by_type{type="cpu"})
      legendFormat: "CPU"
    - expr: sum(soulbox_cost_by_type{type="memory"})
      legendFormat: "Memory"
    - expr: sum(soulbox_cost_by_type{type="network"})
      legendFormat: "Network"
    - expr: sum(soulbox_cost_by_type{type="storage"})
      legendFormat: "Storage"
```

### 4.2 Top 10 高消费用户

```sql
-- Grafana PostgreSQL 数据源查询
SELECT 
  user_id,
  SUM(cpu_cost + memory_cost + network_cost + storage_cost) as total_cost,
  SUM(cpu_seconds) as cpu_hours,
  SUM(memory_gb_seconds/3600) as memory_gb_hours
FROM billing_records
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 10
```

## 5. 订阅分析

### 5.1 订阅分布

```json
{
  "title": "Subscription Distribution",
  "type": "stat",
  "gridPos": {"h": 4, "w": 3, "x": 0, "y": 24},
  "repeat": "tier",
  "repeatDirection": "h",
  "targets": [{
    "expr": "count(soulbox_subscription_active{tier=\"$tier\"})",
    "legendFormat": "{{tier}} Users"
  }],
  "fieldConfig": {
    "defaults": {
      "mappings": [{
        "type": "value",
        "options": {
          "Developer": {"text": "Free", "color": "blue"},
          "Professional": {"text": "Pro", "color": "green"},
          "Team": {"text": "Team", "color": "yellow"},
          "Enterprise": {"text": "Enterprise", "color": "purple"}
        }
      }]
    }
  }
}
```

### 5.2 MRR趋势

```yaml
- title: "Monthly Recurring Revenue (MRR)"
  type: graph
  targets:
    - expr: |
        sum(soulbox_mrr_by_tier) by (tier)
      legendFormat: "{{tier}}"
  fieldConfig:
    defaults:
      unit: currencyUSD
      custom:
        drawStyle: line
        lineInterpolation: smooth
        lineWidth: 2
        fillOpacity: 10
        stacking:
          mode: normal
```

## 6. 异常检测

### 6.1 使用量异常

```yaml
alerts:
  - name: usage_spike
    expr: |
      (
        rate(soulbox_usage_total[5m]) 
        > 
        avg_over_time(rate(soulbox_usage_total[5m])[1h:5m] offset 1h) * 5
      )
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Unusual usage spike detected for user {{$labels.user_id}}"
      description: "Current usage is 5x higher than hourly average"
```

### 6.2 成本异常

```json
{
  "alert": {
    "name": "high_cost_alert",
    "conditions": [{
      "evaluator": {
        "params": [100],
        "type": "gt"
      },
      "query": {
        "model": {
          "expr": "sum by (user_id)(increase(soulbox_billing_amount_sum[1h]))",
          "refId": "A"
        }
      },
      "reducer": {
        "params": [],
        "type": "max"
      },
      "type": "query"
    }],
    "message": "User {{user_id}} has spent over $100 in the last hour"
  }
}
```

## 7. 性能指标

### 7.1 计费延迟

```yaml
- title: "Billing Latency"
  type: graph
  targets:
    - expr: |
        histogram_quantile(0.99, 
          sum(rate(soulbox_billing_duration_bucket[5m])) by (le)
        )
      legendFormat: "p99"
    - expr: |
        histogram_quantile(0.95, 
          sum(rate(soulbox_billing_duration_bucket[5m])) by (le)
        )
      legendFormat: "p95"
    - expr: |
        histogram_quantile(0.50, 
          sum(rate(soulbox_billing_duration_bucket[5m])) by (le)
        )
      legendFormat: "p50"
  yaxes:
    - format: "s"
      label: "Latency"
```

### 7.2 系统健康度

```json
{
  "title": "System Health Score",
  "type": "gauge",
  "targets": [{
    "expr": "(soulbox_payment_success_rate * 0.4 + (1 - soulbox_error_rate) * 0.3 + soulbox_uptime * 0.3)",
    "legendFormat": "Health Score"
  }],
  "fieldConfig": {
    "defaults": {
      "unit": "percentunit",
      "min": 0,
      "max": 1,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": 0},
          {"color": "yellow", "value": 0.8},
          {"color": "green", "value": 0.95}
        ]
      }
    }
  }
}
```

## 8. 自定义查询模板

### 8.1 变量定义

```yaml
templating:
  list:
    - name: user_id
      type: query
      query: "label_values(soulbox_usage_total, user_id)"
      multi: true
      includeAll: true
      
    - name: timeRange
      type: interval
      options:
        - "5m"
        - "15m"
        - "1h"
        - "6h"
        - "24h"
      current: "5m"
      
    - name: tier
      type: custom
      options:
        - "Developer"
        - "Professional"
        - "Team"
        - "Enterprise"
      multi: true
      includeAll: true
```

### 8.2 常用查询

```sql
-- 用户详细账单
WITH user_summary AS (
  SELECT 
    user_id,
    DATE_TRUNC('day', created_at) as date,
    SUM(cpu_seconds) as cpu_usage,
    SUM(memory_gb_seconds) as memory_usage,
    SUM(network_gb) as network_usage,
    SUM(cpu_cost + memory_cost + network_cost + storage_cost) as daily_cost
  FROM billing_records
  WHERE user_id = '$user_id'
    AND created_at >= '$__timeFrom'
    AND created_at <= '$__timeTo'
  GROUP BY user_id, date
)
SELECT 
  date,
  cpu_usage,
  memory_usage,
  network_usage,
  daily_cost,
  SUM(daily_cost) OVER (ORDER BY date) as cumulative_cost
FROM user_summary
ORDER BY date;
```

## 9. 移动端适配

```json
{
  "mobileLayout": {
    "orientation": "vertical",
    "panels": [
      {
        "id": "today-revenue",
        "gridPos": {"h": 4, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": "active-users",
        "gridPos": {"h": 4, "w": 12, "x": 0, "y": 4}
      },
      {
        "id": "payment-success",
        "gridPos": {"h": 6, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": "usage-trend",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 14}
      }
    ]
  }
}
```

## 10. 导出配置

### 10.1 完整仪表板JSON

```bash
# 导出仪表板
curl -X GET "http://grafana.soulbox.dev/api/dashboards/uid/soulbox-billing-overview" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  > soulbox-billing-dashboard.json

# 导入仪表板
curl -X POST "http://grafana.soulbox.dev/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @soulbox-billing-dashboard.json
```

### 10.2 告警规则导出

```yaml
# alerts.yaml
apiVersion: 1
groups:
  - name: billing_alerts
    folder: billing
    interval: 60s
    rules:
      - uid: payment_failure_rate
        title: High Payment Failure Rate
        condition: payment_failures
        data:
          - refId: A
            queryType: ''
            relativeTimeRange:
              from: 600
              to: 0
            model:
              expr: |
                1 - soulbox_payment_success_rate{period="1h"}
              refId: A
        noDataState: NoData
        execErrState: Alerting
        for: 5m
        annotations:
          description: Payment failure rate is {{ $value | humanizePercentage }}
          runbook_url: https://wiki.soulbox.dev/runbooks/payment-failures
        labels:
          severity: critical
          team: billing
```

## 总结

这套监控仪表板提供了：

1. **实时业务指标** - 收入、用户、ARPU等
2. **资源使用监控** - CPU、内存、网络使用趋势
3. **支付健康度** - 成功率、失败原因分析
4. **成本分析** - 成本构成、高消费用户
5. **异常检测** - 使用量异常、成本异常
6. **性能监控** - 系统延迟、健康度

建议：
- 每天检查关键指标
- 设置合理的告警阈值
- 定期优化查询性能
- 根据业务需求调整面板

---

*文档版本：1.0*  
*最后更新：2025-01-07*  
*作者：SoulBox Team & Claude Assistant*