// ── Shared UI Components ─────────────────────────────────────
// Import these in each page:
// import { Spinner, FilterBar, FilterSelect, FilterDateInput } from '../components/UI';

export function Spinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 inline-block ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// Wrapper for the filter bar panel
export function FilterBar({ children }) {
  return (
    <div className="mb-4 flex items-end gap-3 flex-wrap bg-white border border-amber-200 rounded-lg p-4">
      {children}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, disabled, children, minWidth = 'min-w-[200px]', maxWidth = 'max-w-xs' }) {
  return (
    <div className={`${minWidth} ${maxWidth}`}>
      {label && <label className="block text-xs text-stone-500 mb-1">{label}</label>}
      <select
        className="w-full border rounded px-3 py-2 text-sm bg-white"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {children}
      </select>
    </div>
  );
}

export function FilterDateInput({ label, value, onChange }) {
  return (
    <div className="flex-none w-44">
      {label && <label className="block text-xs text-stone-500 mb-1">{label}</label>}
      <input
        type="date"
        className="w-full border rounded px-3 py-2 text-sm"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

// Standard Save button with spinner
export function SaveButton({ onClick, saving, label = 'Save', disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 hover:bg-amber-800"
    >
      {saving && <Spinner className="text-white" />}
      {saving ? 'Saving...' : label}
    </button>
  );
}