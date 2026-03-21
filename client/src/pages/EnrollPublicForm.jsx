// src/pages/EnrollPublicForm.jsx
// This page is PUBLIC — no login required
// Accessed via: /enroll?token=abc123

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EnrollPublicForm() {
  const [params]  = useSearchParams();
  const token     = params.get('token');

  const [sessionInfo, setSessionInfo] = useState(null);
  const [status, setStatus]           = useState('loading'); // loading | valid | expired | invalid | submitted | error
  const [errorMsg, setErrorMsg]       = useState('');

  const [form, setForm] = useState({ Name: '', Age: '', Email: '', Phone: '' });
  const [saving, setSaving] = useState(false);

  // Validate token on load
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    fetch(`/api/enrollment-invites/public/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStatus(data.error.includes('expired') ? 'expired' : 'invalid');
        } else {
          setSessionInfo(data);
          setStatus('valid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Name.trim())  { alert('Name is required.'); return; }
    if (!form.Email.trim()) { alert('Email is required.'); return; }
    if (!form.Phone.trim()) { alert('Phone is required.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/enrollment-invites/public/${token}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          Name:  form.Name.trim(),
          Age:   form.Age ? parseInt(form.Age) : null,
          Email: form.Email.trim(),
          Phone: form.Phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Submission failed.');
        setStatus('error');
      } else {
        setStatus('submitted');
      }
    } catch (e) {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // ── States ──────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-stone-500">Verifying enrollment link...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <Screen icon="⏰" title="Link Expired"
        message="This enrollment link has expired (links are valid for 24 hours). Please contact your admin or manager for a new link." />
    );
  }

  if (status === 'invalid') {
    return (
      <Screen icon="🚫" title="Invalid Link"
        message={errorMsg || "This enrollment link is not valid or has been deactivated. Please contact your admin or manager."} />
    );
  }

  if (status === 'submitted') {
    return (
      <Screen icon="✅" title="Request Submitted!"
        message={`Your enrollment request for "${sessionInfo?.SessionName}" has been submitted successfully. An admin will review and approve it shortly. You will be notified once approved.`}
        success />
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-red-700 mb-2">Submission Error</h2>
          <p className="text-stone-500 text-sm mb-4">{errorMsg}</p>
          <button onClick={() => setStatus('valid')}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Main Form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-700 rounded-full mb-3">
            <span className="text-white text-2xl">🪷</span>
          </div>
          <h1 className="text-2xl font-bold text-amber-900">ISKCON BYC</h1>
          <p className="text-stone-500 text-sm mt-1">Student Enrollment Form</p>
        </div>

        {/* Session Info Card */}
        <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 mb-6 text-sm">
          <p className="text-amber-900 font-semibold text-base mb-1">{sessionInfo?.SessionName}</p>
          <p className="text-stone-600">{sessionInfo?.ClassType}</p>
          {sessionInfo?.StartDate && (
            <p className="text-stone-500 mt-1 text-xs">
              {formatDate(sessionInfo.StartDate)}
              {sessionInfo.EndDate ? ` — ${formatDate(sessionInfo.EndDate)}` : ''}
            </p>
          )}
          <p className="text-amber-700 text-xs mt-2 font-medium">
            ⏱ Link expires: {formatDate(sessionInfo?.ExpiresAt)}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-md border border-amber-100 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">Fill in your details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-600 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. Radha Krishnan Das"
                value={form.Name}
                onChange={(e) => setForm({ ...form, Name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">Age</label>
              <input
                type="number"
                min={5} max={100}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. 22"
                value={form.Age}
                onChange={(e) => setForm({ ...form, Age: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="you@example.com"
                value={form.Email}
                onChange={(e) => setForm({ ...form, Email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. 9876543210"
                value={form.Phone}
                onChange={(e) => setForm({ ...form, Phone: e.target.value })}
              />
            </div>

            {/* Read-only session name */}
            <div>
              <label className="block text-sm text-stone-600 mb-1">Session</label>
              <input
                type="text"
                readOnly
                className="w-full border border-stone-100 rounded-lg px-3 py-2.5 text-sm bg-stone-50 text-stone-500 cursor-not-allowed"
                value={sessionInfo?.SessionName || ''}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-amber-700 text-white rounded-lg py-3 text-sm font-medium hover:bg-amber-800 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              )}
              {saving ? 'Submitting...' : 'Submit Enrollment Request'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Your information will only be used for ISKCON BYC class enrollment purposes.
        </p>
      </div>
    </div>
  );
}

// ── Reusable status screen ────────────────────────────────────
function Screen({ icon, title, message, success }) {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${success ? 'bg-green-100' : 'bg-amber-100'}`}>
          <span className="text-3xl">{icon}</span>
        </div>
        <h2 className={`text-xl font-bold mb-3 ${success ? 'text-green-700' : 'text-amber-900'}`}>{title}</h2>
        <p className="text-stone-500 text-sm leading-relaxed">{message}</p>
        <div className="mt-6 text-xs text-stone-400">
          <span className="font-semibold">ISKCON BYC</span> · Student Management
        </div>
      </div>
    </div>
  );
}
