import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Hotel, Eye, EyeOff, ArrowLeft, Mail, RefreshCw } from 'lucide-react'
import { authApi } from '@/api/services'

import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

// Declaração manual do tipo do Google para evitar erros
interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (element: HTMLElement, options: {
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    width?: number | string
  }) => void
  prompt: () => void
}

interface GoogleAccounts {
  id: GoogleAccountsId
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts
    }
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [verificationState, setVerificationState] = useState({
    show: false,
    email: '',
    sending: false,
    sent: false,
    countdown: 0
  })
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleGoogleSuccess = async (credential: string) => {
    if (!credential) {
      setGoogleLoading(false)
      return
    }

    setGoogleLoading(true)
    try {
      const res = await authApi.googleLogin({ token: credential })
      
      if (res.data?.user && res.data?.token) {
        setAuth(res.data.user, res.data.token)
        toast.success('Login com Google realizado com sucesso!')
        
        if (res.data.user.role === 'CLIENT' || res.data.user.role === 'RECEPTION') {
          navigate('/reservations')
        } else {
          navigate('/dashboard')
        }
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    } catch (err: any) {
      console.error('Erro no login Google:', err)
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Erro ao autenticar com Google'
      toast.error(message)
    } finally {
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    
    
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID não configurado no .env')
      toast.error('Configuração do Google incompleta')
      return
    }

    const initGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
       
        return
      } 
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          console.log('Callback Google recebido')
          handleGoogleSuccess(response.credential)
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: '100%',
      })
      
      console.log('Botão Google renderizado')
    }

    if (window.google?.accounts?.id) {
      initGoogleButton()
      return
    }

    const scriptId = 'google-identity-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        console.log('Script Google carregado')
        initGoogleButton()
      }
      script.onerror = () => {
        console.error('Falha ao carregar script Google')
      }
      document.body.appendChild(script)
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval)
          initGoogleButton()
        }
      }, 100)
      
      return () => clearInterval(checkInterval)
    }
  }, [])

  // Função para enviar link de verificação
  const handleSendVerificationLink = async () => {
    if (verificationState.sending || verificationState.sent) return
    
    setVerificationState(prev => ({ ...prev, sending: true }))
    
    try {
  
      //  FAZ A REQUISIÇÃO PARA REENVIAR VERIFICAÇÃO
      const response = await authApi.resendVerification({ 
        email: verificationState.email 
      })
      
    
      setVerificationState(prev => ({ 
        ...prev, 
        sent: true, 
        sending: false,
        countdown: 60
      }))
      
      toast.success(' Link de verificação enviado! Verifique seu email.')
      
      // Inicia countdown de 60 segundos
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      
      countdownIntervalRef.current = setInterval(() => {
        setVerificationState(prev => {
          if (prev.countdown <= 1) {
            clearInterval(countdownIntervalRef.current!)
            return { ...prev, countdown: 0, sent: false }
          }
          return { ...prev, countdown: prev.countdown - 1 }
        })
      }, 1000)
      
    } catch (err: any) {
      console.error(' Erro ao enviar verificação:', err)
      console.error(' Detalhes:', err.response?.data)
      
      const message = err.response?.data?.message || 
                      err.response?.data?.error || 
                      'Erro ao enviar link de verificação'
      toast.error(message)
      setVerificationState(prev => ({ ...prev, sending: false }))
    }
  }

  // Função para fechar o alerta
  const closeVerificationAlert = () => {
    setVerificationState(prev => ({ ...prev, show: false }))
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  // Limpar intervalos quando o componente desmontar
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.email.trim() || !form.password.trim()) {
      toast.error('Preencha todos os campos')
      return
    }
    
    setLoading(true)
    
    try {
      const res = await authApi.login(form)
      
      if (res.data?.user && res.data?.token) {
        setAuth(res.data.user, res.data.token)
        toast.success('Sessão iniciada com sucesso!')
        if(res.data.user.role === 'CLIENT' || res.data.user.role === 'RECEPTION') {
          navigate('/reservations')
        } else {
          navigate('/dashboard')
        }
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    } catch (err: any) {
      console.error('Erro no login:', err)
  
      const message = err.response?.data?.message || 
                      err.response?.data?.error || 
                      err.message || 
                      'Credenciais inválidas'
      
   
      
     
      if (message === "Conta não Verificada. Verifique o seu email para ativar a conta." ||
          message.toLowerCase().includes('verificada') ||
          message.toLowerCase().includes('verifique seu email')) {
        
     
        setVerificationState({
          show: true,
          email: form.email,
          sending: false,
          sent: false,
          countdown: 0
        })
        
        toast.error('Conta não verificada. Clique em "Enviar link" para receber a verificação.')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full grid grid-cols-1 lg:grid-cols-2 bg-[#FAF9F6]">
      {/* Left panel - Azul escuro PEDRO */}
      <div className="hidden lg:flex bg-[#001E3D] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hotel-bg.jpg')] bg-cover bg-center opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center">
              <Hotel size={20} className="text-[#001E3D]" />
            </div>
            <span className="font-serif text-xl font-semibold text-white">PEDRO HOTEL</span>
          </div>
        </div>
        <div className="relative z-10">
          <blockquote className="font-serif text-3xl font-medium text-white leading-snug mb-4">
            "Hospitalidade é a arte<br />de fazer-se sentir em casa."
          </blockquote>
          <p className="text-slate-300 text-sm">
            Sistema integrado de gestão para hotéis modernos.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          {['Reservas', 'Quartos', 'Relatórios', 'Tickets'].map(t => (
            <span key={t} className="px-3 py-1.5 bg-white/10 rounded-full text-xs text-slate-300">{t}</span>
          ))}
        </div>
      </div>

      {/* Right panel - Formulário */}
      <div className="flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-md animate-fadeIn">
          {/* Botão Voltar para Home */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#001E3D] transition-colors mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para o início
          </button>

          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#001E3D] rounded-xl flex items-center justify-center">
              <Hotel size={18} className="text-white" />
            </div>
            <span className="font-serif text-lg font-semibold text-[#001E3D]">PEDRO HOTEL</span>
          </div>

          <h1 className="font-serif text-3xl font-semibold text-[#001E3D] mb-2">Bem-vindo</h1>
          <p className="text-slate-500 text-sm mb-8">Entre na sua conta para continuar.</p>

   
          {verificationState.show && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Mail size={18} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800">
                    Conta não verificada
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Enviamos um email de verificação para <strong>{verificationState.email}</strong>.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    💡 Verifique sua caixa de entrada e a pasta de spam.
                  </p>
                  
               
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleSendVerificationLink}
                      disabled={verificationState.sending || verificationState.sent}
                      className={`
                        inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${verificationState.sending || verificationState.sent
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#001E3D] hover:bg-[#002d5c] text-white shadow-sm hover:shadow'
                        }
                      `}
                    >
                      {verificationState.sending ? (
                        <>
                          <Spinner size={16} className="text-white animate-spin" />
                          Enviando...
                        </>
                      ) : verificationState.sent ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Enviado! ({verificationState.countdown}s)
                        </>
                      ) : (
                        <>
                          <RefreshCw size={16} />
                          Enviar link de verificação
                        </>
                      )}
                    </button>
                    <button
                      onClick={closeVerificationAlert}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Fechar
                    </button>
                  </div>
                  
               
                  {verificationState.sent && (
                    <p className="text-xs text-green-600 mt-2">
                       Link enviado! Verifique seu email.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botão do Google */}
          <div 
            ref={googleButtonRef} 
            className="w-full"
            style={{ minHeight: '44px' }}
          />
          
          {googleLoading && (
            <div className="flex justify-center items-center gap-2 mt-3 text-sm text-slate-500">
              <Spinner size={18} className="text-[#001E3D] animate-spin" />
              <span>Autenticando com Google...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">Email</label>
              <input 
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:border-[#001E3D] focus:ring-1 focus:ring-[#001E3D] transition-all text-sm shadow-sm" 
                type="email" 
                placeholder="nome@hotel.com"
                value={form.email} 
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                disabled={loading || googleLoading}
                required 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input 
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:border-[#001E3D] focus:ring-1 focus:ring-[#001E3D] transition-all text-sm shadow-sm" 
                  type={showPw ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  disabled={loading || googleLoading}
                  required 
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw(!showPw)}
                  disabled={loading || googleLoading}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-sm text-[#D4AF37] hover:text-[#c5a32e] font-medium">
                Esqueceu a password?
              </Link>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-[#001E3D] hover:bg-[#002d5c] text-white py-3.5 rounded-xl font-medium tracking-wide transition-all shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading || googleLoading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size={16} className="text-white animate-spin" /> 
                  A entrar...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <Link to="/auth/register" className="text-[#001E3D] hover:text-[#002d5c] font-semibold transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}