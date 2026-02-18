const USER_KEY = "bens_kitchen_user";

interface User {
  name: string;
  fingerprint: string;
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(name: string): User {
  const existing = getUser();
  const user: User = {
    name,
    fingerprint: existing?.fingerprint || crypto.randomUUID(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
