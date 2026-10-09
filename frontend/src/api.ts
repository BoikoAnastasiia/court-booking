import type { AdminDay, AppConfig, Booking, Court, DayAvailability, MyBooking, User } from './types';

const TOKEN_KEY = 'court-booking.token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Called when the API says our token is no longer valid. */
let onUnauthorized: () => void = () => undefined;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  // FormData sets its own multipart Content-Type (with boundary).
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const err = (data as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

const q = (params: Record<string, string>) => `?${new URLSearchParams(params).toString()}`;

export type CourtInput = Omit<Court, 'id'>;

export const api = {
  config: () => request<AppConfig>('GET', '/config'),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/auth/login', { email, password }),
  me: () => request<User>('GET', '/auth/me'),

  updateProfile: (name: string) => request<User>('PATCH', '/users/me', { name }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return request<User>('PUT', '/users/me/avatar', form);
  },
  removeAvatar: () => request<User>('DELETE', '/users/me/avatar'),

  courts: () => request<Court[]>('GET', '/courts'),
  dayAvailability: (date: string, sport: string) =>
    request<DayAvailability>('GET', `/courts/availability${q({ date, sport })}`),
  createCourt: (input: CourtInput) => request<Court>('POST', '/courts', input),
  updateCourt: (id: number, input: Partial<CourtInput>) => request<Court>('PATCH', `/courts/${id}`, input),

  myBookings: () => request<{ upcoming: MyBooking[]; past: MyBooking[] }>('GET', '/bookings/me'),
  createBooking: (input: { courtId: number; date: string; startHour: number; durationHours: 1 | 2 }) =>
    request<Booking>('POST', '/bookings', input),
  cancelBooking: (id: number) => request<Booking>('POST', `/bookings/${id}/cancel`),

  adminDay: (date: string) => request<AdminDay>('GET', `/admin/bookings${q({ date })}`),
};
