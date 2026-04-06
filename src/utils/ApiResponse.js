class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
  }

  static success(res, message, data = null, meta = null, statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data, meta));
  }

  static created(res, message, data = null) {
    return res.status(201).json(new ApiResponse(201, message, data));
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, message, data, pagination) {
    const meta = {
      page: pagination.page,
      perPage: pagination.perPage,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
    };
    res.setHeader('X-Total-Count', pagination.total);
    res.setHeader('X-Page', pagination.page);
    res.setHeader('X-Per-Page', pagination.perPage);
    res.setHeader('X-Total-Pages', pagination.totalPages);
    return res.status(200).json(new ApiResponse(200, message, data, meta));
  }
}

export default ApiResponse;
