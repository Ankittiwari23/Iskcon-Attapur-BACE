import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Single-select combobox with a search box. Falls back to a normal look but
 * lets the user type to filter when there are many options.
 *
 * Props:
 *  - value: selected value (string | number | '')
 *  - onChange: (value) => void   // called with the option's value (or '')
 *  - options: [{ value, label }]
 *  - placeholder: string
 *  - disabled: boolean
 *  - allowClear: boolean (default true)
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  allowClear = true,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full border rounded px-3 py-2 text-sm text-left bg-white flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? '' : 'text-stone-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {allowClear && selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); pick(''); }}
              className="text-stone-400 hover:text-stone-600 text-xs px-1"
            >
              ✕
            </span>
          )}
          <span className="text-stone-400 text-xs">▾</span>
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-stone-100">
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-stone-400">No matches</p>
            ) : (
              filtered.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => pick(o.value)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-amber-50 ${
                    String(o.value) === String(value) ? 'bg-amber-100 text-amber-900 font-medium' : ''
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
