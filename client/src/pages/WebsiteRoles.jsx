import { useState, useCallback } from 'react';
import { api } from '../api';
import { Spinner } from '../components/UI';
import DataTable from '../components/DataTable';

const BOOLS = ['viewAdmin', 'removeUser', 'addUser', 'markAttendance', 'assignTasks', 'updateSeva', 'addSeva'];

export default function WebsiteRoles() {
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ Name: '', ...Object.fromEntries(BOOLS.map((b) => [b, false])) });

  const fetchData = useCallback((params) => api.websiteRoles.list(params), []);

  const openAdd = () => { setForm({ Name: '', ...Object.fromEntries(BOOLS.map((b) => [b, false])) }); setModal('add'); };
  const openEdit = (row) => { setForm({ id: row.id, Name: row.Name, ...Object.fromEntries(BOOLS.map((b) => [b, row[b] ?? false])) }); setModal('edit'); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { Name: form.Name, ...Object.fromEntries(BOOLS.map((b) => [b, form[b]])) };
      if (modal === 'add') await api.websiteRoles.create(payload);
      else await api.websiteRoles.update(form.id, payload);
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this role?')) return;
    try { await api.websiteRoles.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-amber-900">Website Roles</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">Add</button>
      </div>
      <DataTable
        fetchData={fetchData}
        refreshKey={refreshKey}
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'Name', label: 'Name', sortable: true, filterable: true, cellClass: 'font-medium' },
          ...BOOLS.map(b => ({
            key: b, label: b, sortable: true, headerClass: 'text-xs',
            render: (v) => v ? <span className="text-green-600 font-bold">✓</span> : <span className="text-stone-300">—</span>,
          })),
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
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add Website Role' : 'Edit Website Role'}</h2>
            <label className="block mb-4">
              <span className="text-sm text-stone-600">Role Name</span>
              <input className="mt-1 w-full border rounded px-3 py-2" placeholder="Role name"
                value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {BOOLS.map((b) => (
                <label key={b} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[b]} onChange={(e) => setForm({ ...form, [b]: e.target.checked })} />
                  <span className="text-sm">{b}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
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
