export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/user',
    FORGOT_PASSWORD: '/auth/password/forgot',
    RESET_PASSWORD: '/auth/password/reset',
    VERIFY_EMAIL: (id: string, hash: string) => `/auth/email/verify/${id}/${hash}`,
    RESEND_VERIFY: '/auth/email/resend',
    GOOGLE_TOKEN: '/auth/google/token',
    PUSH_TOKEN: '/auth/push-token',
    DELETE_ACCOUNT: '/auth/account/delete'
  },
  HOME: {
    INDEX: '/home',
    CALENDAR: '/home/calendar',
    EVENT: (id: number | string) => `/home/event/${id}`
  },
  FRONT: {
    SETTINGS: '/front/settings',
    CONTACT: '/front/contact',
    MEMBERS: '/front/members',
    MEMBER: (id: number | string) => `/front/members/${id}`
  },
  FILTER: {
    INDEX: '/filter',
    SUBJECTS_BY_CLASS: (classId: number | string) => `/filter/subjects/${classId}`,
    SEMESTERS_BY_SUBJECT: (subjectId: number | string) => `/filter/semesters/${subjectId}`,
    FILE_TYPES_BY_SEMESTER: (semesterId: number | string) => `/filter/file-types/${semesterId}`
  },
  CLASSES: {
    LIST: '/school-classes',
    SHOW: (id: number | string) => `/school-classes/${id}`
  },
  ARTICLES: {
    LIST: '/articles',
    SHOW: (id: number | string) => `/articles/${id}`,
    BY_CLASS: (gradeLevel: number | string) => `/articles/by-class/${gradeLevel}`,
    BY_KEYWORD: (keyword: string) => `/articles/by-keyword/${keyword}`,
    DOWNLOAD: (id: number | string) => `/articles/file/${id}/download`
  },
  POSTS: {
    LIST: '/posts',
    SHOW: (id: number | string) => `/posts/${id}`,
    INCREMENT_VIEW: (id: number | string) => `/posts/${id}/increment-view`
  },
  CATEGORIES: {
    LIST: '/categories',
    SHOW: (id: number | string) => `/categories/${id}`
  },
  FILES: {
    INFO: (id: number | string) => `/files/${id}/info`,
    INCREMENT_VIEW: (id: number | string) => `/files/${id}/increment-view`
  },
  COMMENTS: {
    LIST_PUBLIC: (database: string) => `/comments/${database}`,
    STORE: (database: string) => `/dashboard/comments/${database}`,
    DELETE: (database: string, id: number | string) => `/dashboard/comments/${database}/${id}`
  },
  NOTIFICATIONS: {
    LIST: '/dashboard/notifications',
    LATEST: '/dashboard/notifications/latest',
    MARK_READ: (id: number | string) => `/dashboard/notifications/${id}/read`,
    MARK_ALL_READ: '/dashboard/notifications/read-all',
    DELETE: (id: number | string) => `/dashboard/notifications/${id}`
  },
  LEGAL: {
    PRIVACY: '/legal/privacy-policy',
    TERMS: '/legal/terms-of-service',
    COOKIE: '/legal/cookie-policy',
    DISCLAIMER: '/legal/disclaimer'
  },
  KEYWORDS: {
    LIST: '/keywords',
    SHOW: (keyword: string) => `/keywords/${keyword}`
  }
};
