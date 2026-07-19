import { useState, useEffect, useCallback } from 'react';
import { Spinner } from '../components/UI';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [classTypes, setClassTypes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);

  const [classTypeID, setClassTypeID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [selectedClassID, setSelectedClassID] = useState('');
  const [selectedClassData, setSelectedClassData] = useState(null);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [pendingMap, setPendingMap] = useState({});
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.classTypes.list(), api.classSessions.list(), api.users.list()])
      .then(([types, sess, u]) => {
        if (types.status === 'fulfilled') setClassTypes(Array.isArray(types.value) ? types.value : []);
        if (sess.status === 'fulfilled') setSessions(Array.isArray(sess.value) ? sess.value : []);
        if (u.status === 'fulfilled') setUsers(Array.isArray(u.value) ? u.value : []);
      });
  }, []);

  const filterSession = (ctId) => sessions
    .filter((s) => String(s.ClassTypeID) === String(ctId))
    .sort((a, b) => b.SessionID - a.SessionID);

  const fetchClasses = useCallback((params) => {
    return api.classes.list(classTypeID, sessionID, params);
  }, [classTypeID, sessionID]);

  const applyFilter = async () => {
    if (!classTypeID || !sessionID) {
      alert('Please select a Class Type and Session.');
      return;
    }
    setHasLoaded(true);
    setSelectedClassID('');
    setSelectedClassData(null);
    setEnrolledUsers([]);
    setAttendanceMap({});
    setPendingMap({});
    setIsDirty(false);
    setRefreshKey(k => k + 1);

    try {
      const enr = await api.sessionEnrollments.list(classTypeID, sessionID);
      const enrolledUserIds = new Set(enr.map(e => e.userID));
      setEnrolledUsers(users.filter(u => enrolledUserIds.has(u.id)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClassID(cls.id);
    setSelectedClassData(cls);
    setIsDirty(false);
    setSelectedUserIds(new Set());
    try {
      const records = await api.classAttendance.list(cls.id);
      const map = {};
      records.forEach(r => { map[r.UserID] = r.Attended; });
      setAttendanceMap(map);
      setPendingMap({ ...map });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectUser = (uid) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === enrolledUsers.length) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(enrolledUsers.map(u => u.id)));
  };

  const markSelected = (attended) => {
    if (selectedUserIds.size === 0) { alert('Please select at least one student first.'); return; }
    setPendingMap(prev => {
      const next = { ...prev };
      selectedUserIds.forEach(uid => { next[uid] = attended; });
      return next;
    });
    setIsDirty(true);
  };

  const toggleIndividual = (uid) => {
    setPendingMap(prev => ({ ...prev, [uid]: !prev[uid] }));
    setIsDirty(true);
  };

  const handleUpdate = async () => {
    if (!selectedClassID || !selectedClassData) return;
    setSaving(true);
    try {
      const records = enrolledUsers.map(u => ({
        ClassID: selectedClassID,
        ClassTypeID: selectedClassData.ClassTypeID,
        SessionID: selectedClassData.SessionID,
        UserID: u.id,
        Attended: !!pendingMap[u.id],
        MarkedByUser: null,
      }));
      await api.classAttendance.bulkCreate(records);
      setAttendanceMap({ ...pendingMap });
      setIsDirty(false);
      setSelectedUserIds(new Set());
      alert('Attendance updated successfully.');
    } catch (e) {
      alert('Error saving attendance: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPendingMap({ ...attendanceMap });
    setIsDirty(false);
    setSelectedUserIds(new Set());
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const selectedSession = sessions.find(
    s => String(s.ClassTypeID) === String(classTypeID) && String(s.SessionID) === String(sessionID)
  );

  const canMark = isAdmin || (selectedClassData && selectedClassData.ClassInstructor === user?.id);
  const presentCount = enrolledUsers.filter(u => !!pendingMap[u.id]).length;
  const absentCount = enrolledUsers.length - presentCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-amber-900">Attendance</h1>
      </div>

      <div className="mb-4 flex items-end gap-3 flex-wrap bg-white border border-amber-200 rounded-lg p-4">
        <div className="min-w-[200px] max-w-xs">
          <label className="block text-xs text-stone-500 mb-1">Class Type</label>
          <select className="w-full border rounded px-3 py-2 text-sm" value={classTypeID}
            onChange={(e) => { setClassTypeID(e.target.value); setSessionID(''); setHasLoaded(false); setSelectedClassID(''); setEnrolledUsers([]); }}>
            <option value="">— Select —</option>
            {classTypes.map(t => <option key={t.id} value={t.id}>{t.ClassType}</option>)}
          </select>
        </div>
        <div className="min-w-[240px] max-w-sm">
          <label className="block text-xs text-stone-500 mb-1">Session</label>
          <select className="w-full border rounded px-3 py-2 text-sm" value={sessionID} disabled={!classTypeID}
            onChange={(e) => { setSessionID(e.target.value); setHasLoaded(false); setSelectedClassID(''); }}>
            <option value="">— Select —</option>
            {filterSession(classTypeID).map(s => (
              <option key={s.id} value={s.SessionID}>Session {s.SessionID}: {s.SessionName}</option>
            ))}
          </select>
        </div>
        <button onClick={applyFilter} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800">
          Load
        </button>
      </div>

      {!hasLoaded ? (
        <div className="bg-white rounded-lg border border-amber-200 p-12 text-center text-stone-400">
          <p className="text-lg mb-2">Select Class Type and Session to begin</p>
          <p className="text-sm">Then click Load to view classes and mark attendance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-amber-800">
                Classes
                {selectedSession && <span className="text-sm text-stone-500 ml-2 font-normal">— {selectedSession.SessionName}</span>}
              </h2>
            </div>
            <DataTable
              fetchData={fetchClasses}
              refreshKey={refreshKey}
              emptyMessage="No classes found."
              onRowClick={handleSelectClass}
              activeRowId={selectedClassID}
              pageSize={10}
              columns={[
                { key: 'ClassNo', label: 'No', sortable: true, cellClass: 'font-semibold text-amber-800' },
                { key: 'ClassDescription', label: 'Description', sortable: true, filterable: true },
                { key: 'StartDate', label: 'Date', sortable: true, render: (v) => formatDate(v) },
                { key: 'InstructorName', label: 'Instructor', sortable: true, filterable: true },
              ]}
            />
          </div>

          <div>
            {!selectedClassID ? (
              <div className="bg-white rounded-lg border border-amber-200 p-10 text-center text-stone-400 h-full flex items-center justify-center">
                <div>
                  <p className="text-base mb-1">Select a class from the left</p>
                  <p className="text-sm">to mark attendance</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-amber-900 text-sm">
                      Mark Attendance — {selectedClassData?.ClassDescription || `Class ${selectedClassID}`}
                    </h3>
                    <span className="text-xs text-stone-500">{formatDate(selectedClassData?.StartDate)}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-stone-600">
                    <span>Enrolled: <strong>{enrolledUsers.length}</strong></span>
                    <span className="text-green-700">Present: <strong>{presentCount}</strong></span>
                    <span className="text-red-600">Absent: <strong>{absentCount}</strong></span>
                  </div>
                </div>

                {canMark && (
                <div className="px-4 py-2 border-b border-amber-100 flex items-center gap-2 flex-wrap bg-stone-50">
                  <label className="flex items-center gap-2 text-sm cursor-pointer mr-2">
                    <input type="checkbox"
                      checked={selectedUserIds.size === enrolledUsers.length && enrolledUsers.length > 0}
                      onChange={toggleSelectAll} />
                    Select All
                  </label>
                  <button onClick={() => markSelected(true)} disabled={selectedUserIds.size === 0}
                    className="px-3 py-1 text-xs bg-green-100 text-green-800 border border-green-300 rounded hover:bg-green-200 disabled:opacity-40">
                    ✓ Mark Present
                  </button>
                  <button onClick={() => markSelected(false)} disabled={selectedUserIds.size === 0}
                    className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-40">
                    ✗ Mark Absent
                  </button>
                </div>
                )}
                {!canMark && selectedClassID && (
                  <div className="px-4 py-2 border-b border-amber-100 bg-yellow-50 text-yellow-800 text-xs">
                    View only — only the class instructor or an Admin can mark attendance.
                  </div>
                )}

                <div className="max-h-[360px] overflow-y-auto">
                  {enrolledUsers.length === 0 ? (
                    <p className="p-6 text-center text-stone-400 text-sm">No students enrolled in this session.</p>
                  ) : (
                    enrolledUsers.map((u) => {
                      const attended = !!pendingMap[u.id];
                      const isSelected = selectedUserIds.has(u.id);
                      return (
                        <div key={u.id}
                          className={`flex items-center justify-between px-4 py-2.5 border-b border-amber-50 last:border-0 transition-colors ${
                            isSelected ? 'bg-amber-50' : 'hover:bg-stone-50'
                          }`}>
                          <label className="flex items-center gap-3 flex-1 cursor-pointer">
                            {canMark && <input type="checkbox" checked={isSelected} onChange={() => toggleSelectUser(u.id)} />}
                            <span className="text-sm">{u.Name}</span>
                          </label>
                          {canMark ? (
                            <button onClick={() => toggleIndividual(u.id)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                attended
                                  ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                                  : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                              }`}>
                              {attended ? '✓ Present' : '✗ Absent'}
                            </button>
                          ) : (
                            <span className={`px-3 py-1 rounded text-xs font-medium ${
                              attended ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-600'
                            }`}>
                              {attended ? '✓ Present' : '✗ Absent'}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {canMark && (
                <div className="px-4 py-3 border-t border-amber-200 bg-stone-50 flex justify-end gap-2">
                  <button onClick={handleCancel} disabled={!isDirty}
                    className="px-4 py-2 border rounded-lg text-sm hover:bg-stone-100 disabled:opacity-40">Cancel</button>
                  <button onClick={handleUpdate} disabled={saving}
                    className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800 disabled:opacity-50 flex items-center gap-2">
                    {saving && <Spinner className="text-white" />}
                    {saving ? 'Saving...' : 'Update Attendance'}
                  </button>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
