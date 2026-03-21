import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Spinner } from '../components/UI';
import DataTable from '../components/DataTable';

export default function Users() {
  const [memberTypes, setMemberTypes] = useState([]);
  const [websiteRoles, setWebsiteRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    Name: '', Role: 'Students', isBACEDevotee: false,
    isActive: true, MemberTypeID: '', WebsiteRoleID: '', JoinedDate: '',
  });

  useEffect(() => {
    Promise.all([api.memberTypes.list(), api.websiteRoles.list()])
      .then(([mt, wr]) => { setMemberTypes(mt); setWebsiteRoles(wr); })
      .catch(console.error);
  }, []);

  const fetchData = useCallback((params) => api.users.list(params), []);

  const openAdd = () => {
    setForm({ Name: '', Role: 'Students', isBACEDevotee: false, isActive: true, MemberTypeID: '', WebsiteRoleID: '', JoinedDate: '' });
    setModal('add');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id, Name: row.Name, Role: row.Role,
      isBACEDevotee: row.isBACEDevotee ?? false,
      isActive: row.isActive ?? true,
      MemberTypeID: row.MemberTypeID ?? '',
      WebsiteRoleID: row.WebsiteRoleID ?? '',
      JoinedDate: row.JoinedDate ? row.JoinedDate.slice(0, 10) : '',
    });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        Name: form.Name, Role: form.Role,
        isBACEDevotee: form.isBACEDevotee, isActive: form.isActive,
        MemberTypeID: form.MemberTypeID || null,
        WebsiteRoleID: form.WebsiteRoleID || null,
        JoinedDate: form.JoinedDate || null,
      };
      if (modal === 'add') await api.users.create(payload);
      else await api.users.update(form.id, payload);
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Remove this user?')) return;
    try { await api.users.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-amber-900">Students / Users</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">Add User</button>
      </div>
      <DataTable
        fetchData={fetchData}
        refreshKey={refreshKey}
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'Name', label: 'Name', sortable: true, filterable: true, cellClass: 'font-medium' },
          { key: 'Role', label: 'Role', sortable: true, filterable: true },
          { key: 'MemberTypeName', label: 'Member Type', sortable: true, filterable: true },
          { key: 'WebsiteRoleName', label: 'Website Role', sortable: true, filterable: true },
          { key: 'JoinedDate', label: 'Joined', sortable: true, render: (v) => formatDate(v) },
          { key: 'isActive', label: 'Active', sortable: true, filterable: true,
            render: (v) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                {v ? 'Yes' : 'No'}
              </span>
            ),
          },
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add User' : 'Edit User'}</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-stone-600">Name</span>
                <input className="mt-1 w-full border rounded px-3 py-2"
                  value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Role</span>
                <select className="mt-1 w-full border rounded px-3 py-2"
                  value={form.Role} onChange={(e) => setForm({ ...form, Role: e.target.value })}>
                  <option value="Admin">Admin</option>
                  <option value="Managers">Managers</option>
                  <option value="Students">Students</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Member Type</span>
                <select className="mt-1 w-full border rounded px-3 py-2"
                  value={form.MemberTypeID} onChange={(e) => setForm({ ...form, MemberTypeID: e.target.value })}>
                  <option value="">—</option>
                  {memberTypes.map((m) => <option key={m.id} value={m.id}>{m.MemberTypeName}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Website Role</span>
                <select className="mt-1 w-full border rounded px-3 py-2"
                  value={form.WebsiteRoleID} onChange={(e) => setForm({ ...form, WebsiteRoleID: e.target.value })}>
                  <option value="">—</option>
                  {websiteRoles.map((r) => <option key={r.id} value={r.id}>{r.Name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Joined Date</span>
                <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                  value={form.JoinedDate} onChange={(e) => setForm({ ...form, JoinedDate: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isBACEDevotee}
                  onChange={(e) => setForm({ ...form, isBACEDevotee: e.target.checked })} />
                <span className="text-sm">BACE Devotee</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
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
