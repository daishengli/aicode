# 接口设计（CLI 命令规范）

> 项目：aicode
> 版本：0.1.0
> 最后更新：2026-06-18

## 1. 全局约定

| 项 | 约定 |
|---|---|
| 退出码 | 0=成功，1=通用错误，2=参数错误，3=环境错误，4=权限错误，5=自洽性检查失败 |
| 成功输出 | stdout 绿色 ✓ |
| 警告输出 | stderr 黄色 [WARN] |
| 错误输出 | stderr 红色 [ERROR]（必带修复建议） |
| 信息输出 | stderr 蓝色 [INFO] |
| `--help` | commander 自动生成 |
| 交互式命令 | 支持 `--yes` 跳过 |

## 2. 命令清单（v0.1）

```bash
aicode init
  # 询问 hasBackend / hasDatabase
  # 检测已有 git 仓库 → 跳过 init
  # 预置规则到 .aicode/rules/

aicode rule list / add / edit / enable / disable / remove
  # 规则管理

aicode doc new <需求简述>
  # 5 阶段：多轮交互 → 自洽性检查 → 需求文档 → 设计文档 → SQL + OpenAPI

aicode sync
  # 编译规则 → 同步到 AI 工具

aicode doctor
  # 环境检查
```

## 3. 命令详细规范

### 3.1 `aicode init`

**入参**：

| 选项 | 说明 |
|---|---|
| `--has-backend` | 是否预填 hasBackend（跳过交互） |
| `--has-database` | 是否预填 hasDatabase |
| `--force` | 强制覆盖已存在的 `.aicode/` |
| `--no-gitignore` | 不追加 .gitignore |
| `--no-git` | 不自动 git init（不推荐） |
| `--yes` | 全部使用默认值 |

**执行流程**：

1. 检查 `.aicode/` 是否存在
2. 询问 `hasBackend` / `hasDatabase`（或用选项预填）
3. 检测 git 仓库 → **已有则跳过 init**
4. 创建目录结构
5. 按 `hasBackend` / `hasDatabase` 拷贝预置规则
6. 写 `config.json`（含 `project` 字段）
7. 追加 `.gitignore`
8. 提交初始结构

**预置规则选择**：

| hasBackend | hasDatabase | 预置规则 |
|---|---|---|
| ✅ | ✅ | db-design / api-design / code-style / dictionary-design |
| ✅ | ❌ | api-design / code-style / dictionary-design |
| ❌ | ✅ | db-design / code-style / dictionary-design |
| ❌ | ❌ | feature-design / code-style / dictionary-design |

### 3.2 `aicode rule add`

**交互问答**：
1. 规则名称（kebab-case，校验唯一性）
2. 分类
3. 描述
4. 目标 AI 工具
5. 规则内容（多行 / 编辑器）

**自动填充的系统级字段**：version、deleted、createdBy、createdAt、updatedBy、updatedAt

### 3.3 `aicode doc new <需求简述>`

**5 阶段执行流程**：

#### Stage 1: 多轮交互收集需求
- 需求简述（已从参数带入，可改）
- 背景 / 目标用户 / 核心场景
- 功能需求（多轮，每个功能详情）
- 非功能需求（多轮）
- 约束 / 验收标准

#### Stage 2: 自洽性检查
- 读已有需求文档
- 检查命名冲突
- 冲突时让用户决策（继续 / 修改 / 取消）

#### Stage 3: 生成需求文档
`.aicode/docs/requirements/<编号>.md`

#### Stage 4: 生成设计文档

**4.1 功能设计文档**（必有）
- `.aicode/docs/design/<编号>-feature.md`

**4.2 接口设计文档**（如有 hasBackend）
- `.aicode/docs/design/<编号>-api.md`
- 内容按 `api-design.md` 规则（响应包装、错误码、path 前缀）

**4.3 数据库设计文档**（如有 hasDatabase）
- `.aicode/docs/design/<编号>-db.md`
- 内容按 `db-design.md` 规则（系统级字段、命名、字符集）

**4.4 字典**（可选）
- 追加到 `.aicode/docs/dictionary.md`

#### Stage 5: 顺便生成 SQL + OpenAPI

**SQL**（如有 hasDatabase 且有表）：
- `.aicode/docs/sql/<编号>.mysql.sql`
- `.aicode/docs/sql/<编号>.postgresql.sql`
- 按 `db-design.md` 的 `sqlRules`

**OpenAPI**（如有 hasBackend）：
- `.aicode/docs/openapi/openapi.json`
- 按 `api-design.md` 的 `apiRules`
- 在原文件基础上累积合并

#### git 提交提示
生成完成后提示 `git add + commit`，可选自动提交。

## 4. 规则文件结构

frontmatter 是结构化规则（机器读），body 是说明文档（AI 读）：

```markdown
---
name: db-design
sqlRules:
  systemFields: [...]
  foreignKey: false
  charset: utf8mb4
  engine: InnoDB
  naming: { table: snake_case_single, field: snake_case }
---

# 数据库设计规范

- 不使用外键约束
- ...
```

## 5. 退出码规范

| 退出码 | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 通用错误 |
| 2 | 参数错误 |
| 3 | 环境错误（未 init、Node 版本不对、git 未安装） |
| 4 | 权限错误 |
| 5 | 自洽性检查未通过 |
| 130 | 用户中断 |
