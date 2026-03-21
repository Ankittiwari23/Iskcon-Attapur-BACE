// src/api.js
const BASE = '/api';
const TOKEN_KEY = 'iskcon_token';

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
  if (!res.ok) {
    const msg = data.error || data.message || res.statusText;
    throw new Error(typeof msg === 'string' ? msg : res.statusText);
  }
  return data;
}

function appendPaginationParams(basePath, params) {
  const q = new URLSearchParams();
  const sep = basePath.includes('?') ? '&' : '?';
  if (params.page)     q.set('page', params.page);
  if (params.pageSize) q.set('pageSize', params.pageSize);
  if (params.search)   q.set('search', params.search);
  if (params.sortBy)   q.set('sortBy', params.sortBy);
  if (params.sortDir)  q.set('sortDir', params.sortDir);
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v?.trim()) q.set(`filter_${k}`, v);
    }
  }
  const qs = q.toString();
  return qs ? `${basePath}${sep}${qs}` : basePath;
}

export const api = {
  auth: {
    login:  (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me:     ()     => request('/auth/me'),
    logout: ()     => request('/auth/logout', { method: 'POST' }),
  },
  users: {
    list:        (params)    => params?.page ? request(appendPaginationParams('/users', params)) : request('/users'),
    get:         (id)        => request(`/users/${id}`),
    create:      (body)      => request('/users', { method: 'POST', body: JSON.stringify(body) }),
    update:      (id, body)  => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete:      (id)        => request(`/users/${id}`, { method: 'DELETE' }),
    setPassword: (id, body)  => request(`/users/${id}/set-password`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  memberTypes: {
    list:   (params)   => params?.page ? request(appendPaginationParams('/member-types', params)) : request('/member-types'),
    create: (body)     => request('/member-types', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/member-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)       => request(`/member-types/${id}`, { method: 'DELETE' }),
  },
  websiteRoles: {
    list:   (params)   => params?.page ? request(appendPaginationParams('/website-roles', params)) : request('/website-roles'),
    create: (body)     => request('/website-roles', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/website-roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)       => request(`/website-roles/${id}`, { method: 'DELETE' }),
  },
  iskconRoles: {
    list:   ()         => request('/iskcon-roles'),
    create: (body)     => request('/iskcon-roles', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/iskcon-roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)       => request(`/iskcon-roles/${id}`, { method: 'DELETE' }),
  },
  classTypes: {
    list:   (params)   => params?.page ? request(appendPaginationParams('/class-types', params)) : request('/class-types'),
    create: (body)     => request('/class-types', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/class-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)       => request(`/class-types/${id}`, { method: 'DELETE' }),
  },
  classSessions: {
    list: (classTypeID, params) => {
      const base = classTypeID ? `/class-sessions?classTypeID=${classTypeID}` : '/class-sessions';
      return params?.page ? request(appendPaginationParams(base, params)) : request(base);
    },
    create: (body)        => request('/class-sessions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body)    => request(`/class-sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)          => request(`/class-sessions/${id}`, { method: 'DELETE' }),
  },
  classes: {
    list: (classTypeID, sessionID, params) => {
      const q = [];
      if (classTypeID) q.push(`classTypeID=${classTypeID}`);
      if (sessionID)   q.push(`sessionID=${sessionID}`);
      const base = '/classes' + (q.length ? '?' + q.join('&') : '');
      return params?.page ? request(appendPaginationParams(base, params)) : request(base);
    },
    create: (body)     => request('/classes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)       => request(`/classes/${id}`, { method: 'DELETE' }),
  },
  sessionEnrollments: {
    list: (classTypeID, sessionID, userID, params) => {
      const q = [];
      if (classTypeID) q.push(`classTypeID=${classTypeID}`);
      if (sessionID)   q.push(`sessionID=${sessionID}`);
      if (userID)      q.push(`userID=${userID}`);
      const base = '/session-enrollments' + (q.length ? '?' + q.join('&') : '');
      return params?.page ? request(appendPaginationParams(base, params)) : request(base);
    },
    create: (body) => request('/session-enrollments', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id)   => request(`/session-enrollments/${id}`, { method: 'DELETE' }),
  },
  classAttendance: {
    list: (classID, userID, classTypeID, sessionID, params) => {
      const q = [];
      if (classID)     q.push(`classID=${classID}`);
      if (userID)      q.push(`userID=${userID}`);
      if (classTypeID) q.push(`classTypeID=${classTypeID}`);
      if (sessionID)   q.push(`sessionID=${sessionID}`);
      const base = '/class-attendance' + (q.length ? '?' + q.join('&') : '');
      return params?.page ? request(appendPaginationParams(base, params)) : request(base);
    },
    create:     (body)    => request('/class-attendance', { method: 'POST', body: JSON.stringify(body) }),
    bulkCreate: (records) => request('/class-attendance/bulk', { method: 'POST', body: JSON.stringify({ records }) }),
    update:     (id, body) => request(`/class-attendance/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  enrollmentInvites: {
    list: (ClassTypeID, SessionID, params) => {
      const q = [];
      if (ClassTypeID) q.push(`ClassTypeID=${ClassTypeID}`);
      if (SessionID)   q.push(`SessionID=${SessionID}`);
      const base = '/enrollment-invites' + (q.length ? '?' + q.join('&') : '');
      return params?.page ? request(appendPaginationParams(base, params)) : request(base);
    },
    listPending: (ClassTypeID, SessionID, status, params) => {
      const q = [];
      if (ClassTypeID) q.push(`ClassTypeID=${ClassTypeID}`);
      if (SessionID)   q.push(`SessionID=${SessionID}`);
      if (status)      q.push(`status=${status}`);
      const base = '/enrollment-invites/pending' + (q.length ? '?' + q.join('&') : '');
      return params?.page ? request(appendPaginationParams(base, params)) : request(base);
    },
    create: (body) => request('/enrollment-invites', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id)   => request(`/enrollment-invites/${id}`, { method: 'DELETE' }),
    approveEnrollment: (id) => request(`/enrollment-invites/pending/${id}/approve`, { method: 'POST' }),
    rejectEnrollment:  (id) => request(`/enrollment-invites/pending/${id}/reject`, { method: 'POST' }),
  },
};