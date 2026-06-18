#!/usr/bin/env node
/**
 * aicode CLI 入口
 *
 * 职责：
 * - 解析命令行参数（commander）
 * - 创建 logger / prompt 实例
 * - 路由到对应 command.execute
 * - 顶层错误处理
 *
 * 设计原则：薄壳，不写业务逻辑
 */

const { Command } = require('commander');
const packageJson = require('../package.json');

const { createLogger } = require('../lib/utils/logger');
const { createPrompt } = require('../lib/utils/prompt');

const initCmd = require('../lib/commands/init');
const ruleAddCmd = require('../lib/commands/rule/add');
const ruleListCmd = require('../lib/commands/rule/list');
const ruleEditCmd = require('../lib/commands/rule/edit');
const ruleEnableCmd = require('../lib/commands/rule/enable');
const ruleDisableCmd = require('../lib/commands/rule/disable');
const ruleRemoveCmd = require('../lib/commands/rule/remove');
const docNewCmd = require('../lib/commands/doc/new');
const syncCmd = require('../lib/commands/sync');
const doctorCmd = require('../lib/commands/doctor');

const program = new Command();

program
  .name('aicode')
  .description('跨 AI 编码工具的开发规范管理 CLI')
  .version(packageJson.version)
  .option('--cwd <path>', '工作目录', process.cwd())
  .option('--config <path>', '配置文件路径')
  .option('--no-color', '禁用彩色输出')
  .option('--yes', '跳过所有交互，使用默认值');

// === init ===
program
  .command('init')
  .description('初始化 .aicode/ 项目级配置 + 自动 git init（顶级规则）')
  .option('-f, --force', '强制覆盖已存在的 .aicode/')
  .option('--no-gitignore', '不追加 .gitignore')
  .option('--no-git', '不自动 git init')
  .action(async (opts) => {
    await runCommand(initCmd, [], { ...program.opts(), ...opts });
  });

// === rule ===
const ruleCmd = program.command('rule').description('管理规则（Markdown）');

ruleCmd
  .command('list')
  .description('列出所有规则')
  .option('-c, --category <cat>', '按分类过滤')
  .option('--enabled', '只显示启用的')
  .option('--disabled', '只显示禁用的')
  .option('--json', '以 JSON 格式输出')
  .action(async (opts) => {
    await runCommand(ruleListCmd, [], { ...program.opts(), ...opts });
  });

ruleCmd
  .command('add')
  .description('新增规则（交互式）')
  .option('-n, --name <name>', '预填规则名称')
  .option('-c, --category <cat>', '预填分类')
  .option('-t, --targets <list>', '预填目标工具（逗号分隔）')
  .option('--file <path>', '从已有 markdown 文件导入内容')
  .action(async (opts) => {
    await runCommand(ruleAddCmd, [], { ...program.opts(), ...opts });
  });

ruleCmd
  .command('edit <name>')
  .description('编辑规则')
  .option('--field <kv>', '修改 frontmatter 字段，格式 key=value，可多次', (v, p) => p.concat([v]), [])
  .option('--body', '调起编辑器编辑正文')
  .action(async (name, opts) => {
    await runCommand(ruleEditCmd, { name }, { ...program.opts(), ...opts });
  });

ruleCmd
  .command('enable <name>')
  .description('启用规则')
  .action(async (name) => {
    await runCommand(ruleEnableCmd, name, { ...program.opts() });
  });

ruleCmd
  .command('disable <name>')
  .description('禁用规则')
  .action(async (name) => {
    await runCommand(ruleDisableCmd, { name }, { ...program.opts() });
  });

ruleCmd
  .command('remove <name>')
  .description('删除规则')
  .option('-f, --force', '跳过确认')
  .action(async (name, opts) => {
    await runCommand(ruleRemoveCmd, { name }, { ...program.opts(), ...opts });
  });

// === doc new ===
program
  .command('doc new [title]')
  .description('新增需求：一次性产出 需求文档 + 设计文档 + MySQL DDL + PG DDL + OpenAPI JSON')
  .option('-p, --project <name>', '项目名')
  .option('-a, --author <name>', '作者')
  .option('--commit', '自动 git commit，不询问')
  .option('--no-commit', '不询问 git commit')
  .action(async (title, opts) => {
    await runCommand(docNewCmd, { title }, { ...program.opts(), ...opts });
  });

// === sync ===
program
  .command('sync')
  .description('编译规则并同步到所有 AI 工具')
  .option('-t, --tool <name>', '只同步到指定工具（可多次）', (v, p) => p.concat([v]), [])
  .option('--dry-run', '预览，不写文件')
  .option('--no-backup', '不备份已存在文件')
  .action(async (opts) => {
    await runCommand(syncCmd, [], { ...program.opts(), ...opts });
  });

// === doctor ===
program
  .command('doctor')
  .description('环境检查（Node、git、.aicode/、规则、目标文件、openapi.json）')
  .option('--json', '以 JSON 格式输出')
  .action(async (opts) => {
    await runCommand(doctorCmd, [], { ...program.opts(), ...opts });
  });

/**
 * 统一的命令执行入口
 */
async function runCommand(cmd, args, opts) {
  const globalOpts = program.opts();
  const cwd = globalOpts.cwd || process.cwd();
  const color = globalOpts.color !== false;
  const yes = globalOpts.yes === true;

  const logger = createLogger({ color });
  const prompt = createPrompt({ yes });

  const ctx = { logger, prompt };
  const fullOpts = { cwd, color, yes, ...opts };

  try {
    await cmd.execute(args, fullOpts, ctx);
  } catch (err) {
    logger.error(err.message || String(err), '如需帮助，运行 aicode --help');
    process.exit(1);
  }
}

program.parseAsync(process.argv);
