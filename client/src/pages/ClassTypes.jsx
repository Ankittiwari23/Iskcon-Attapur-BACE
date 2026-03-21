import { useState, useCallback } from 'react';
import { api } from '../api';
import { Spinner } from '../components/UI';
import DataTable from '../components/DataTable';

export default function ClassTypes() {
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ ClassType: '', currentActiveSession: 1 });

  const fetchData = useCallback((params) => api.classTypes.list(params), []);

  const openAdd = () => { setForm({ ClassType: '', currentActiveSession: 1 }); setModal('add'); };
  const openEdit = (row) => { setForm({ id: row.id, ClassType: row.ClassType, currentActiveSession: row.currentActiveSession ?? 1 }); setModal('edit'); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.classTypes.create({ ClassType: form.ClassType, currentActiveSession: form.currentActiveSession });
      else await api.classTypes.update(form.id, { ClassType: form.ClassType, currentActiveSession: form.currentActiveSession });
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this class type? Sessions and classes will be removed.')) return;
    try { await api.classTypes.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-amber-900">Class Types</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">Add</button>
      </div>
      <DataTable
        fetchData={fetchData}
        refreshKey={refreshKey}
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'ClassType', label: 'Class Type', sortable: true, filterable: true, cellClass: 'font-medium' },
          { key: 'currentActiveSession', label: 'Active Session', sortable: true },
          { key: '_actions', label: 'Actions',
            render: (_, row) => (
              <>
                <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="text-amber-700 hover:underline mr-3">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); del(row.id); }} className="text-red-600 hover:underline">Delete</button>
              </>
            ),
          },
        ]}
      />

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add Class Type' : 'Edit Class Type'}</h2>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Name</span>
              <input className="mt-1 w-full border rounded px-3 py-2" value={form.ClassType}
                onChange={(e) => setForm({ ...form, ClassType: e.target.value })} placeholder="e.g. BYC, DYC" />
            </label>
            <label className="block">
              <span className="text-sm text-stone-600">Current Active Session #</span>
              <input type="number" min={1} className="mt-1 w-full border rounded px-3 py-2"
                value={form.currentActiveSession}
                onChange={(e) => setForm({ ...form, currentActiveSession: +e.target.value || 1 })} />
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner className="text-white" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
