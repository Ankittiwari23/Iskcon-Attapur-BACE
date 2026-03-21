import { useState, useCallback } from 'react';
import { api } from '../api';
import { Spinner } from '../components/UI';
import DataTable from '../components/DataTable';

export default function MemberTypes() {
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ MemberTypeName: '' });

  const fetchData = useCallback((params) => api.memberTypes.list(params), []);

  const openAdd = () => { setForm({ MemberTypeName: '' }); setModal('add'); };
  const openEdit = (row) => { setForm({ id: row.id, MemberTypeName: row.MemberTypeName }); setModal('edit'); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.memberTypes.create({ MemberTypeName: form.MemberTypeName });
      else await api.memberTypes.update(form.id, { MemberTypeName: form.MemberTypeName });
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this member type?')) return;
    try { await api.memberTypes.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-amber-900">Member Types</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">Add</button>
      </div>
      <DataTable
        fetchData={fetchData}
        refreshKey={refreshKey}
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'MemberTypeName', label: 'Name', sortable: true, filterable: true, cellClass: 'font-medium' },
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
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add Member Type' : 'Edit Member Type'}</h2>
            <label className="block mb-4">
              <span className="text-sm text-stone-600">Name</span>
              <input className="mt-1 w-full border rounded px-3 py-2" placeholder="Member type name"
                value={form.MemberTypeName} onChange={(e) => setForm({ ...form, MemberTypeName: e.target.value })} />
            </label>
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
