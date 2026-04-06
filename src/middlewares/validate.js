import { z } from 'zod';
import ApiError from '../utils/ApiError.js';

const validate = (schema, source = 'body') => (req, res, next) => {
  const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw ApiError.unprocessable('Validation failed', errors);
  }

  if (source === 'body') req.body = result.data;
  else if (source === 'query') req.query = result.data;
  else req.params = result.data;

  next();
};

const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

export { validate, validateBody, validateQuery, validateParams };
