export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/') return navigateTo('/login')
  if (import.meta.server || to.path === '/login') return

  const token = sessionStorage.getItem('google_token')
  if (!token) return navigateTo('/login')
})  