/**
 * aicode rule disable 命令
 */

const { execute: enableExecute } = require('./enable');

async function execute(args, options, ctx) {
  // 复用 enable 的逻辑，传 enabled=false
  await enableExecute({ name: args.name, flag: false }, options, ctx);
}

module.exports = { execute };
