/**
 * aicode rule remove 命令
 */

const ruleStore = require('../../core/rule-store');

async function execute(args, options, ctx) {
  const { logger, prompt } = ctx;
  const { cwd, force } = options;
  const name = args.name;

  const rule = await ruleStore.get(cwd, name);
  if (!rule) {
    logger.error(`规则 ${name} 不存在`);
    process.exit(1);
  }

  if (!force) {
    const ans = await prompt.confirm('rm', `确定删除规则 ${name}？此操作不可逆。`, { default: false });
    if (!ans) {
      logger.info('已取消');
      return;
    }
  }

  await ruleStore.remove(cwd, name);
  logger.success(`规则 ${name} 已删除`);
}

module.exports = { execute };
