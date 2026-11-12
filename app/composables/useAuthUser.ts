export interface GoogleUser {
  sub: string
  name: string
  picture: string
  email: string
}

export const useAuthUser = () => useState<GoogleUser | null>('authUser', () => null)

export function loadAuthUser() {
  if (import.meta.client) {
    localStorage.removeItem('google_user')
    localStorage.removeItem('google_token')
    const raw = sessionStorage.getItem('google_user')
    useAuthUser().value = raw ? JSON.parse(raw) : null
  }
}

export function clearAuthUser() {
  if (import.meta.client) {
    sessionStorage.removeItem('google_user')
    sessionStorage.removeItem('google_token')
  }
  useAuthUser().value = null
}