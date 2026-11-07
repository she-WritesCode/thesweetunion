export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  const local = window.localStorage.getItem("dyrected_token");
  if (local) return local;
  const match = document.cookie.match(/(?:^|;\s*)(?:__dyrected_token|dyrected_token)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function adminAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
