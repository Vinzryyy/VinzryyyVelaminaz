/* ── Auth ────────────────────────────────────────────────────────── */

// Day-rotating password hashes (Mon=0 … Sat=5); Sunday accepts all
export const DAILY_HASHES: string[] = [
  "c250b12c3b4c2a4229f5232d6590ad40b4a6d9957269ddb67eb94c4bffb01465", // Mon
  "2be1c838055405910e10bbb1191186eb52911f0a76b5022c7ac34e8c904b2643", // Tue
  "8ecf7dcf000e21ccd9dd76aee0c7d4d825a5350d7c1fb5e2a779b924337a0621", // Wed
  "f3b3d81590bf5f89ba1dd431b5d5b5c95ba235da2a1ad7ad23efa3a3ff0dddc9", // Thu
  "ee754fe93cd7ad96a42ef936645fd7402030f408c0d173bfa8098337188e6163", // Fri
  "f1cf1e3acc057506d55de1e2e3010f61184737de4a4a2dd827b8f99cd1dd40ab", // Sat
];

export function getValidHashes(): string[] {
  const day = new Date().getDay(); // 0=Sun,1=Mon…6=Sat
  if (day === 0) return DAILY_HASHES; // Sunday: all valid
  return [DAILY_HASHES[day - 1]];
}

export const AUTH_KEY = "vinzryyy-admin-auth";
export const LOCKOUT_KEY = "vinzryyy-admin-lockout";
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION = 2 * 60 * 1000; // 2 minutes

export async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getSessionToken(): string | null {
  const data = sessionStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    const { token, expires } = JSON.parse(data);
    if (Date.now() > expires) {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    return token;
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function setSessionToken() {
  const token = crypto.randomUUID();
  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ token, expires: Date.now() + SESSION_TIMEOUT }),
  );
}

export function refreshSession() {
  const data = sessionStorage.getItem(AUTH_KEY);
  if (!data) return;
  try {
    const parsed = JSON.parse(data);
    parsed.expires = Date.now() + SESSION_TIMEOUT;
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
  } catch { /* ignore */ }
}

export function getLockout(): { attempts: number; until: number } {
  try {
    const data = localStorage.getItem(LOCKOUT_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return { attempts: 0, until: 0 };
}

export function recordFailedAttempt() {
  const lock = getLockout();
  lock.attempts += 1;
  if (lock.attempts >= MAX_ATTEMPTS) {
    lock.until = Date.now() + LOCKOUT_DURATION;
    lock.attempts = 0;
  }
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lock));
}

export function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY);
}
