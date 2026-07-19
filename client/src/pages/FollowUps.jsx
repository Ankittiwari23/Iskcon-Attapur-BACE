import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: 'no_response',        label: 'No Response' },
  { value: 'call_not_attended',  label: 'Call Not Attended' },
  { value: 'denied',             label: 'Denied' },
  { value: 'confirmed',          label: 'Confirmed' },
];

const STATUS_COLORS = {
  no_response:       'bg-stone-100 text-stone-600',
  call_not_attended: 'bg-yellow-100 text-yellow-700',
  denied:            'bg-red-100 text-red-700',
  confirmed:         'bg-green-100 text-green-700',
};

const RESULT_BADGE = {
  attended: 'bg-green-500 text-white',
  missed:   'bg-red-500 text-white',
};

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

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function FollowUps() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Managers';

  const [classTypes, setClassTypes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCT, setSelectedCT] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [managerStats, setManagerStats] = useState([]);
  const [managerLoading, setManagerLoading] = useState(false);

  const [detailManager, setDetailManager] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({ Status: '', Response: '' });

  // Manager (mentor) view: student-grouped list + per-student dialog
  const [managerRows, setManagerRows] = useState([]);
  const [managerRowsLoading, setManagerRowsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Accordion: which student cards are expanded in the admin detail modal
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const toggleStudent = (id) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    api.classTypes.list().then(setClassTypes).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCT) {
      api.classSessions.list(selectedCT).then(data => {
        const list = Array.isArray(data) ? data : data.rows || [];
        setSessions(list.sort((a, b) => b.SessionID - a.SessionID));
      }).catch(console.error);
    } else {
      setSessions([]);
    }
    setSelectedSession('');
    setHasLoaded(false);
  }, [selectedCT]);

  const loadManagerRows = useCallback(() => {
    setManagerRowsLoading(true);
    api.followUps.list({ mentorID: user.id, classTypeID: selectedCT, sessionID: selectedSession })
      .then(data => setManagerRows(Array.isArray(data) ? data : data.rows || []))
      .catch(console.error)
      .finally(() => setManagerRowsLoading(false));
  }, [user?.id, selectedCT, selectedSession]);

  const applyFilter = () => {
    if (!selectedCT || !selectedSession) { alert('Please select both Class Type and Session.'); return; }
    setHasLoaded(true);
    setRefreshKey(k => k + 1);
    if (isAdmin) {
      setManagerLoading(true);
      api.followUps.managerStats(selectedCT, selectedSession)
        .then(setManagerStats)
        .catch(console.error)
        .finally(() => setManagerLoading(false));
    } else if (isManager) {
      loadManagerRows();
    }
  };

  const openManagerDetail = async (mgr) => {
    setDetailManager(mgr);
    setDetailLoading(true);
    setEditingRow(null);
    setExpandedStudents(new Set());
    try {
      const data = await api.followUps.list({
        mentorID: mgr.ManagerID,
        classTypeID: selectedCT,
        sessionID: selectedSession,
      });
      setDetailRows(Array.isArray(data) ? data : data.rows || []);
    } catch (e) { alert(e.message); }
    finally { setDetailLoading(false); }
  };

  const closeDetail = () => { setDetailManager(null); setEditingRow(null); };

  const startEdit = (row) => {
    setEditingRow(row.id);
    setEditForm({ Status: row.Status, Response: row.Response || '' });
  };

  const saveEdit = async (id) => {
    try {
      await api.followUps.update(id, editForm);
      setEditingRow(null);
      if (detailManager) {
        openManagerDetail(detailManager);
      }
      setRefreshKey(k => k + 1);
      if (isAdmin) {
        api.followUps.managerStats(selectedCT, selectedSession).then(setManagerStats).catch(console.error);
      } else if (isManager) {
        loadManagerRows();
      }
    } catch (e) { alert(e.message); }
  };

  const cancelEdit = () => setEditingRow(null);

  const groupByStudent = (rows) => {
    if (!rows?.length) return [];
    const map = {};
    for (const r of rows) {
      if (!map[r.StudentID]) {
        map[r.StudentID] = {
          StudentID: r.StudentID, StudentName: r.StudentName, Signal: r.Signal,
          totalClasses: parseInt(r.studentTotalClasses) || 0,
          attendedOverall: parseInt(r.studentAttended) || 0,
          classes: [],
        };
      }
      map[r.StudentID].classes.push(r);
    }
    return Object.values(map);
  };

  const groupedStudents = groupByStudent(detailRows);
  const managerStudents = groupByStudent(managerRows);

  // Keep the open student dialog in sync after edits reload the rows
  useEffect(() => {
    if (!selectedStudent) return;
    const fresh = managerStudents.find(s => s.StudentID === selectedStudent.StudentID);
    if (fresh) setSelectedStudent(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerRows]);

  // Renders a student's per-class follow-up table (shared by admin + manager dialogs)
  const renderStudentClasses = (student) => (
   <div className="overflow-x-auto">
    <table className="w-full text-xs min-w-[640px]">
      <thead className="bg-stone-50 text-left">
        <tr>
          <th className="px-4 py-1.5">Class</th>
          <th className="px-4 py-1.5">Date</th>
          <th className="px-4 py-1.5">Follow-Up</th>
          <th className="px-4 py-1.5">Response</th>
          <th className="px-4 py-1.5">Attended</th>
          <th className="px-4 py-1.5">Converted</th>
          <th className="px-4 py-1.5"></th>
        </tr>
      </thead>
      <tbody>
        {student.classes.map(r => {
          const converted = r.Status === 'confirmed' && r.AttendedResult === 'attended';
          const isEditing = editingRow === r.id;
          return (
            <tr key={r.id} className="border-t border-stone-100">
              <td className="px-4 py-2">{r.ClassDescription || `Class #${r.ClassID}`}</td>
              <td className="px-4 py-2">{formatDate(r.ClassDate)}</td>
              <td className="px-4 py-2">
                {isEditing ? (
                  <select className="border rounded px-1.5 py-0.5 text-xs" value={editForm.Status}
                    onChange={(e) => setEditForm(f => ({ ...f, Status: e.target.value }))}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.Status] || ''}`}>
                    {STATUS_OPTIONS.find(o => o.value === r.Status)?.label || r.Status}
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {isEditing ? (
                  <input className="border rounded px-1.5 py-0.5 text-xs w-full min-w-[100px]" value={editForm.Response}
                    onChange={(e) => setEditForm(f => ({ ...f, Response: e.target.value }))} placeholder="Details..." />
                ) : (
                  <span className="text-stone-600">{r.Response || '—'}</span>
                )}
              </td>
              <td className="px-4 py-2">
                {r.AttendedResult ? (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${RESULT_BADGE[r.AttendedResult] || ''}`}>
                    {r.AttendedResult === 'attended' ? 'Yes' : 'No'}
                  </span>
                ) : <span className="text-stone-400">Pending</span>}
              </td>
              <td className="px-4 py-2">
                {r.Status === 'confirmed' ? (
                  converted
                    ? <span className="px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Yes</span>
                    : r.AttendedResult
                      ? <span className="px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">No</span>
                      : <span className="text-stone-400">Pending</span>
                ) : <span className="text-stone-300">—</span>}
              </td>
              <td className="px-4 py-2">
                {isEditing ? (
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(r.id)} className="text-green-700 hover:underline">Save</button>
                    <button onClick={cancelEdit} className="text-stone-500 hover:underline">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(r)} className="text-amber-700 hover:underline">Edit</button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
   </div>
  );

  const StudentSummaryRow = ({ student, onView }) => {
    const pct = student.totalClasses > 0 ? Math.round(student.attendedOverall / student.totalClasses * 100) : 0;
    return (
      <tr className="border-t border-amber-100 hover:bg-amber-50 cursor-pointer" onClick={onView}>
        <td className="p-3 font-medium text-amber-900">{student.StudentName}</td>
        <td className="p-3">
          {student.Signal ? (
            <span className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${SIGNAL_COLORS[student.Signal] || 'bg-stone-300'}`} />
              <span className="text-xs">{SIGNAL_LABELS[student.Signal]}</span>
            </span>
          ) : <span className="text-xs text-stone-400">—</span>}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{student.attendedOverall}/{student.totalClasses}</span>
            <div className="w-16 bg-stone-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-stone-500">{pct}%</span>
          </div>
        </td>
        <td className="p-3 text-xs text-stone-500">{student.classes.length} class follow-up(s)</td>
        <td className="p-3"><button className="text-amber-700 hover:underline text-xs">View / Update</button></td>
      </tr>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-900 mb-4">Follow Ups</h1>

      <div className="mb-4 flex items-end gap-3 flex-wrap bg-white border border-amber-200 rounded-lg p-4">
        <div className="min-w-[200px] max-w-xs">
          <label className="block text-xs text-stone-500 mb-1">Class Type</label>
          <select className="w-full border rounded px-3 py-2 text-sm" value={selectedCT}
            onChange={(e) => { setSelectedCT(e.target.value); setSelectedSession(''); setHasLoaded(false); }}>
            <option value="">— Select —</option>
            {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.ClassType}</option>)}
          </select>
        </div>
        <div className="min-w-[240px] max-w-sm">
          <label className="block text-xs text-stone-500 mb-1">Session</label>
          <select className="w-full border rounded px-3 py-2 text-sm" value={selectedSession} disabled={!selectedCT}
            onChange={(e) => { setSelectedSession(e.target.value); setHasLoaded(false); }}>
            <option value="">— Select —</option>
            {sessions.map(s => <option key={s.id} value={s.SessionID}>Session {s.SessionID}: {s.SessionName}</option>)}
          </select>
        </div>
        <button onClick={applyFilter}
          className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800">
          Load
        </button>
      </div>

      {!hasLoaded ? (
        <div className="bg-white rounded-lg border border-amber-200 p-12 text-center text-stone-400">
          <p className="text-lg mb-2">Select Class Type and Session</p>
          <p className="text-sm">Use the filters above, then click Load</p>
        </div>
      ) : isAdmin ? (
        /* ── Admin View: Manager Performance Table ── */
        <div className="bg-white rounded-lg border border-amber-200 overflow-x-auto">
          {managerLoading ? (
            <div className="p-8 text-center text-stone-400">
              <div className="inline-block h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading manager stats...
            </div>
          ) : managerStats.length === 0 ? (
            <div className="p-8 text-center text-stone-400">No follow-up data for this session yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-amber-100 text-left">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Manager</th>
                  <th className="p-3">Mentees</th>
                  <th className="p-3">Follow-Ups</th>
                  <th className="p-3">Confirmed</th>
                  <th className="p-3">Attended</th>
                  <th className="p-3">Converted</th>
                  <th className="p-3">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {managerStats.map((ms, i) => (
                  <tr key={ms.ManagerID}
                    onClick={() => openManagerDetail(ms)}
                    className={`border-t border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors ${i < 3 ? 'bg-amber-50/50' : ''}`}>
                    <td className="p-3 font-medium">
                      {i < 3 && <span className="mr-1">{['🥇','🥈','🥉'][i]}</span>}
                      {i + 1}
                    </td>
                    <td className="p-3 font-medium text-amber-900">{ms.ManagerName}</td>
                    <td className="p-3">{ms.totalMentees}</td>
                    <td className="p-3">{ms.totalFollowUps}</td>
                    <td className="p-3">{ms.confirmed}</td>
                    <td className="p-3">{ms.attended}</td>
                    <td className="p-3">
                      <span className="font-medium">{ms.converted}</span>
                      <span className="text-stone-400 text-xs ml-1">/ {ms.confirmed}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ms.conversionRate >= 80 ? 'bg-green-100 text-green-700' :
                        ms.conversionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{ms.conversionRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="px-4 py-2 text-xs text-stone-400 border-t border-amber-100">
            Click on a manager to view student details
          </p>
        </div>
      ) : (
        /* ── Manager View: Student-grouped list ── */
        <div className="bg-white rounded-lg border border-amber-200 overflow-x-auto">
          {managerRowsLoading ? (
            <div className="p-8 text-center text-stone-400">
              <div className="inline-block h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading your students...
            </div>
          ) : managerStudents.length === 0 ? (
            <div className="p-8 text-center text-stone-400">No follow-ups for this session.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-amber-100 text-left">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attendance</th>
                  <th className="p-3">Follow-Ups</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {managerStudents.map(student => (
                  <StudentSummaryRow key={student.StudentID} student={student}
                    onView={() => setSelectedStudent(student)} />
                ))}
              </tbody>
            </table>
          )}
          <p className="px-4 py-2 text-xs text-stone-400 border-t border-amber-100">
            Click a student to view and update their follow-ups
          </p>
        </div>
      )}

      {/* ── Manager Detail Modal (Admin clicks a manager row) ── */}
      {detailManager && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10 p-4" onClick={closeDetail}>
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-amber-900">{detailManager.ManagerName}</h2>
                <p className="text-sm text-stone-500">
                  {detailManager.totalMentees} mentees · Conversion: {detailManager.conversionRate}%
                </p>
              </div>
              <button onClick={closeDetail} className="text-stone-400 hover:text-stone-600 text-xl">&times;</button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-stone-400">
                <div className="inline-block h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </div>
            ) : groupedStudents.length === 0 ? (
              <p className="text-stone-400 text-center py-8">No student data found.</p>
            ) : (
              <div className="space-y-3">
                {groupedStudents.map(student => {
                  const pct = student.totalClasses > 0 ? Math.round(student.attendedOverall / student.totalClasses * 100) : 0;
                  const isOpen = expandedStudents.has(student.StudentID);
                  return (
                    <div key={student.StudentID} className="border border-amber-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleStudent(student.StudentID)}
                        className="w-full bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-stone-400 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                          <span className="font-medium text-amber-900 truncate">{student.StudentName}</span>
                          {student.Signal && (
                            <span className="flex items-center gap-1 shrink-0">
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${SIGNAL_COLORS[student.Signal] || 'bg-stone-300'}`} />
                              <span className="text-xs text-stone-500 hidden sm:inline">{SIGNAL_LABELS[student.Signal]}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-stone-500 shrink-0">
                          <strong>{student.attendedOverall}/{student.totalClasses}</strong> ({pct}%)
                        </span>
                      </button>
                      {isOpen && renderStudentClasses(student)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Manager Student Detail Dialog ── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10 p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-amber-900">{selectedStudent.StudentName}</h2>
                {selectedStudent.Signal && (
                  <span className="flex items-center gap-1">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${SIGNAL_COLORS[selectedStudent.Signal] || 'bg-stone-300'}`} />
                    <span className="text-xs text-stone-500">{SIGNAL_LABELS[selectedStudent.Signal]}</span>
                  </span>
                )}
                <span className="text-xs text-stone-500">
                  Attendance: <strong>{selectedStudent.attendedOverall}/{selectedStudent.totalClasses}</strong>
                </span>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-stone-400 hover:text-stone-600 text-xl">&times;</button>
            </div>
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              {renderStudentClasses(selectedStudent)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
