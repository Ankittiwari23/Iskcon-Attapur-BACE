import { useState, useEffect, useCallback } from 'react';
import { Spinner } from '../components/UI';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function ClassSessions() {
  const [classTypes, setClassTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ ClassTypeID: '', SessionName: '', StartDate: '', EndDate: '', SessionIncharge: '' });

  useEffect(() => {
    Promise.all([api.classTypes.list(), api.users.list()])
      .then(([types, u]) => {
        setClassTypes(types);
        setUsers(u.filter(user => user.Role === 'Admin' || user.Role === 'Managers'));
      })
      .catch(console.error);
  }, []);

  const fetchData = useCallback((params) => {
    return api.classSessions.list(filterType || undefined, params);
  }, [filterType]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const openAdd = () => {
    setForm({ ClassTypeID: classTypes[0]?.id ?? '', SessionName: '', StartDate: '', EndDate: '', SessionIncharge: '' });
    setModal('add');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      SessionName: row.SessionName,
      StartDate: row.StartDate ? row.StartDate.slice(0, 10) : '',
      EndDate: row.EndDate ? row.EndDate.slice(0, 10) : '',
      SessionIncharge: row.SessionIncharge ?? '',
      TotalEnrolled: row.TotalEnrolled,
      TotalClasses: row.TotalClasses,
    });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.classSessions.create({
          ClassTypeID: form.ClassTypeID,
          SessionName: form.SessionName,
          StartDate: form.StartDate || null,
          EndDate: form.EndDate || null,
          SessionIncharge: form.SessionIncharge || null,
        });
      } else {
        await api.classSessions.update(form.id, {
          SessionName: form.SessionName,
          StartDate: form.StartDate || null,
          EndDate: form.EndDate || null,
          SessionIncharge: form.SessionIncharge || null,
          TotalEnrolled: form.TotalEnrolled,
          TotalClasses: form.TotalClasses,
        });
      }
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this session? Enrollments and classes will be removed.')) return;
    try {
      await api.classSessions.delete(id);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-amber-900">Class Sessions</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All class types</option>
            {classTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.ClassType}</option>
            ))}
          </select>
          <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">
            Add Session
          </button>
        </div>
      </div>

      <DataTable
        fetchData={fetchData}
        refreshKey={refreshKey}
        emptyMessage="No sessions found."
        columns={[
          { key: 'SessionID', label: 'Session No', sortable: true, cellClass: 'font-semibold text-amber-800' },
          { key: 'ClassType', label: 'Class Type', sortable: true, filterable: true },
          { key: 'SessionName', label: 'Session Name', sortable: true, filterable: true, cellClass: 'font-medium' },
          { key: 'StartDate', label: 'Start Date', sortable: true, render: (v) => formatDate(v) },
          { key: 'EndDate', label: 'End Date', sortable: true, render: (v) => formatDate(v) },
          { key: 'InchargeName', label: 'Incharge', sortable: true, filterable: true },
          { key: 'TotalEnrolled', label: 'Enrolled', sortable: true, render: (v) => v ?? 0 },
          { key: 'TotalClasses', label: 'Classes', sortable: true, render: (v) => v ?? 0 },
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
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add Class Session' : 'Edit Session'}</h2>
            {modal === 'add' && (
              <label className="block mb-3">
                <span className="text-sm text-stone-600">Class Type</span>
                <select
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={form.ClassTypeID}
                  onChange={(e) => setForm({ ...form, ClassTypeID: e.target.value })}
                >
                  {classTypes.map((t) => <option key={t.id} value={t.id}>{t.ClassType}</option>)}
                </select>
              </label>
            )}
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Session Name</span>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={form.SessionName}
                onChange={(e) => setForm({ ...form, SessionName: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-sm text-stone-600">Start Date</span>
                <input type="date" className="mt-1 w-full border rounded px-3 py-2" value={form.StartDate} onChange={(e) => setForm({ ...form, StartDate: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">End Date</span>
                <input type="date" className="mt-1 w-full border rounded px-3 py-2" value={form.EndDate} onChange={(e) => setForm({ ...form, EndDate: e.target.value })} />
              </label>
            </div>
            {modal === 'edit' && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <span className="text-sm text-stone-600">Total Enrolled</span>
                  <input type="number" min={0} className="mt-1 w-full border rounded px-3 py-2" value={form.TotalEnrolled ?? 0} onChange={(e) => setForm({ ...form, TotalEnrolled: +e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm text-stone-600">Total Classes</span>
                  <input type="number" min={0} className="mt-1 w-full border rounded px-3 py-2" value={form.TotalClasses ?? 0} onChange={(e) => setForm({ ...form, TotalClasses: +e.target.value })} />
                </label>
              </div>
            )}
            <label className="block mb-4">
              <span className="text-sm text-stone-600">Session Incharge</span>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.SessionIncharge} onChange={(e) => setForm({ ...form, SessionIncharge: e.target.value })}>
                <option value="">Select Incharge</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.Name}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
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
