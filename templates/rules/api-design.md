---
name: api-design
category: backend
enabled: true
targets:
  - claude-code
  - codex
  - opencode
description: 接口设计规范
apiRules:
  responseWrapper:
    code: integer
    message: string
    data: object
  errorCodes:
    - { code: 0, message: success }
    - { code: 400, message: 参数错误 }
    - { code: 401, message: 未授权 }
    - { code: 403, message: 禁止访问 }
    - { code: 404, message: 资源不存在 }
    - { code: 409, message: 资源冲突 }
    - { code: 500, message: 服务器错误 }
  auth: required
  pathPrefix: /api/v1
  methodCase: upper
---

# 接口设计规范

## 路径与版本

- 所有接口统一加前缀 `/api/v1`（可在 v1 阶段）
- 路径用名词复数形式（资源名），如 `/api/v1/orders`（注：表名用单数，路径用复数）
- 子资源用嵌套，如 `/api/v1/users/<id>/orders`

## 方法

| 方法 | 用途 | 幂等 |
|---|---|---|
| GET | 查询 | 是 |
| POST | 创建 | 否 |
| PUT | 整体更新 | 是 |
| PATCH | 部分更新 | 否 |
| DELETE | 删除 | 是 |

## 响应包装

所有接口统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": { /* 业务数据 */ }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | integer | 业务状态码（0=成功，其他=错误） |
| `message` | string | 提示信息 |
| `data` | object | 业务数据（成功时存在） |

## 错误码

错误码统一规范（参考 `apiRules.errorCodes`）：

| 范围 | 含义 |
|---|---|
| 0 | 成功 |
| 4xx | 客户端错误（参数、权限、资源） |
| 5xx | 服务端错误 |

详细枚举见项目字典 `.aicode/docs/dictionary.md`。

## 鉴权

除明确公开的接口外，所有接口必须鉴权（JWT / Session）。

## 入参与出参

- **必须有入参**（POST/PUT/PATCH 用 `requestBody`，GET/DELETE 用 `query` + `path`）
- **必须有出参**（响应包装 + 业务字段）
- **字段必须有类型和说明**
- **入参校验规则**写在 `description` 里

## 业务描述

每个接口必须有 `description`，精确到：
- 操作哪张表
- 做什么操作（增/删/改/查）
- 业务场景说明
