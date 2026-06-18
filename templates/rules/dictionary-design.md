---
name: dictionary-design
category: general
enabled: true
targets:
  - claude-code
  - codex
  - opencode
description: 字典（枚举）规范
dictionaryRules:
  format: value_name_description
  naming: snake_case
  requireDescription: true
  storage: .aicode/docs/dictionary.md
  shared: true
---

# 字典（枚举）规范

## 什么是字典

字典是项目中**所有枚举值的集中管理**，确保：
- 同一枚举值在不同模块/接口/数据库中保持一致
- AI 工具生成代码时引用正确的枚举值
- 新成员快速了解项目有哪些枚举

## 字典文件

**位置**：`.aicode/docs/dictionary.md`（项目级，所有需求共享）

**格式**：

```markdown
# 字典

## 1. <字典名>（<中文名>）
| 值 | 名称 | 说明 |
|---|---|---|
| 0 | 待付款 | 订单创建后未支付 |
| 1 | 已付款 | 用户完成支付 |
| 2 | 已发货 | 商家已发货 |
| 3 | 已完成 | 用户确认收货 |
| 4 | 已取消 | 订单取消 |
```

## 命名规范

- **字典名**：snake_case（如 `order_status`）
- **值类型**：根据业务选择 integer 或 string
- **名称**：人类可读的中文或英文
- **说明**：解释该值的业务含义和使用场景

## 字典与数据库

- 数据库字段使用枚举值时，引用字典（如字段类型 `TINYINT`，注释指向 `dictionary.md#order_status`）
- 接口返回的枚举字段，引用字典
- 不要在代码中硬编码枚举值，必须从字典引用

## 字典与 AI 工具

AI 工具读 `dictionary-design.md` 规则时，会自动读 `.aicode/docs/dictionary.md`，确保生成的代码用一致的枚举值。

## 新增字典流程

1. 在 `dictionary.md` 中新增一个章节
2. 在数据库设计中引用该字典
3. 在接口设计中引用该字典
4. 在代码中使用字典值
