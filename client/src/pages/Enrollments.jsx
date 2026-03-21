// src/pages/Enrollments.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Spinner } from '../components/UI';
import DataTable from '../components/DataTable';

const formatDate     = (d) => d ? new Date(d).toLocaleDateString('en-IN',  { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN',      { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function QRCode({ url, size = 180 }) {
  if (!url) return null;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  return <img src={src} alt="QR Code" className="rounded-lg border border-amber-200 mx-auto" width={size} height={size} />;
}

function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m remaining`);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span className={remaining === 'Expired' ? 'text-red-500' : 'text-amber-700'}>{remaining}</span>;
}

export default function Enrollments() {
  const [tab, setTab]               = useState('enrollments');
  const [classTypes, setClassTypes] = useState([]);
  const [sessions, setSessions]     = useState([]);
  const [users, setUsers]           = useState([]);
  const [classTypeID, setClassTypeID] = useState('');
  const [sessionID, setSessionID]   = useState('');
  const [hasLoaded, setHasLoaded]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [modal, setModal]           = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm]             = useState({ ClassTypeID: '', SessionID: '', userID: '', EnrolledByUserID: '', StartDate: '', EndDate: '' });

  useEffect(() => {
    Promise.all([api.classTypes.list(), api.classSessions.list(), api.users.list()])
      .then(([types, sess, u]) => { setClassTypes(types); setSessions(sess); setUsers(u); })
      .catch(console.error)
      .finally(() => setInitLoading(false));
  }, []);

  const filterSession = (ctId) => sessions.filter(s => String(s.ClassTypeID) === String(ctId));

  const fetchEnrollments = useCallback((params) => {
    return api.sessionEnrollments.list(classTypeID, sessionID, null, params);
  }, [classTypeID, sessionID]);

  const fetchPending = useCallback((params) => {
    return api.enrollmentInvites.listPending(classTypeID, sessionID, null, params);
  }, [classTypeID, sessionID]);

  const fetchInvites = useCallback((params) => {
    return api.enrollmentInvites.list(classTypeID, sessionID, params);
  }, [classTypeID, sessionID]);

  const applyFilter = () => {
    if (!classTypeID || !sessionID) { alert('Please select both a Class Type and a Session.'); return; }
    setHasLoaded(true);
    setRefreshKey(k => k + 1);
  };

  const generateLink = async () => {
    if (!classTypeID || !sessionID) { alert('Please select a Class Type and Session first.'); return; }
    setSaving(true);
    try {
      const data = await api.enrollmentInvites.create({ ClassTypeID: classTypeID, SessionID: sessionID });
      const url = `${window.location.origin}/enroll?token=${data.Token}`;
      setGeneratedLink({ ...data, url });
      setModal('link');
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const copyLink = (url) => { navigator.clipboard.writeText(url); alert('Link copied!'); };

  const deactivateLink = async (id) => {
    if (!confirm('Deactivate this link?')) return;
    try { await api.enrollmentInvites.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  const approvePending = async (id) => {
    setSaving(true);
    try {
      await api.enrollmentInvites.approveEnrollment(id);
      alert('Approved! Student account created and enrolled.');
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const rejectPending = async (id) => {
    if (!confirm('Reject this enrollment request?')) return;
    try { await api.enrollmentInvites.rejectEnrollment(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  const openEnroll = () => {
    const ct = classTypeID || classTypes[0]?.id;
    setForm({ ClassTypeID: ct, SessionID: (sessionID || filterSession(ct)[0]?.SessionID) ?? '', userID: '', EnrolledByUserID: '', StartDate: '', EndDate: '' });
    setModal('enroll');
  };

  const saveEnroll = async () => {
    if (!form.userID) { alert('Please select a student.'); return; }
    setSaving(true);
    try {
      await api.sessionEnrollments.create({ ClassTypeID: form.ClassTypeID, SessionID: form.SessionID, userID: form.userID, EnrolledByUserID: form.EnrolledByUserID || null, StartDate: form.StartDate || null, EndDate: form.EndDate || null });
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Remove this enrollment?')) return;
    try { await api.sessionEnrollments.delete(id); setRefreshKey(k => k + 1); }
    catch (e) { alert(e.message); }
  };

  const selectedSession = sessions.find(s => String(s.ClassTypeID) === String(classTypeID) && String(s.SessionID) === String(sessionID));

  if (initLoading) return <p className="text-stone-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-amber-900">Session Enrollments</h1>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-end gap-3 flex-wrap bg-white border border-amber-200 rounded-lg p-4">
        <div className="min-w-[200px] max-w-xs">
          <label className="block text-xs text-stone-500 mb-1">Class Type</label>
          <select className="w-full border rounded px-3 py-2 text-sm"
            value={classTypeID}
            onChange={(e) => { setClassTypeID(e.target.value); setSessionID(''); setHasLoaded(false); }}>
            <option value="">— Select —</option>
            {classTypes.map(t => <option key={t.id} value={t.id}>{t.ClassType}</option>)}
          </select>
        </div>
        <div className="min-w-[240px] max-w-sm">
          <label className="block text-xs text-stone-500 mb-1">Session</label>
          <select className="w-full border rounded px-3 py-2 text-sm"
            value={sessionID} disabled={!classTypeID}
            onChange={(e) => { setSessionID(e.target.value); setHasLoaded(false); }}>
            <option value="">— Select —</option>
            {filterSession(classTypeID).map(s => (
              <option key={s.id} value={s.SessionID}>Session {s.SessionID}: {s.SessionName}</option>
            ))}
          </select>
        </div>
        <button onClick={applyFilter}
          className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800">
          Load
        </button>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button onClick={generateLink} disabled={!classTypeID || !sessionID || saving}
            className="px-4 py-2 border-2 border-amber-700 text-amber-700 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-40 flex items-center gap-2">
            {saving ? <Spinner className="text-amber-700" /> : '🔗'} Generate Enrollment Link
          </button>
          <button onClick={openEnroll} disabled={!classTypeID || !sessionID}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-40 text-sm">
            + Enroll Student
          </button>
        </div>
      </div>

      {/* Info bar */}
      {selectedSession && hasLoaded && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm flex gap-4 flex-wrap items-center">
          <span className="font-medium text-amber-900">{classTypes.find(t => String(t.id) === String(classTypeID))?.ClassType}</span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-700">Session {selectedSession.SessionID}: <strong>{selectedSession.SessionName}</strong></span>
        </div>
      )}

      {!hasLoaded ? (
        <div className="bg-white rounded-lg border border-amber-200 p-12 text-center text-stone-400">
          <p className="text-lg mb-2">Select Class Type and Session to view enrollments</p>
          <p className="text-sm">Use the filters above, then click Load</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-amber-200">
            {[
              { id: 'enrollments', label: 'Enrollments' },
              { id: 'pending',     label: 'Pending Approval' },
              { id: 'links',       label: 'Invite Links' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? 'border-amber-700 text-amber-800' : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Enrollments Tab ── */}
          {tab === 'enrollments' && (
            <DataTable
              fetchData={fetchEnrollments}
              refreshKey={refreshKey}
              emptyMessage="No enrollments yet."
              columns={[
                { key: 'UserName', label: 'Student', sortable: true, filterable: true, cellClass: 'font-medium' },
                { key: 'StartDate', label: 'Start Date', sortable: true, render: (v) => formatDate(v) },
                { key: 'EndDate', label: 'End Date', sortable: true, render: (v) => formatDate(v) },
                { key: 'createdAt', label: 'Enrolled At', sortable: true, render: (v) => <span className="text-stone-500 text-xs">{formatDateTime(v)}</span> },
                { key: 'EnrolledByName', label: 'Enrolled By', sortable: true, filterable: true },
                { key: '_actions', label: 'Actions',
                  render: (_, row) => (
                    <button onClick={(e) => { e.stopPropagation(); del(row.id); }} className="text-red-600 hover:underline text-sm">Remove</button>
                  ),
                },
              ]}
            />
          )}

          {/* ── Pending Approvals Tab ── */}
          {tab === 'pending' && (
            <DataTable
              fetchData={fetchPending}
              refreshKey={refreshKey}
              emptyMessage="No pending approvals."
              columns={[
                { key: 'Name', label: 'Name', sortable: true, filterable: true, cellClass: 'font-medium' },
                { key: 'Email', label: 'Email', sortable: true, filterable: true },
                { key: 'Phone', label: 'Phone', filterable: true },
                { key: 'Age', label: 'Age', sortable: true },
                { key: 'createdAt', label: 'Submitted At', sortable: true, render: (v) => <span className="text-xs text-stone-500">{formatDateTime(v)}</span> },
                { key: '_actions', label: 'Actions',
                  render: (_, row) => (
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); approvePending(row.id); }}
                        className="px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded text-xs hover:bg-green-200">
                        ✓ Approve
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); rejectPending(row.id); }}
                        className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs hover:bg-red-100">
                        ✗ Reject
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* ── Invite Links Tab ── */}
          {tab === 'links' && (
            <DataTable
              fetchData={fetchInvites}
              refreshKey={refreshKey}
              emptyMessage="No invite links generated yet."
              columns={[
                { key: 'CreatedByName', label: 'Created By', sortable: true, filterable: true },
                { key: 'createdAt', label: 'Created At', sortable: true, render: (v) => <span className="text-xs text-stone-500">{formatDateTime(v)}</span> },
                { key: 'ExpiresAt', label: 'Time Left', render: (v) => <span className="text-xs"><Countdown expiresAt={v} /></span> },
                { key: 'IsActive', label: 'Status', sortable: true,
                  render: (_, row) => {
                    const expired = new Date() > new Date(row.ExpiresAt);
                    if (!row.IsActive) return <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full text-xs">Deactivated</span>;
                    if (expired) return <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">Expired</span>;
                    return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Active</span>;
                  },
                },
                { key: '_actions', label: 'Actions',
                  render: (_, row) => {
                    const url = `${window.location.origin}/enroll?token=${row.Token}`;
                    const expired = new Date() > new Date(row.ExpiresAt);
                    return (
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={(e) => { e.stopPropagation(); copyLink(url); }} className="px-2 py-1 text-xs border rounded hover:bg-stone-50">Copy</button>
                        <button onClick={(e) => { e.stopPropagation(); setGeneratedLink({ ...row, url }); setModal('link'); }}
                          className="px-2 py-1 text-xs border rounded hover:bg-stone-50">QR</button>
                        {row.IsActive && !expired && (
                          <button onClick={(e) => { e.stopPropagation(); deactivateLink(row.id); }}
                            className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">Deactivate</button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          )}
        </>
      )}

      {/* ── Modal: Link + QR ── */}
      {modal === 'link' && generatedLink && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">🔗 Enrollment Link Generated</h2>
            <p className="text-sm text-stone-500 mb-4">Share with students. Multiple students can use this link within 24 hours.</p>
            <div className="bg-amber-50 rounded-lg px-4 py-3 mb-4 text-sm">
              <p className="font-medium text-amber-900">{generatedLink.SessionName || selectedSession?.SessionName}</p>
              <p className="text-xs text-amber-700 mt-1">⏱ Expires in 24 hours</p>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <input readOnly className="flex-1 border rounded-lg px-3 py-2 text-xs bg-stone-50 text-stone-600 truncate" value={generatedLink.url} />
              <button onClick={() => copyLink(generatedLink.url)}
                className="px-3 py-2 bg-amber-700 text-white rounded-lg text-xs hover:bg-amber-800 whitespace-nowrap">📋 Copy</button>
            </div>
            <div className="flex flex-col items-center gap-2 mb-4">
              <p className="text-xs text-stone-500">Or scan QR code</p>
              <QRCode url={generatedLink.url} size={180} />
            </div>
            <button onClick={() => setModal(null)} className="w-full px-4 py-2 border rounded-lg text-sm hover:bg-stone-50">Close</button>
          </div>
        </div>
      )}

      {/* ── Modal: Enroll Existing Student ── */}
      {modal === 'enroll' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Enroll Existing Student</h2>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Class Type</span>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.ClassTypeID}
                onChange={(e) => setForm({ ...form, ClassTypeID: e.target.value, SessionID: filterSession(e.target.value)[0]?.SessionID ?? '' })}>
                {classTypes.map(t => <option key={t.id} value={t.id}>{t.ClassType}</option>)}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Session</span>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.SessionID}
                onChange={(e) => setForm({ ...form, SessionID: e.target.value })}>
                <option value="">— Select —</option>
                {filterSession(form.ClassTypeID).map(s => (
                  <option key={s.id} value={s.SessionID}>Session {s.SessionID}: {s.SessionName}</option>
                ))}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Student</span>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.userID}
                onChange={(e) => setForm({ ...form, userID: e.target.value })}>
                <option value="">— Select Student —</option>
                {users.filter(u => u.Role === 'Students').map(u => (
                  <option key={u.id} value={u.id}>{u.Name}</option>
                ))}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-sm text-stone-600">Enrolled By</span>
              <select className="mt-1 w-full border rounded px-3 py-2" value={form.EnrolledByUserID}
                onChange={(e) => setForm({ ...form, EnrolledByUserID: e.target.value })}>
                <option value="">—</option>
                {users.filter(u => u.Role === 'Admin' || u.Role === 'Managers').map(u => (
                  <option key={u.id} value={u.id}>{u.Name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="block">
                <span className="text-sm text-stone-600">Start Date</span>
                <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                  value={form.StartDate} onChange={(e) => setForm({ ...form, StartDate: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm text-stone-600">End Date</span>
                <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                  value={form.EndDate} onChange={(e) => setForm({ ...form, EndDate: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={saveEnroll} disabled={saving}
                className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner className="text-white" />}
                {saving ? 'Saving...' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
