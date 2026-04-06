import env from '../config/env.js';

const buildPaginationMeta = (page, perPage, total) => {
  const totalPages = Math.ceil(total / perPage);
  return { page, perPage, total, totalPages };
};

const parsePaginationQuery = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const perPage = Math.min(
    env.MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.perPage || query.limit) || env.DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * perPage;
  return { page, perPage, skip };
};

const buildSortQuery = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};

const buildFilterQuery = (allowedFields, queryParams) => {
  const filter = {};
  allowedFields.forEach(field => {
    if (queryParams[field] !== undefined && queryParams[field] !== '') {
      filter[field] = queryParams[field];
    }
  });
  return filter;
};

export { buildPaginationMeta, parsePaginationQuery, buildSortQuery, buildFilterQuery };
