function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgres://courts:courts@localhost:5433/courts'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtExpiresInSeconds: 12 * 60 * 60,
  // All opening hours and slot times are interpreted in this zone.
  facilityTimezone: required('FACILITY_TIMEZONE', 'Europe/Madrid'),
  cancellationWindowHours: 2,
};
