import { browserRequest, safeBrowserRequest } from './browser';
import { request, type ApiResult, type RequestOptions } from './fetcher';
import type {
  AppNotification,
  AuthSessionUser,
  LandingData,
  MapResult,
  PlaceSuggestion,
  PrivateUser,
  Property,
  PropertyCard,
  PropertyDetailResponse,
  PublicUser,
  Review,
  Visit,
} from './types';

/**
 * Typed endpoint map — the single place where URLs live. Feature modules call
 * these functions, never `fetch` directly, so base URL, credentials, envelopes
 * and error shapes are handled once.
 */

export const endpoints = {
  search: '/search',
  propertyBySlug: (slug: string) => `/properties/${slug}`,
};

const json = (method: RequestOptions['method'], body: unknown): RequestOptions => ({
  method,
  body,
});

export const authApi = {
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: 'TENANT' | 'OWNER';
    phone?: string;
    acceptTerms: true;
  }): Promise<ApiResult<AuthSessionUser>> => browserRequest('/auth/register', json('POST', input)),

  login: (input: { email: string; password: string }): Promise<ApiResult<AuthSessionUser>> =>
    browserRequest('/auth/login', json('POST', input)),

  logout: (): Promise<ApiResult<void>> => browserRequest('/auth/logout', { method: 'POST' }),

  logoutAll: (): Promise<ApiResult<{ revoked: boolean }>> =>
    browserRequest('/auth/logout-all', { method: 'POST' }),

  me: (): Promise<ApiResult<{ user: PrivateUser }>> => browserRequest('/auth/me'),

  sessions: (): Promise<
    ApiResult<Array<{ id: string; userAgent: string | null; lastUsedAt: string; current: boolean }>>
  > => browserRequest('/auth/sessions'),
};

export const usersApi = {
  me: (): Promise<ApiResult<{ user: PrivateUser }>> => browserRequest('/users/me'),
  updateProfile: (input: Record<string, unknown>) =>
    browserRequest<{ user: PrivateUser }>('/users/me', json('PATCH', input)),
  publicProfile: (userId: string) => browserRequest<{ user: PublicUser }>(`/users/${userId}`),
};

export const searchApi = {
  search: (
    query: Record<string, string | number | boolean | string[] | undefined>,
    options: Omit<RequestOptions, 'query'> = {},
  ): Promise<ApiResult<PropertyCard[]>> =>
    request('/search', { query, cache: options.cache, next: options.next, signal: options.signal }),

  map: (
    query: Record<string, string | number | boolean | string[] | undefined>,
    options: Omit<RequestOptions, 'query'> = {},
  ): Promise<ApiResult<MapResult>> =>
    request('/search/map', {
      query,
      cache: options.cache,
      next: options.next,
      signal: options.signal,
    }),

  landing: (query: Record<string, string | undefined>, revalidateSeconds = 600) =>
    request<LandingData>('/search/landing', { query, next: { revalidate: revalidateSeconds } }),
};

export const propertiesApi = {
  detail: (slug: string, options: Omit<RequestOptions, 'query'> = {}) =>
    request<PropertyDetailResponse>(`/properties/${slug}`, {
      cache: options.cache,
      next: options.next,
      headers: options.headers,
      signal: options.signal,
    }),

  nearby: (query: { latitude: number; longitude: number; radiusMeters?: number; limit?: number }) =>
    browserRequest<PropertyCard[]>('/properties/nearby', { query }),

  mine: (query: { page?: number; limit?: number; listingStatus?: string; search?: string } = {}) =>
    browserRequest<Property[]>('/properties/mine', { query }),

  reserve: (propertyId: string, note?: string) =>
    browserRequest<{ property: Property }>(
      `/properties/id/${propertyId}/reserve`,
      json('POST', note ? { note } : {}),
    ),
};

export const locationsApi = {
  suggest: (q: string, limit = 8) =>
    browserRequest<PlaceSuggestion[]>('/locations/suggest', { query: { q, limit } }),
  cities: () => browserRequest<PlaceSuggestion[]>('/locations/cities'),
  city: (city: string) =>
    browserRequest<{ city: PlaceSuggestion; localities: PlaceSuggestion[] }>(
      `/locations/cities/${city}`,
    ),
  nearby: (query: { latitude: number; longitude: number; radiusMeters?: number; limit?: number }) =>
    browserRequest<
      Array<{ name: string; slug: string; type: string; distanceMeters: number; distanceLabel: string }>
    >('/locations/nearby', { query }),
};

export const favoritesApi = {
  list: (query: { page?: number; limit?: number } = {}) =>
    browserRequest<PropertyCard[]>('/favorites', { query }),
  /** Ids only — cheaper than a page of cards when the store just needs membership. */
  ids: () => browserRequest<{ ids: string[] }>('/favorites/ids'),
  add: (propertyId: string) =>
    browserRequest<{ favorited: boolean; created: boolean }>(`/favorites/${propertyId}`, {
      method: 'POST',
    }),
  remove: (propertyId: string) =>
    browserRequest<void>(`/favorites/${propertyId}`, { method: 'DELETE' }),
  check: (propertyId: string) =>
    browserRequest<{ isFavorited: boolean }>(`/favorites/check/${propertyId}`),
};

export const visitsApi = {
  request: (input: {
    propertyId: string;
    requestedDate: string;
    timeSlot: string;
    message?: string;
  }) => browserRequest<{ visit: Visit }>('/visits', json('POST', input)),
  mine: (query: { page?: number; limit?: number; status?: string } = {}) =>
    browserRequest<Visit[]>('/visits/mine', { query }),
  received: (query: { page?: number; limit?: number; status?: string } = {}) =>
    browserRequest<Visit[]>('/visits/received', { query }),
  act: (
    visitId: string,
    input: {
      action: 'accept' | 'reject' | 'reschedule' | 'complete' | 'cancel';
      note?: string;
      newDate?: string;
      newTimeSlot?: string;
    },
  ) => browserRequest<{ visit: Visit }>(`/visits/${visitId}`, json('PATCH', input)),
};

export const reviewsApi = {
  create: (input: { propertyId: string; rating: number; comment: string }) =>
    browserRequest<{ review: Review }>('/reviews', json('POST', input)),
  forProperty: (propertyId: string, query: { page?: number; limit?: number } = {}) =>
    browserRequest<Review[]>(`/reviews/property/${propertyId}`, { query }),
  mine: (query: { page?: number; limit?: number } = {}) =>
    browserRequest<Review[]>('/reviews/mine', { query }),
};

export const notificationsApi = {
  list: (query: { limit?: number; cursor?: string } = {}) =>
    browserRequest<AppNotification[]>('/notifications', { query }),
  unreadCount: () => browserRequest<{ unreadCount: number }>('/notifications/unread-count'),
  markAllRead: () =>
    browserRequest<{ updated: number }>('/notifications/read-all', { method: 'POST' }),
};

export async function currentUser(): Promise<PrivateUser | null> {
  const result = await safeBrowserRequest<{ user: PrivateUser }>('/users/me');
  return result.ok ? result.data.user : null;
}
