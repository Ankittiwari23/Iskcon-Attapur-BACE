import { useState, useEffect, useRef, useCallback } from 'react';

const PAGE_SIZES = [10, 25, 50, 100];

export default function DataTable({
  columns,
  fetchData,
  pageSize: defaultPageSize = 10,
  emptyMessage = 'No records found.',
  onRowClick,
  activeRowId,
  refreshKey = 0,
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [colFilters, setColFilters] = useState({});
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [showFilters, setShowFilters] = useState(false);

  const filterableCols = columns.filter(c => c.filterable);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedFilters({ ...colFilters }); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [colFilters]);

  const loadData = useCallback(async () => {
    const id = ++reqIdRef.current;
    setLoading(true);
    try {
      const result = await fetchData({
        search: debouncedSearch,
        sortBy: sortKey,
        sortDir,
        page,
        pageSize,
        filters: debouncedFilters,
      });
      if (id !== reqIdRef.current) return;
      setData(result.rows || []);
      setTotal(result.total || 0);
    } catch (e) {
      if (id !== reqIdRef.current) return;
      console.error('DataTable fetch error:', e);
      setData([]);
      setTotal(0);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, [fetchData, debouncedSearch, sortKey, sortDir, page, pageSize, debouncedFilters, refreshKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const setColFilter = (key, value) => {
    setColFilters(prev => ({ ...prev, [key]: value }));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const sortIcon = (key) => {
    if (sortKey !== key) return <span className="text-stone-300 ml-1">↕</span>;
    return <span className="ml-1 text-amber-700">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const hasActiveFilters = search.trim() || Object.values(colFilters).some(v => v?.trim());

  const clearAll = () => {
    setSearch('');
    setColFilters({});
    setDebouncedSearch('');
    setDebouncedFilters({});
    setSortKey(null);
    setSortDir('asc');
    setPage(1);
  };

  const rangeStart = total > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * pageSize, total);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            placeholder="Search all columns..."
            className="w-full border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {filterableCols.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center gap-1.5 transition-colors ${
              showFilters ? 'bg-amber-100 border-amber-300 text-amber-800' : 'hover:bg-stone-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        )}

        {hasActiveFilters && (
          <button onClick={clearAll} className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
            Clear All
          </button>
        )}

        <span className="text-xs text-stone-500 ml-auto">
          {loading ? 'Loading...' : `${total} ${total === 1 ? 'record' : 'records'}`}
        </span>
      </div>

      <div className="bg-white rounded-lg border border-amber-200 overflow-x-auto relative">
        {loading && data.length > 0 && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-amber-100 text-left">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`p-3 whitespace-nowrap select-none ${col.sortable ? 'cursor-pointer hover:bg-amber-200 transition-colors' : ''} ${col.headerClass || ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && sortIcon(col.key)}
                  </span>
                </th>
              ))}
            </tr>
            {showFilters && (
              <tr className="bg-amber-50">
                {columns.map(col => (
                  <th key={`filter-${col.key}`} className="p-1.5">
                    {col.filterable ? (
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full border border-stone-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-amber-400"
                        value={colFilters[col.key] || ''}
                        onChange={(e) => setColFilter(col.key, e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-stone-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-stone-400">
                  {hasActiveFilters ? 'No matching records found.' : emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-t border-amber-100 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    activeRowId != null && row.id === activeRowId
                      ? 'bg-amber-100 border-l-4 border-l-amber-600'
                      : 'hover:bg-amber-50'
                  }`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`p-3 ${col.cellClass || ''}`}>
                      {col.render
                        ? col.render(row[col.key], row, (safePage - 1) * pageSize + idx)
                        : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-stone-500">Rows per page:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-stone-500 mr-2">
            {rangeStart}–{rangeEnd} of {total}
          </span>
          <button
            onClick={() => setPage(1)}
            disabled={safePage <= 1}
            className="px-2 py-1 border rounded hover:bg-stone-50 disabled:opacity-30"
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-2 py-1 border rounded hover:bg-stone-50 disabled:opacity-30"
          >‹</button>
          <span className="px-3 py-1 text-stone-700">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-2 py-1 border rounded hover:bg-stone-50 disabled:opacity-30"
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage >= totalPages}
            className="px-2 py-1 border rounded hover:bg-stone-50 disabled:opacity-30"
          >»</button>
        </div>
      </div>
    </div>
  );
}
