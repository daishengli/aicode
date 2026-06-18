/**
 * aicode rule enable / disable 命令
 * 注：disable.js 复用 enable.js，传 enabled=false
 */

const ruleStore = require('../../core/rule-store');

async function execute(enabled, options, ctx) {
  const { logger } = ctx;
  const { cwd } = options;
  const name = typeof enabled === 'string' ? enabled : enabled.name;
  const flag = enabled.flag !== undefined ? enabled.flag : true;

  const rule = await ruleStore.get(cwd, name);
  if (!rule) {
    logger.error(`规则 ${name} 不存在`);
    process.exit(1);
  }
  await ruleStore.setEnabled(cwd, name, flag);
  logger.success(`规则 ${name} 已${flag ? '启用' : '禁用'}`);
}

module.exports = { execute };
