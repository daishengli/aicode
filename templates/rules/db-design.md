---
name: db-design
category: backend
enabled: true
targets:
  - claude-code
  - codex
  - opencode
description: 数据库设计规范
sqlRules:
  systemFields:
    - { name: id, type: BIGINT, autoIncrement: true, comment: 主键 }
    - { name: version, type: INT, default: "0", comment: 乐观锁版本 }
    - { name: deleted, type: TINYINT, default: "0", comment: "逻辑删除：0=未删，1=已删" }
    - { name: created_by, type: VARCHAR(64), default: "", comment: 创建人 }
    - { name: created_at, type: DATETIME, default: CURRENT_TIMESTAMP, comment: 创建时间 }
    - { name: updated_by, type: VARCHAR(64), default: "", comment: 更新人 }
    - { name: updated_at, type: DATETIME, default: CURRENT_TIMESTAMP, onUpdate: CURRENT_TIMESTAMP, comment: 更新时间 }
  foreignKey: false
  charset: utf8mb4
  engine: InnoDB
  naming:
    table: snake_case_single
    field: snake_case
---

# 数据库设计规范

## 表设计

- **表名单数形式、snake_case**（如 `order` 而非 `orders`）
- **字段名 snake_case**（如 `order_no` 而非 `orderNo`）
- **不使用外键约束**，由应用层代码控制关联关系
- **统一字符集**：`utf8mb4`
- **统一引擎**：`InnoDB`

## 系统级字段

每张表必须包含以下 7 个字段（顺序固定）：

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | BIGINT | AUTO_INCREMENT | 主键 |
| `version` | INT | 0 | 乐观锁版本号 |
| `deleted` | TINYINT | 0 | 逻辑删除标记 |
| `created_by` | VARCHAR(64) | "" | 创建人 |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | 创建时间 |
| `updated_by` | VARCHAR(64) | "" | 更新人 |
| `updated_at` | DATETIME | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

## 索引命名

- 唯一键：`uk_<table>_<field>`，如 `uk_order_order_no`
- 普通索引：`idx_<table>_<field>`，如 `idx_order_created_at`
- 主键：`PRIMARY KEY`（固定名为 `id`）

## 设计原则

- 表必须有 `comment` 说明
- 字段必须有 `comment` 说明
- 业务字段尽量 `NOT NULL`
- 时间字段用 `DATETIME`（MySQL）或 `TIMESTAMPTZ`（PostgreSQL）
- 金额字段用 `DECIMAL(p,s)`，禁止用 `FLOAT`/`DOUBLE`
