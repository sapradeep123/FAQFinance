// Centralized authentication utility for services
// This provides a consistent way for all services to get the current auth token

export function getAuthToken(): string | null {
  // Try to get token from auth store first
  try {
    const authStore = localStorage.getItem('auth-store');
    if (authStore) {
      const parsed = JSON.parse(authStore);
      if (parsed.state?.token) {
        return parsed.state.token;
      }
    }
  } catch (error) {
    console.error('Error parsing auth-store:', error);
  }

  // Fallback to the old localStorage key
  try {
    const auth = localStorage.getItem('trae_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      if (parsed?.token) {
        return parsed.token;
      }
    }
  } catch (error) {
    console.error('Error parsing trae_auth:', error);
  }

  return null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

export function clearAuth(): void {
  localStorage.removeItem('auth-store');
  localStorage.removeItem('trae_auth');
}
