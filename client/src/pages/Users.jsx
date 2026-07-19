import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/UI';
import DataTable from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import MultiSelect from '../components/MultiSelect';

const SIGNAL_COLORS = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
};
const SIGNAL_LABELS = {
  green:  'Regular',
  yellow: 'Irregular',
  orange: 'At Risk',
  red:    'Not Attending',
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';
  const [memberTypes, setMemberTypes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    Name: '', Role: 'Students', Email: '', Phone: '', Password: '',
    isBACEDevotee: false, isActive: true, MemberTypeID: '', JoinedDate: '', MentorID: '',
  });

  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Mentor reassignment (shown when deleting a user who mentors students)
  const [reassign, setReassign] = useState(null); // { userId, userName, mentees, selected:Set, newMentorID }
  const [reassignSaving, setReassignSaving] = useState(false);

  const loadUsers = useCallback(() => {
    Promise.all([api.memberTypes.list(), api.users.list()])
      .then(([mt, u]) => { setMemberTypes(mt); setAllUsers(Array.isArray(u) ? u : u.rows || []); })
      .catch(console.error);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers, refreshKey]);

  const fetchData = useCallback((params) => api.users.list(params), []);

  const openAdd = () => {
    setForm({ Name: '', Role: 'Students', Email: '', Phone: '', Password: '', isBACEDevotee: false, isActive: true, MemberTypeID: '', JoinedDate: '', MentorID: '' });
    setModal('add');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id, Name: row.Name, Role: row.Role,
      Email: row.Email ?? '', Phone: row.Phone ?? '', Password: '',
      isBACEDevotee: row.isBACEDevotee ?? false,
      isActive: row.isActive ?? true,
      MemberTypeID: row.MemberTypeID ?? '',
      JoinedDate: row.JoinedDate ? row.JoinedDate.slice(0, 10) : '',
      MentorID: row.MentorID ?? '',
    });
    setModal('edit');
  };

  const openDetail = async (row) => {
    setModal('detail');
    setDetailLoading(true);
    setDetailData(null);
    setPasswordForm({ password: '', confirm: '' });
    try {
      const data = await api.users.detail(row.id);
      setDetailData(data);
    } catch (e) { alert(e.message); setModal(null); }
    finally { setDetailLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        Name: form.Name, Role: form.Role,
        Email: form.Email?.trim() || null,
        Phone: form.Phone?.trim() || null,
        isBACEDevotee: form.isBACEDevotee, isActive: form.isActive,
        MemberTypeID: form.MemberTypeID || null,
        JoinedDate: form.JoinedDate || null,
        MentorID: form.MentorID || null,
      };
      if (form.Password?.trim()) payload.Password = form.Password.trim();
      if (modal === 'add') await api.users.create(payload);
      else await api.users.update(form.id, payload);
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (passwordForm.password.length < 6) { alert('Password must be at least 6 characters.'); return; }
    if (passwordForm.password !== passwordForm.confirm) { alert('Passwords do not match.'); return; }
    setPasswordSaving(true);
    try {
      await api.users.setPassword(detailData.user.id, { password: passwordForm.password });
      alert('Password updated.');
      setPasswordForm({ password: '', confirm: '' });
    } catch (e) { alert(e.message); }
    finally { setPasswordSaving(false); }
  };

  const del = async (row) => {
    if (!confirm('Remove this user?')) return;
    try {
      await api.users.delete(row.id);
      setRefreshKey(k => k + 1);
    } catch (e) {
      // If the user still mentors students, open the reassignment dialog.
      if (/mentor to/i.test(e.message)) {
        try {
          const mentees = await api.users.mentees(row.id);
          setReassign({
            userId: row.id,
            userName: row.Name,
            mentees,
            selected: new Set(mentees.map(m => m.id)),
            newMentorID: '',
          });
        } catch (err) { alert(err.message); }
      } else {
        alert(e.message);
      }
    }
  };

  const confirmReassignAndDelete = async () => {
    if (!reassign) return;
    const ids = [...reassign.selected];
    if (ids.length < reassign.mentees.length) {
      if (!confirm('Some mentees are not selected and will keep this mentor, blocking deletion. Continue anyway?')) return;
    }
    if (ids.length > 0 && !reassign.newMentorID) {
      alert('Please choose a new mentor for the selected students (or leave none to clear their mentor).');
    }
    setReassignSaving(true);
    try {
      if (ids.length > 0) {
        await api.users.reassignMentor({ studentIDs: ids, newMentorID: reassign.newMentorID || null });
      }
      await api.users.delete(reassign.userId, true);
      setReassign(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setReassignSaving(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const managers = allUsers.filter(u => u.Role === 'Managers' || u.Role === 'Admin');
  const mentorOptions = managers.map(u => ({ value: u.id, label: `${u.Name} (${u.Role})` }));
  const memberTypeOptions = memberTypes.map(m => ({ value: m.id, label: m.MemberTypeName }));
  const reassignMentorOptions = managers
    .filter(u => u.id !== reassign?.userId)
    .map(u => ({ value: u.id, label: `${u.Name} (${u.Role})` }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-amber-900">Students / Users</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">Add User</button>
      </div>
      <DataTable
        fetchData={fetchData}
        refreshKey={refreshKey}
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'Name', label: 'Name', sortable: true, filterable: true, cellClass: 'font-medium' },
          { key: 'Email', label: 'Email', sortable: true, filterable: true, render: (v) => v || '—' },
          { key: 'Phone', label: 'Phone', filterable: true, render: (v) => v || '—' },
          { key: 'Role', label: 'Role', sortable: true, filterable: true },
          { key: 'MentorName', label: 'Mentor', sortable: true, filterable: true },
          { key: 'MemberTypeName', label: 'Member Type', sortable: true, filterable: true },
          { key: 'isActive', label: 'Active', sortable: true, filterable: true,
            render: (v) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                {v ? 'Yes' : 'No'}
              </span>
            ),
          },
          { key: '_actions', label: 'Actions',
            render: (_, row) => (
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); openDetail(row); }} className="text-blue-600 hover:underline text-xs">View</button>
                <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="text-amber-700 hover:underline text-xs">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); del(row); }} className="text-red-600 hover:underline text-xs">Delete</button>
              </div>
            ),
          },
        ]}
      />

      {/* View Details Modal */}
      {modal === 'detail' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12"><Spinner /> <span className="ml-2 text-stone-500">Loading...</span></div>
            ) : detailData ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">User Details</h2>
                  <button onClick={() => setModal(null)} className="text-stone-400 hover:text-stone-600 text-xl">&times;</button>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
                  <div className="text-stone-500">Name</div><div className="font-medium">{detailData.user.Name}</div>
                  <div className="text-stone-500">Role</div><div>{detailData.user.Role}</div>
                  <div className="text-stone-500">Email</div><div>{detailData.user.Email || '—'}</div>
                  <div className="text-stone-500">Phone</div><div>{detailData.user.Phone || '—'}</div>
                  <div className="text-stone-500">Mentor</div><div>{detailData.user.MentorName || '—'}</div>
                  <div className="text-stone-500">Member Type</div><div>{detailData.user.MemberTypeName || '—'}</div>
                  <div className="text-stone-500">Joined</div><div>{formatDate(detailData.user.JoinedDate)}</div>
                  <div className="text-stone-500">Active</div><div>{detailData.user.isActive ? 'Yes' : 'No'}</div>
                  <div className="text-stone-500">BACE Devotee</div><div>{detailData.user.isBACEDevotee ? 'Yes' : 'No'}</div>
                  <div className="text-stone-500">Status</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-3 h-3 rounded-full ${SIGNAL_COLORS[detailData.user.Signal] || 'bg-stone-300'}`} />
                    <span className="text-xs">{SIGNAL_LABELS[detailData.user.Signal] || '—'}</span>
                  </div>
                </div>

                <h3 className="font-semibold text-amber-900 text-sm mb-2">Enrolled Sessions & Attendance</h3>
                {detailData.enrollments.length === 0 ? (
                  <p className="text-stone-400 text-sm mb-4">Not enrolled in any session.</p>
                ) : (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-xs">
                      <thead className="bg-amber-50 text-left">
                        <tr>
                          <th className="p-2">Class Type</th>
                          <th className="p-2">Session</th>
                          <th className="p-2">Classes</th>
                          <th className="p-2">Attended</th>
                          <th className="p-2">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.enrollments.map(e => {
                          const total = parseInt(e.TotalClasses) || 0;
                          const attended = parseInt(e.attended) || 0;
                          const pct = total > 0 ? Math.round(attended / total * 100) : 0;
                          return (
                            <tr key={e.id} className="border-t border-amber-100">
                              <td className="p-2">{e.ClassType}</td>
                              <td className="p-2">{e.SessionName}</td>
                              <td className="p-2">{total}</td>
                              <td className="p-2">{attended}</td>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-stone-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span>{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {isAdmin && (
                  <div className="border-t pt-4 mt-2">
                    <h3 className="font-semibold text-amber-900 text-sm mb-2">Set Password</h3>
                    <div className="flex gap-2 items-end flex-wrap">
                      <input type="password" placeholder="New password" className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]"
                        value={passwordForm.password} onChange={(e) => setPasswordForm(f => ({ ...f, password: e.target.value }))} />
                      <input type="password" placeholder="Confirm" className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]"
                        value={passwordForm.confirm} onChange={(e) => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} />
                      <button onClick={savePassword} disabled={passwordSaving}
                        className="px-3 py-1.5 bg-amber-700 text-white rounded text-sm disabled:opacity-50 whitespace-nowrap">
                        {passwordSaving ? 'Saving...' : 'Set'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'add' ? 'Add User' : 'Edit User'}</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-stone-600">Name</span>
                <input className="mt-1 w-full border rounded px-3 py-2"
                  value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Email</span>
                <input type="email" className="mt-1 w-full border rounded px-3 py-2" placeholder="you@example.com"
                  value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Phone</span>
                <input type="tel" className="mt-1 w-full border rounded px-3 py-2" placeholder="9876543210"
                  value={form.Phone} onChange={(e) => setForm({ ...form, Phone: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">Password {modal === 'edit' && <span className="text-stone-400 text-xs">(leave blank to keep unchanged)</span>}</span>
                <input type="password" className="mt-1 w-full border rounded px-3 py-2" placeholder="Optional — enables login"
                  autoComplete="new-password"
                  value={form.Password} onChange={(e) => setForm({ ...form, Password: e.target.value })} />
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
              <div className="block">
                <span className="text-sm text-stone-600">Mentor</span>
                <SearchableSelect
                  className="mt-1"
                  value={form.MentorID}
                  onChange={(v) => setForm({ ...form, MentorID: v })}
                  options={mentorOptions}
                  placeholder="— Select mentor —"
                />
              </div>
              <div className="block">
                <span className="text-sm text-stone-600">Member Type</span>
                <SearchableSelect
                  className="mt-1"
                  value={form.MemberTypeID}
                  onChange={(v) => setForm({ ...form, MemberTypeID: v })}
                  options={memberTypeOptions}
                  placeholder="— Select member type —"
                />
              </div>
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

      {/* Reassign Mentor before Delete Modal */}
      {reassign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4" onClick={() => setReassign(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">Reassign Mentees</h2>
            <p className="text-sm text-stone-500 mb-4">
              <span className="font-medium text-stone-700">{reassign.userName}</span> mentors {reassign.mentees.length} student(s).
              Choose which to reassign and to whom, then delete.
            </p>

            <div className="mb-3">
              <span className="text-sm text-stone-600 block mb-1">Students to reassign</span>
              <MultiSelect
                options={reassign.mentees.map(m => ({ value: m.id, label: m.Name }))}
                selected={reassign.selected}
                onChange={(next) => setReassign(r => ({ ...r, selected: next }))}
                emptyMessage="No mentees."
              />
            </div>

            <div className="mb-4">
              <span className="text-sm text-stone-600 block mb-1">New mentor</span>
              <SearchableSelect
                value={reassign.newMentorID}
                onChange={(v) => setReassign(r => ({ ...r, newMentorID: v }))}
                options={reassignMentorOptions}
                placeholder="— Select new mentor (or leave to clear) —"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setReassign(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={confirmReassignAndDelete} disabled={reassignSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2 hover:bg-red-700">
                {reassignSaving && <Spinner className="text-white" />}
                {reassignSaving ? 'Working...' : 'Reassign & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
