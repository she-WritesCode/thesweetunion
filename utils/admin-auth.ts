export function adminAuthHeaders(): Record<string, string> {
  if (import.meta.server) return {};
  const token = window.localStorage.getItem("dyrected_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
