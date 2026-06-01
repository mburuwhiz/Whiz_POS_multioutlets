import { cookies } from 'next/headers';

export function getSessionDuration(): number {
  const envVar = process.env.SESSION_DURATION;
  if (!envVar) return 60 * 5; // Default 5 minutes

  const value = parseFloat(envVar);
  if (isNaN(value)) return 60 * 5;

  const unit = envVar.replace(/[0-9.]/g, '').toLowerCase().trim();

  switch (unit) {
    case 's':
    case 'sec':
    case 'second':
    case 'seconds':
      return value;
    case 'm':
    case 'min':
    case 'minute':
    case 'minutes':
      return value * 60;
    case 'h':
    case 'hr':
    case 'hour':
    case 'hours':
      return value * 60 * 60;
    case 'd':
    case 'day':
    case 'days':
      return value * 60 * 60 * 24;
    case 'mo':
    case 'month':
    case 'months':
      return value * 60 * 60 * 24 * 30;
    default:
      return 60 * 5;
  }
}

export function setSessionCookie(token: string) {
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: getSessionDuration()
  });
}

export function getSessionCookie() {
  return cookies().get('session')?.value;
}

export function clearSessionCookie() {
  cookies().delete('session');
}

export interface SessionData {
  businessId: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
  exp: number;
}

export function createSession(data: Omit<SessionData, 'exp'>): string {
  const session: SessionData = {
    ...data,
    exp: Date.now() + (getSessionDuration() * 1000)
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

export function parseSession(token: string): SessionData | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

export function isSessionExpired(session: SessionData): boolean {
  return Date.now() > session.exp;
}
