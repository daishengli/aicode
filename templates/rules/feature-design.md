---
name: feature-design
category: general
enabled: true
targets:
  - claude-code
  - codex
  - opencode
description: 功能设计规范（无服务端项目）
featureRules:
  requireInput: true
  requireOutput: true
  requireBusinessDescription: true
  requireAcceptanceCriteria: true
---

# 功能设计规范（无服务端项目）

适用于 CLI、库、纯客户端等**无服务端**项目的功能设计。

## 设计要素

每个功能必须包含：

### 1. 功能名称
简短描述功能的名称。

### 2. 业务描述
- 功能解决什么问题
- 适用场景
- 输入输出边界

### 3. 入参
| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ... | ... | ... | ... |

### 4. 出参
| 名称 | 类型 | 说明 |
|---|---|---|---|
| ... | ... | ... |

### 5. 验收标准
- 满足什么条件算功能完成
- 边界情况处理
- 错误情况处理

## 与接口设计的关系

**功能设计 = 接口设计的子集**。无服务端项目不暴露 HTTP 接口，但仍需明确：
- 功能的"入参"（如 CLI 命令的参数、函数的参数）
- 功能的"出参"（如 stdout 输出、函数的返回值）
- 业务描述（操作什么数据、做什么处理）

## 设计原则

- 单一职责：一个功能只做一件事
- 明确的边界：输入/输出范围清晰
- 可测试：验收标准可验证
- 可复用：通用功能抽离为工具
