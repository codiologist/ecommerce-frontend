/**
 * Query key factory (requirements §7). No inline string keys anywhere else.
 * Add one factory per feature as phases are implemented.
 */
export const healthKeys = {
  all: ['health'] as const,
  status: () => [...healthKeys.all, 'status'] as const,
};
