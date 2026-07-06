import useAuthStore from '@/store/authStore'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://10.10.0.4:9090',
  timeout: 50000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  
  // Só adiciona o token se NÃO for uma rota de autenticação pública
  const isPublicRoute = config.url?.includes('/auth/login') || 
                        config.url?.includes('/auth/register') ||
                        config.url?.includes('/auth/verify-email') ||
                        config.url?.includes('/auth/resend-code')
  
  if (token && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Só faz logout e redireciona se NÃO for uma rota de autenticação
    const isAuthRoute = err.config?.url?.includes('/auth/login') || 
                        err.config?.url?.includes('/auth/register') ||
                        err.config?.url?.includes('/auth/verify-email') ||
                        err.config?.url?.includes('/auth/resend-code')
    
    // Se for 401 e NÃO for rota de autenticação
    if (err.response?.status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout()
      window.location.href = '/auth/login'
    }
    
    return Promise.reject(err)
  }
)

export default api