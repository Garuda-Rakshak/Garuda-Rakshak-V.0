'use strict';

/**
 * Zod validation middleware factory.
 * Usage: validate(schema, 'body' | 'query' | 'params')
 */
const { createError } = require('./errorHandler');

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {string} [source='body']         - 'body', 'query', or 'params'
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
        code:    e.code,
      }));
      return next(createError(422, 'VALIDATION_ERROR', 'Request validation failed', details));
    }
    // Attach parsed (and possibly defaulted/coerced) data
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
