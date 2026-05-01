export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      lastPage: totalPages,
    },
  };
}

export function getPaginationOptions(query: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number; skip: number } {
  let pageNum = parseInt(String(query.page || 1), 10);
  let limitNum = parseInt(String(query.limit || 20), 10);

  // Fallback if garbage strings like "<number>" are passed in from Postman
  if (isNaN(pageNum)) pageNum = 1;
  if (isNaN(limitNum)) limitNum = 20;

  const page = Math.max(1, pageNum);
  const limit = Math.min(10000, Math.max(1, limitNum));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
