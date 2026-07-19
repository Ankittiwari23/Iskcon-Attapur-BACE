import { useMemo, useState } from 'react';

/**
 * Scrollable checkbox list with a search box and "select all". Good for picking
 * many items at once (e.g. enrolling multiple students, reassigning mentees).
 *
 * Props:
 *  - options: [{ value, label }]
 *  - selected: Set | array of values
 *  - onChange: (nextSetOfValues: Set) => void
 *  - placeholder: search placeholder
 *  - emptyMessage: shown when no options
 *  - maxHeight: tailwind class for the scroll area height (default max-h-56)
 */
export default function MultiSelect({
  options = [],
  selected,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No options.',
  maxHeight = 'max-h-56',
}) {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(
    () => (selected instanceof Set ? selected : new Set(selected || [])),
    [selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (val) => {
    const next = new Set(selectedSet);
    next.has(val) ? next.delete(val) : next.add(val);
    onChange(next);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selectedSet.has(o.value));

  const toggleAll = () => {
    const next = new Set(selectedSet);
    if (allFilteredSelected) {
      filtered.forEach(o => next.delete(o.value));
    } else {
      filtered.forEach(o => next.add(o.value));
    }
    onChange(next);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-2 border-b border-stone-100 flex items-center gap-2">
        <input
          type="text"
          placeholder={placeholder}
          className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-amber-700 hover:underline whitespace-nowrap px-1"
          >
            {allFilteredSelected ? 'Clear' : 'Select all'}
          </button>
        )}
      </div>
      <div className={`${maxHeight} overflow-y-auto`}>
        {options.length === 0 ? (
          <p className="px-3 py-3 text-sm text-stone-400">{emptyMessage}</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-stone-400">No matches</p>
        ) : (
          filtered.map(o => (
            <label
              key={o.value}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer border-b border-stone-50 last:border-0"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(o.value)}
                onChange={() => toggle(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))
        )}
      </div>
      {selectedSet.size > 0 && (
        <div className="px-3 py-1.5 bg-stone-50 border-t border-stone-100 text-xs text-stone-500">
          {selectedSet.size} selected
        </div>
      )}
    </div>
  );
}
