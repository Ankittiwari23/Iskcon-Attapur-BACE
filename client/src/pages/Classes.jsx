import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function Classes() {
  const [classTypes, setClassTypes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [classTypeID, setClassTypeID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const emptyForm = { ClassTypeID: '', SessionID: '', ClassDescription: '', isActive: true, StartDate: '', ClassInstructor: '', Remarks: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    Promise.all([api.classTypes.list(), api.classSessions.list(), api.users.list()])
      .then(([types, sess, u]) => {
        setClassTypes(types);
        setSessions(sess);
        setUsers(u.filter(user => user.Role === 'Admin' || user.Role === 'Managers'));
      })
      .catch(console.error);
  }, []);

  const filterSession = (ctId) => sessions.filter((s) => String(s.ClassTypeID) === String(ctId));

  const fetchData = useCallback((params) => {
    return api.classes.list(classTypeID, sessionID, params);
  }, [classTypeID, sessionID]);

  const applyFilter = () => {
    if (!classTypeID || !sessionID) {
      alert('Please select both a Class Type and a Session to view classes.');
      return;
    }
    setHasLoaded(true);
    setRefreshKey(k => k + 1);
  };

  const openAdd = () => {
    if (!classTypeID || !sessionID) {
      alert('Please select a Class Type and Session first.');
      return;
    }
    setForm({ ...emptyForm, ClassTypeID: classTypeID, SessionID: sessionID });
    setModal('add');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      ClassDescription: row.ClassDescription ?? '',
      isActive: row.isActive ?? true,
      StartDate: row.StartDate ? row.StartDate.slice(0, 10) : '',
      ClassInstructor: row.ClassInstructor ?? '',
      Remarks: row.Remarks ?? '',
    });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.classes.create({
          ClassTypeID: form.ClassTypeID, SessionID: form.SessionID,
          ClassDescription: form.ClassDescription || null, isActive: form.isActive,
          StartDate: form.StartDate || null, EndDate: form.StartDate || null,
          Duration: 1, DurationType: 'SingleDay',
          ClassInstructor: form.ClassInstructor || null, Remarks: form.Remarks || null,
        });
      } else {
        await api.classes.update(form.id, {
          ClassDescription: form.ClassDescription, isActive: form.isActive,
          StartDate: form.StartDate || null, EndDate: form.StartDate || null,
          Duration: 1, DurationType: 'SingleDay',
          ClassInstructor: form.ClassInstructor || null, Remarks: form.Remarks || null,
        });
      }
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this class?')) return;
    try { await api.classes.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const selectedSession = sessions.find(
    s => String(s.ClassTypeID) === String(classTypeID) && String(s.SessionID) === String(sessionID)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-amber-900">Classes</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border rounded px-3 py-2 text-sm" value={classTypeID}
            onChange={(e) => { setClassTypeID(e.target.value); setSessionID(''); setHasLoaded(false); }}>
            <option value="">— Select Class Type —</option>
            {classTypes.map((t) => <option key={t.id} value={t.id}>{t.ClassType}</option>)}
          </select>
          <select className="border rounded px-3 py-2 text-sm" value={sessionID} disabled={!classTypeID}
            onChange={(e) => { setSessionID(e.target.value); setHasLoaded(false); }}>
            <option value="">— Select Session —</option>
            {filterSession(classTypeID).map((s) => (
              <option key={s.id} value={s.SessionID}>Session {s.SessionID}: {s.SessionName}</option>
            ))}
          </select>
          <button onClick={applyFilter} className="px-3 py-2 bg-stone-100 border rounded-lg text-sm hover:bg-stone-200">Load</button>
          <button onClick={openAdd} disabled={!classTypeID || !sessionID}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-40">Add Class</button>
        </div>
      </div>

      {selectedSession && hasLoaded && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm flex gap-4">
          <span className="font-medium text-amber-900">{selectedSession.ClassType || classTypes.find(t => String(t.id) === String(classTypeID))?.ClassType}</span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-700">Session {selectedSession.SessionID}: <strong>{selectedSession.SessionName}</strong></span>
        </div>
      )}

      {!hasLoaded ? (
        <div className="bg-white rounded-lg border border-amber-200 p-12 text-center text-stone-400">
          <p className="text-lg mb-2">Select a Class Type and Session to view classes</p>
          <p className="text-sm">Use the filters above, then click Load</p>
        </div>
      ) : (
        <DataTable
          fetchData={fetchData}
          refreshKey={refreshKey}
          emptyMessage="No classes found for this session."
          columns={[
            { key: 'ClassNo', label: 'Class No', sortable: true, cellClass: 'font-semibold text-amber-800' },
            { key: 'ClassDescription', label: 'Description', sortable: true, filterable: true, cellClass: 'max-w-xs' },
            { key: 'StartDate', label: 'Date', sortable: true, render: (v) => formatDate(v) },
            { key: 'InstructorName', label: 'Instructor', sortable: true, filterable: true },
            { key: 'isActive', label: 'Active', sortable: true,
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
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add Class' : 'Edit Class'}</h2>
            {modal === 'add' && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                Session: <strong>{selectedSession?.SessionName}</strong>
              </div>
            )}
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Description</span>
              <textarea className="mt-1 w-full border rounded px-3 py-2" rows={2}
                value={form.ClassDescription} onChange={(e) => setForm({ ...form, ClassDescription: e.target.value })} />
            </label>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Class Date</span>
              <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                value={form.StartDate} onChange={(e) => setForm({ ...form, StartDate: e.target.value })} />
            </label>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Instructor</span>
              <select className="mt-1 w-full border rounded px-3 py-2"
                value={form.ClassInstructor} onChange={(e) => setForm({ ...form, ClassInstructor: e.target.value })}>
                <option value="">Select Instructor</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.Name}</option>)}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Remarks</span>
              <input className="mt-1 w-full border rounded px-3 py-2"
                value={form.Remarks} onChange={(e) => setForm({ ...form, Remarks: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-amber-700 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
