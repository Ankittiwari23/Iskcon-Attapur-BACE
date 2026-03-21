/**
 * Wraps a base SQL query with server-side search, column filters, sorting, and pagination.
 * Returns paginated format { rows, total, page, pageSize } when `page` param is present,
 * otherwise returns plain array for backward compatibility.
 */
export async function paginatedQuery(pool, baseQuery, baseParams, { searchColumns = [], req }) {
  const { search, sortBy, sortDir, page, pageSize } = req.query;

  if (!page) return null; // signal caller to use legacy behavior

  const filters = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (key.startsWith('filter_') && value?.trim()) {
      filters[key.slice(7)] = value.trim();
    }
  }

  let outerConditions = [];
  let extraParams = [];
  let idx = baseParams.length + 1;

  if (search?.trim() && searchColumns.length > 0) {
    const parts = searchColumns.map(col => `"${col}"::text ILIKE $${idx}`);
    extraParams.push(`%${search.trim()}%`);
    idx++;
    outerConditions.push(`(${parts.join(' OR ')})`);
  }

  for (const [col, val] of Object.entries(filters)) {
    const safeCol = col.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeCol) continue;
    outerConditions.push(`"${safeCol}"::text ILIKE $${idx}`);
    extraParams.push(`%${val}%`);
    idx++;
  }

  const allParams = [...baseParams, ...extraParams];
  const outerWhere = outerConditions.length > 0 ? `WHERE ${outerConditions.join(' AND ')}` : '';

  let orderClause = '';
  if (sortBy) {
    const safeSortBy = sortBy.replace(/[^a-zA-Z0-9_]/g, '');
    const dir = sortDir?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    if (safeSortBy) orderClause = `ORDER BY "${safeSortBy}" ${dir} NULLS LAST`;
  }

  const pg = Math.max(1, parseInt(page) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 10));

  const dataQuery = `SELECT * FROM (${baseQuery}) AS _base ${outerWhere} ${orderClause} LIMIT ${ps} OFFSET ${(pg - 1) * ps}`;
  const countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS _base ${outerWhere}`;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQuery, allParams),
    pool.query(countQuery, allParams),
  ]);

  return {
    rows: dataRes.rows,
    total: parseInt(countRes.rows[0].total),
    page: pg,
    pageSize: ps,
  };
}
