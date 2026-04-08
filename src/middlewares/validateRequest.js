import ApiError from '../utils/ApiError.js';

const normalizeResult = (result) => {
  if (typeof result?.toJSON === 'function') return result.toJSON();
  return result;
};

const validateRequest = ({ body, query, params }) => (req, res, next) => {
  try {
    if (body) {
      const parsedBody = body.parse(req.body);
      req.body = normalizeResult(parsedBody);
    }
    if (query) {
      const parsedQuery = query.parse(req.query);
      req.query = normalizeResult(parsedQuery);
    }
    if (params) {
      const parsedParams = params.parse(req.params);
      req.params = normalizeResult(parsedParams);
    }
    next();
  } catch (error) {
    if (error?.issues) {
      const errors = error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }));
      throw ApiError.unprocessable('Validation failed', errors);
    }
    throw error;
  }
};

export default validateRequest;