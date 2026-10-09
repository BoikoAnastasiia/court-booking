export type Role = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
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

export interface Availability {
  court: Court;
  date: string;
  slots: Slot[];
}

export interface Booking {
  id: number;
  courtId: number;
  courtName: string;
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
