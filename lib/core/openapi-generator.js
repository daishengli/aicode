/**
 * OpenAPI 3.0 生成器（规则驱动）
 *
 * 输入：
 *   - existing: 现有 openapi.json（null 表示无）
 *   - additions: { info, paths, components }
 *   - apiRules: 来自 api-design.md 的 frontmatter
 *
 * 输出：
 *   - 合并后的 OpenAPI 3.0 spec
 *
 * 戴老板的核心要求：
 *   - 响应包装（code/message/data）、错误码、path 前缀等都从 api-design 规则读
 *   - 改 api-design 规则，所有生成都跟着改
 */

const { toOpenApiSchema } = require('./sql-generator');

const DEFAULT_API_RULES = {
  responseWrapper: { code: 'integer', message: 'string', data: 'object' },
  errorCodes: [
    { code: 0, message: 'success' },
    { code: 400, message: '参数错误' },
    { code: 401, message: '未授权' },
    { code: 403, message: '禁止访问' },
    { code: 404, message: '资源不存在' },
    { code: 409, message: '资源冲突' },
    { code: 500, message: '服务器错误' },
  ],
  auth: 'required',
  pathPrefix: '/api/v1',
  methodCase: 'upper',
};

function mergeApiRules(userRules) {
  return { ...DEFAULT_API_RULES, ...(userRules || {}) };
}

/**
 * 合并 OpenAPI
 * @param {Object|null} existing 现有 spec
 * @param {Object} additions { info: { projectName }, paths: [...], components: { schemas } }
 * @param {Object} apiRules
 * @returns {Object}
 */
function mergeOpenApi(existing, additions, apiRules) {
  const rules = mergeApiRules(apiRules);
  const base = existing || {
    openapi: '3.0.3',
    info: { title: 'API', version: '0.1.0', description: '由 aicode 自动生成' },
    paths: {},
    components: { schemas: {} },
  };

  // info
  if (additions.info?.projectName) {
    base.info = { ...base.info, title: `${additions.info.projectName} API` };
  }
  base.info.version = bumpVersion(base.info.version);
  base.info.description = '由 aicode 自动生成，所有需求累积合并';

  // paths（自动加 path 前缀）
  for (const p of additions.paths || []) {
    const fullPath = (p.path.startsWith(rules.pathPrefix) ? '' : rules.pathPrefix) + p.path;
    if (!base.paths[fullPath]) base.paths[fullPath] = {};
    base.paths[fullPath][p.method.toLowerCase()] = buildOperation(p, rules);
  }

  // schemas
  if (additions.components?.schemas) {
    base.components = base.components || { schemas: {} };
    base.components.schemas = { ...base.components.schemas, ...additions.components.schemas };
  }

  return base;
}

function buildOperation(p, rules) {
  return {
    summary: p.summary || '',
    description: p.description || '',
    operationId: p.operationId || toOperationId(p.method, p.path),
    tags: p.tags || [extractTag(p.path, rules)],
    parameters: (p.parameters || []).map((param) => ({
      name: param.name,
      in: param.in || 'query',
      required: !!param.required,
      description: param.description || '',
      schema: param.schema || { type: param.type || 'string' },
    })),
    requestBody: p.requestBody
      ? {
          required: true,
          content: {
            'application/json': {
              schema: p.requestBody.schema || { type: 'object', properties: p.requestBody.properties || {} },
            },
          },
        }
      : undefined,
    responses: p.responses || defaultResponses(p.responseFields, rules),
  };
}

function defaultResponses(fields, rules) {
  const resp = {
    200: {
      description: '成功',
      content: { 'application/json': { schema: wrapResponse(fields, rules) } },
    },
  };
  // 加错误码响应
  for (const ec of rules.errorCodes || []) {
    if (ec.code !== 0) {
      resp[ec.code] = {
        description: ec.message,
        content: { 'application/json': { schema: wrapResponse(null, rules) } },
      };
    }
  }
  return resp;
}

function wrapResponse(fields, rules) {
  const wrapper = rules.responseWrapper || DEFAULT_API_RULES.responseWrapper;
  const dataProps = {};
  if (fields && fields.length > 0) {
    for (const f of fields) {
      dataProps[f.name] = toOpenApiSchema(f.type, f.length);
      if (f.description) dataProps[f.name].description = f.description;
    }
  }
  return {
    type: 'object',
    properties: {
      code: { type: 'integer', example: 0 },
      message: { type: 'string', example: 'success' },
      data: Object.keys(dataProps).length > 0
        ? { type: 'object', properties: dataProps }
        : { type: 'object' },
    },
    required: Object.keys(wrapper),
  };
}

function toOperationId(method, path) {
  const segments = path.split('/').filter(Boolean);
  const cleaned = segments.map((s) => s.replace(/[{}]/g, ''));
  return method.toLowerCase() + cleaned.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function extractTag(path, rules) {
  const stripped = path.replace(rules.pathPrefix || '', '').replace(/^\//, '');
  return stripped.split('/').filter(Boolean)[0] || 'default';
}

function bumpVersion(v) {
  const parts = String(v || '0.0.0').split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
}

module.exports = {
  mergeOpenApi,
  mergeApiRules,
  DEFAULT_API_RULES,
};
