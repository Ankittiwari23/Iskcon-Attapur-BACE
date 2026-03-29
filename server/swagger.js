const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Page number (enables pagination)' },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
  { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across all searchable columns' },
  { name: 'sortBy', in: 'query', schema: { type: 'string' }, description: 'Column name to sort by' },
  { name: 'sortDir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
];

const errorRes = { description: 'Error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } };
const notFound = { description: 'Not found', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } };
const noContent = { description: 'Deleted' };

function idParam(name = 'id') {
  return { name, in: 'path', required: true, schema: { type: 'integer' } };
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'ISKCON BYC Student Management API',
    version: '1.0.0',
    description: 'API for managing students, classes, sessions, attendance, follow-ups, and enrollment.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Auth ─────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: { email: { type: 'string' }, password: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'JWT token + user info' }, 401: errorRes },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get current user from token', responses: { 200: { description: 'User object' }, 401: errorRes } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Logout (client deletes token)', responses: { 200: { description: 'OK' } } },
    },

    // ── Users ────────────────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'], summary: 'List users', parameters: [...paginationParams],
        responses: { 200: { description: 'Array or paginated result' }, 500: errorRes },
      },
      post: {
        tags: ['Users'], summary: 'Create user',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['Name'],
          properties: {
            Name: { type: 'string' }, Role: { type: 'string', enum: ['Admin', 'Managers', 'Students'] },
            Email: { type: 'string' }, Phone: { type: 'string' },
            isBACEDevotee: { type: 'boolean' }, JoinedDate: { type: 'string', format: 'date' },
            isActive: { type: 'boolean' }, MemberTypeID: { type: 'integer' },
            enrolledBY: { type: 'integer' }, MentorID: { type: 'integer' }, WebsiteRoleID: { type: 'integer' },
          },
        } } } },
        responses: { 201: { description: 'Created user' }, 500: errorRes },
      },
    },
    '/users/{id}': {
      get: { tags: ['Users'], summary: 'Get user by ID', parameters: [idParam()], responses: { 200: { description: 'User object' }, 404: notFound } },
      put: {
        tags: ['Users'], summary: 'Update user', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object',
          properties: { Name: { type: 'string' }, Role: { type: 'string' }, Email: { type: 'string' }, Phone: { type: 'string' }, isBACEDevotee: { type: 'boolean' }, JoinedDate: { type: 'string', format: 'date' }, isActive: { type: 'boolean' }, MemberTypeID: { type: 'integer' }, MentorID: { type: 'integer' }, WebsiteRoleID: { type: 'integer' } },
        } } } },
        responses: { 200: { description: 'Updated user' }, 404: notFound },
      },
      delete: { tags: ['Users'], summary: 'Delete user', parameters: [idParam()], responses: { 204: noContent, 404: notFound } },
    },
    '/users/{id}/detail': {
      get: { tags: ['Users'], summary: 'Get user details with enrollments and attendance %', parameters: [idParam()], responses: { 200: { description: 'User object + enrollments array with attendance stats' }, 404: notFound } },
    },
    '/users/{id}/set-password': {
      put: {
        tags: ['Users'], summary: 'Set password (Admin only)', parameters: [idParam()],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 6 } } } } } },
        responses: { 200: { description: 'Password updated' }, 400: errorRes, 404: notFound },
      },
    },

    // ── Member Types ─────────────────────────────────────────
    '/member-types': {
      get: { tags: ['Member Types'], summary: 'List member types', parameters: [...paginationParams], responses: { 200: { description: 'Array or paginated' } } },
      post: {
        tags: ['Member Types'], summary: 'Create member type',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { MemberTypeName: { type: 'string' } } } } } },
        responses: { 201: { description: 'Created' }, 500: errorRes },
      },
    },
    '/member-types/{id}': {
      get: { tags: ['Member Types'], summary: 'Get by ID', parameters: [idParam()], responses: { 200: { description: 'Member type' }, 404: notFound } },
      put: {
        tags: ['Member Types'], summary: 'Update', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { MemberTypeName: { type: 'string' } } } } } },
        responses: { 200: { description: 'Updated' }, 404: notFound },
      },
      delete: { tags: ['Member Types'], summary: 'Delete', parameters: [idParam()], responses: { 204: noContent, 404: notFound } },
    },

    // ── Website Roles ────────────────────────────────────────
    '/website-roles': {
      get: { tags: ['Website Roles'], summary: 'List website roles', parameters: [...paginationParams], responses: { 200: { description: 'Array or paginated' } } },
      post: {
        tags: ['Website Roles'], summary: 'Create (Admin only)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object',
          properties: { Name: { type: 'string' }, viewAdmin: { type: 'boolean' }, removeUser: { type: 'boolean' }, addUser: { type: 'boolean' }, markAttendance: { type: 'boolean' }, assignTasks: { type: 'boolean' }, updateSeva: { type: 'boolean' }, addSeva: { type: 'boolean' } },
        } } } },
        responses: { 201: { description: 'Created' }, 403: errorRes },
      },
    },
    '/website-roles/{id}': {
      get: { tags: ['Website Roles'], summary: 'Get by ID', parameters: [idParam()], responses: { 200: { description: 'Role' }, 404: notFound } },
      put: {
        tags: ['Website Roles'], summary: 'Update (Admin only)', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object',
          properties: { Name: { type: 'string' }, viewAdmin: { type: 'boolean' }, removeUser: { type: 'boolean' }, addUser: { type: 'boolean' }, markAttendance: { type: 'boolean' }, assignTasks: { type: 'boolean' }, updateSeva: { type: 'boolean' }, addSeva: { type: 'boolean' } },
        } } } },
        responses: { 200: { description: 'Updated' }, 403: errorRes, 404: notFound },
      },
      delete: { tags: ['Website Roles'], summary: 'Delete (Admin only)', parameters: [idParam()], responses: { 204: noContent, 403: errorRes, 404: notFound } },
    },

    // ── Iskcon Roles ─────────────────────────────────────────
    '/iskcon-roles': {
      get: { tags: ['Iskcon Roles'], summary: 'List iskcon roles', responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Iskcon Roles'], summary: 'Create',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { Designation: { type: 'string' } } } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/iskcon-roles/{id}': {
      get: { tags: ['Iskcon Roles'], summary: 'Get by ID', parameters: [idParam()], responses: { 200: { description: 'Role' }, 404: notFound } },
      put: {
        tags: ['Iskcon Roles'], summary: 'Update', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { Designation: { type: 'string' } } } } } },
        responses: { 200: { description: 'Updated' }, 404: notFound },
      },
      delete: { tags: ['Iskcon Roles'], summary: 'Delete', parameters: [idParam()], responses: { 204: noContent, 404: notFound } },
    },

    // ── Class Types ──────────────────────────────────────────
    '/class-types': {
      get: { tags: ['Class Types'], summary: 'List class types', parameters: [...paginationParams], responses: { 200: { description: 'Array or paginated' } } },
      post: {
        tags: ['Class Types'], summary: 'Create (Admin only)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ClassType: { type: 'string' }, currentActiveSession: { type: 'integer' } } } } } },
        responses: { 201: { description: 'Created' }, 403: errorRes },
      },
    },
    '/class-types/{id}': {
      get: { tags: ['Class Types'], summary: 'Get by ID', parameters: [idParam()], responses: { 200: { description: 'Class type' }, 404: notFound } },
      put: {
        tags: ['Class Types'], summary: 'Update (Admin only)', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { ClassType: { type: 'string' }, currentActiveSession: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Updated' }, 403: errorRes, 404: notFound },
      },
      delete: { tags: ['Class Types'], summary: 'Delete (Admin only)', parameters: [idParam()], responses: { 204: noContent, 403: errorRes, 404: notFound } },
    },

    // ── Class Sessions ───────────────────────────────────────
    '/class-sessions': {
      get: {
        tags: ['Class Sessions'], summary: 'List class sessions',
        parameters: [{ name: 'classTypeID', in: 'query', schema: { type: 'integer' } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
      post: {
        tags: ['Class Sessions'], summary: 'Create (Admin only)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ClassTypeID', 'SessionName'],
          properties: { ClassTypeID: { type: 'integer' }, SessionName: { type: 'string' }, StartDate: { type: 'string', format: 'date' }, EndDate: { type: 'string', format: 'date' }, SessionIncharge: { type: 'integer' } },
        } } } },
        responses: { 201: { description: 'Created' }, 403: errorRes },
      },
    },
    '/class-sessions/{id}': {
      get: { tags: ['Class Sessions'], summary: 'Get by ID', parameters: [idParam()], responses: { 200: { description: 'Session' }, 404: notFound } },
      put: {
        tags: ['Class Sessions'], summary: 'Update (Admin only)', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object',
          properties: { SessionName: { type: 'string' }, StartDate: { type: 'string', format: 'date' }, EndDate: { type: 'string', format: 'date' }, SessionIncharge: { type: 'integer' }, TotalEnrolled: { type: 'integer' }, TotalClasses: { type: 'integer' } },
        } } } },
        responses: { 200: { description: 'Updated' }, 403: errorRes, 404: notFound },
      },
      delete: { tags: ['Class Sessions'], summary: 'Delete (Admin only)', parameters: [idParam()], responses: { 204: noContent, 403: errorRes, 404: notFound } },
    },

    // ── Classes ──────────────────────────────────────────────
    '/classes': {
      get: {
        tags: ['Classes'], summary: 'List classes',
        parameters: [{ name: 'classTypeID', in: 'query', schema: { type: 'integer' } }, { name: 'sessionID', in: 'query', schema: { type: 'integer' } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
      post: {
        tags: ['Classes'], summary: 'Create class (Admin only) — also auto-creates FollowUp rows',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ClassTypeID', 'SessionID'],
          properties: { ClassTypeID: { type: 'integer' }, SessionID: { type: 'integer' }, ClassDescription: { type: 'string' }, isActive: { type: 'boolean' }, StartDate: { type: 'string', format: 'date' }, ClassInstructor: { type: 'integer' }, Remarks: { type: 'string' } },
        } } } },
        responses: { 201: { description: 'Created class' }, 403: errorRes },
      },
    },
    '/classes/{id}': {
      get: { tags: ['Classes'], summary: 'Get by ID', parameters: [idParam()], responses: { 200: { description: 'Class' }, 404: notFound } },
      put: {
        tags: ['Classes'], summary: 'Update (Admin only)', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object',
          properties: { ClassDescription: { type: 'string' }, isActive: { type: 'boolean' }, StartDate: { type: 'string', format: 'date' }, ClassInstructor: { type: 'integer' }, Remarks: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'Updated' }, 403: errorRes, 404: notFound },
      },
      delete: { tags: ['Classes'], summary: 'Delete (Admin only)', parameters: [idParam()], responses: { 204: noContent, 403: errorRes, 404: notFound } },
    },

    // ── Session Enrollments ──────────────────────────────────
    '/session-enrollments': {
      get: {
        tags: ['Session Enrollments'], summary: 'List enrollments',
        parameters: [{ name: 'classTypeID', in: 'query', schema: { type: 'integer' } }, { name: 'sessionID', in: 'query', schema: { type: 'integer' } }, { name: 'userID', in: 'query', schema: { type: 'integer' } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
      post: {
        tags: ['Session Enrollments'], summary: 'Enroll student — also auto-creates UserSignal + FollowUp rows',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ClassTypeID', 'SessionID', 'userID'],
          properties: { ClassTypeID: { type: 'integer' }, SessionID: { type: 'integer' }, userID: { type: 'integer' }, EnrolledByUserID: { type: 'integer' }, StartDate: { type: 'string', format: 'date' }, EndDate: { type: 'string', format: 'date' } },
        } } } },
        responses: { 201: { description: 'Created enrollment' } },
      },
    },
    '/session-enrollments/{id}': {
      delete: { tags: ['Session Enrollments'], summary: 'Delete enrollment', parameters: [idParam()], responses: { 204: noContent, 404: notFound } },
    },

    // ── Class Attendance ─────────────────────────────────────
    '/class-attendance': {
      get: {
        tags: ['Class Attendance'], summary: 'List attendance records',
        parameters: [{ name: 'classID', in: 'query', schema: { type: 'integer' } }, { name: 'userID', in: 'query', schema: { type: 'integer' } }, { name: 'classTypeID', in: 'query', schema: { type: 'integer' } }, { name: 'sessionID', in: 'query', schema: { type: 'integer' } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
      post: {
        tags: ['Class Attendance'], summary: 'Mark attendance (instructor/Admin only)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ClassID', 'ClassTypeID', 'SessionID', 'UserID', 'Attended'],
          properties: { ClassID: { type: 'integer' }, ClassTypeID: { type: 'integer' }, SessionID: { type: 'integer' }, UserID: { type: 'integer' }, Attended: { type: 'boolean' }, MarkedByUser: { type: 'integer' } },
        } } } },
        responses: { 201: { description: 'Created/updated' }, 403: errorRes },
      },
    },
    '/class-attendance/bulk': {
      post: {
        tags: ['Class Attendance'], summary: 'Bulk mark attendance (instructor/Admin) — also updates FollowUp results',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['records'],
          properties: { records: { type: 'array', items: { type: 'object',
            properties: { ClassID: { type: 'integer' }, ClassTypeID: { type: 'integer' }, SessionID: { type: 'integer' }, UserID: { type: 'integer' }, Attended: { type: 'boolean' }, MarkedByUser: { type: 'integer' } },
          } } },
        } } } },
        responses: { 201: { description: 'Array of results' }, 403: errorRes },
      },
    },
    '/class-attendance/{id}': {
      put: {
        tags: ['Class Attendance'], summary: 'Update attendance record (instructor/Admin)', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { Attended: { type: 'boolean' }, MarkedByUser: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Updated' }, 403: errorRes, 404: notFound },
      },
    },

    // ── Enrollment Invites ───────────────────────────────────
    '/enrollment-invites': {
      get: {
        tags: ['Enrollment Invites'], summary: 'List invites (Admin/Manager)',
        parameters: [{ name: 'ClassTypeID', in: 'query', schema: { type: 'integer' } }, { name: 'SessionID', in: 'query', schema: { type: 'integer' } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
      post: {
        tags: ['Enrollment Invites'], summary: 'Create invite link (Admin/Manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ClassTypeID', 'SessionID'],
          properties: { ClassTypeID: { type: 'integer' }, SessionID: { type: 'integer' } },
        } } } },
        responses: { 201: { description: 'Created invite with token' } },
      },
    },
    '/enrollment-invites/{id}': {
      delete: { tags: ['Enrollment Invites'], summary: 'Deactivate invite', parameters: [idParam()], responses: { 204: noContent } },
    },
    '/enrollment-invites/pending': {
      get: {
        tags: ['Enrollment Invites'], summary: 'List pending enrollments (Admin/Manager)',
        parameters: [{ name: 'ClassTypeID', in: 'query', schema: { type: 'integer' } }, { name: 'SessionID', in: 'query', schema: { type: 'integer' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
    },
    '/enrollment-invites/pending/{id}/approve': {
      post: { tags: ['Enrollment Invites'], summary: 'Approve pending enrollment', parameters: [idParam()], responses: { 200: { description: 'Approved' }, 404: notFound } },
    },
    '/enrollment-invites/pending/{id}/reject': {
      post: { tags: ['Enrollment Invites'], summary: 'Reject pending enrollment', parameters: [idParam()], responses: { 200: { description: 'Rejected' }, 404: notFound } },
    },
    '/enrollment-invites/public/{token}': {
      get: {
        tags: ['Enrollment Invites (Public)'], summary: 'Validate invite token (no auth)', security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Session info' }, 404: notFound, 410: errorRes },
      },
    },
    '/enrollment-invites/public/{token}/submit': {
      post: {
        tags: ['Enrollment Invites (Public)'], summary: 'Submit enrollment form (no auth)', security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['Name', 'Email', 'Phone'],
          properties: { Name: { type: 'string' }, Age: { type: 'integer' }, Email: { type: 'string' }, Phone: { type: 'string' } },
        } } } },
        responses: { 201: { description: 'Submitted' }, 404: notFound, 409: errorRes, 410: errorRes },
      },
    },

    // ── Follow Ups ───────────────────────────────────────────
    '/follow-ups': {
      get: {
        tags: ['Follow Ups'], summary: 'List follow-ups',
        parameters: [{ name: 'classTypeID', in: 'query', schema: { type: 'integer' } }, { name: 'sessionID', in: 'query', schema: { type: 'integer' } }, { name: 'classID', in: 'query', schema: { type: 'integer' } }, { name: 'mentorID', in: 'query', schema: { type: 'integer' } }, { name: 'studentID', in: 'query', schema: { type: 'integer' } }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
    },
    '/follow-ups/{id}': {
      put: {
        tags: ['Follow Ups'], summary: 'Update follow-up status/response', parameters: [idParam()],
        requestBody: { content: { 'application/json': { schema: { type: 'object',
          properties: { Status: { type: 'string', enum: ['no_response', 'call_not_attended', 'denied', 'confirmed'] }, Response: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'Updated' }, 404: notFound },
      },
    },
    '/follow-ups/dashboard': {
      get: {
        tags: ['Follow Ups'], summary: 'Aggregated follow-up stats',
        parameters: [{ name: 'mentorID', in: 'query', schema: { type: 'integer' }, description: 'Filter by mentor' }],
        responses: { 200: { description: 'Stats object with counts' } },
      },
    },
    '/follow-ups/manager-stats': {
      get: { tags: ['Follow Ups'], summary: 'Per-manager performance stats (Admin)', responses: { 200: { description: 'Array of manager stats' } } },
    },

    // ── User Signals ─────────────────────────────────────────
    '/user-signals': {
      get: {
        tags: ['User Signals'], summary: 'List user signals',
        parameters: [{ name: 'mentorID', in: 'query', schema: { type: 'integer' }, description: 'Filter by mentor' }, ...paginationParams],
        responses: { 200: { description: 'Array or paginated' } },
      },
    },
    '/user-signals/{userID}': {
      put: {
        tags: ['User Signals'], summary: 'Update signal color',
        parameters: [{ name: 'userID', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['Signal'],
          properties: { Signal: { type: 'string', enum: ['green', 'yellow', 'orange', 'red'] } },
        } } } },
        responses: { 200: { description: 'Updated' }, 404: notFound },
      },
    },
    '/user-signals/{userID}/toggle-followup': {
      put: {
        tags: ['User Signals'], summary: 'Toggle follow-up list membership (Admin)',
        parameters: [{ name: 'userID', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['IsInFollowUpList'],
          properties: { IsInFollowUpList: { type: 'boolean' } },
        } } } },
        responses: { 200: { description: 'Updated' }, 404: notFound },
      },
    },

    // ── Health ────────────────────────────────────────────────
    '/health': {
      get: { tags: ['Health'], summary: 'Health check', security: [], responses: { 200: { description: '{ ok: true }' } } },
    },
  },
};

export default spec;
