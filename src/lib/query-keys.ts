/**
 * Query key factory (requirements §7). No inline string keys anywhere else.
 * Add one factory per feature as phases are implemented.
 */
export const healthKeys = {
  all: ['health'] as const,
  status: () => [...healthKeys.all, 'status'] as const,
};

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  sessions: () => [...authKeys.all, 'sessions'] as const,
};

export const adminKeys = {
  all: ['admin'] as const,
  session: () => [...adminKeys.all, 'session'] as const,
};
