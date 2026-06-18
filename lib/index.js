/**
 * aicode 主入口
 *
 * 职责：暴露核心模块给外部使用
 * - 业务层（commands/、core/）不直接 require 入口
 * - 入口只做 re-export
 */

module.exports = {
  commands: {
    init: require('./commands/init'),
    rule: {
      add: require('./commands/rule/add'),
      list: require('./commands/rule/list'),
      edit: require('./commands/rule/edit'),
      enable: require('./commands/rule/enable'),
      disable: require('./commands/rule/disable'),
      remove: require('./commands/rule/remove'),
    },
    doc: {
      new: require('./commands/doc/new'),
    },
    sync: require('./commands/sync'),
    doctor: require('./commands/doctor'),
  },
  core: {
    config: require('./core/config'),
    ruleStore: require('./core/rule-store'),
    ruleCompiler: require('./core/rule-compiler'),
    syncEngine: require('./core/sync-engine'),
    toolRegistry: require('./core/tool-registry'),
    docGenerator: require('./core/doc-generator'),
    sqlGenerator: require('./core/sql-generator'),
    openapiGenerator: require('./core/openapi-generator'),
    consistencyChecker: require('./core/consistency-checker'),
    gitHelper: require('./core/git-helper'),
  },
  utils: {
    fs: require('./utils/fs'),
    logger: require('./utils/logger'),
    prompt: require('./utils/prompt'),
    markdown: require('./utils/markdown'),
  },
};
