export type Role = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

export interface Court {
  id: number;
  name: string;
  sport: string;
  hourlyPriceCents: number;
  openHour: number;
  closeHour: number;
  isActive: boolean;
}

export type SlotStatus = 'available' | 'booked' | 'mine' | 'past';

export interface Slot {
  startHour: number;
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
}

export interface CourtAvailability {
  court: Court;
  slots: Slot[];
}

export interface DayAvailability {
  date: string;
  courts: CourtAvailability[];
}

export interface Booking {
  id: number;
  courtId: number;
  courtName: string;
  courtSport: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  status: 'confirmed' | 'cancelled';
  cancelledAt: string | null;
}

export interface MyBooking extends Booking {
  canCancel: boolean;
}

export interface AdminBooking extends Booking {
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
}

export interface AdminDay {
  date: string;
  bookings: AdminBooking[];
  confirmedCount: number;
  totalRevenueCents: number;
}

export interface AppConfig {
  facilityTimezone: string;
  cancellationWindowHours: number;
}
