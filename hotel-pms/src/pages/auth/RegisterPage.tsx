import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Hotel, ArrowLeft, Eye, EyeOff, User, Mail, Lock, Trash2 } from 'lucide-react'
import { authApi } from '@/api/services'
import toast from 'react-hot-toast'

// Chave para armazenar no localStorage
const REGISTER_CACHE_KEY = "hotel_register_cache"

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Carregar dados do cache ao montar o componente
  useEffect(() => {
    const cachedData = localStorage.getItem(REGISTER_CACHE_KEY)
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData)
        setForm(parsedData)
        toast.success('Dados do formulário recuperados', { duration: 2000 })
      } catch (error) {
        console.error('Erro ao carregar cache:', error)
      }
    }
  }, [])

  // Salvar dados no cache sempre que o formulário mudar
  useEffect(() => {
    if (form.name || form.email || form.password) {
      localStorage.setItem(REGISTER_CACHE_KEY, JSON.stringify(form))
    }
  }, [form])

  // Limpar cache
  const clearCache = () => {
    localStorage.removeItem(REGISTER_CACHE_KEY)
    setForm({ name: '', email: '', password: '', confirmPassword: '' })
    toast.success('Cache limpo com sucesso')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (form.password !== form.confirmPassword) { 
      toast.error('As passwords não coincidem')
      return 
    }
    
    if (form.password.length < 8) {
      toast.error('A password deve ter pelo menos 8 caracteres')
      return
    }
    
    setLoading(true)
    try {
      const res = await authApi.register({ 
        name: form.name, 
        email: form.email, 
        password: form.password 
      })
      
      // Limpa o cache após cadastro bem sucedido
      localStorage.removeItem(REGISTER_CACHE_KEY)
      
      // Salva o email para usar na página de verificação
      localStorage.setItem('email_verificacao', form.email)
      
      // Redireciona para página de verificação
      navigate('/verify-email', { 
        state: { email: form.email, justRegistered: true }
      })
      
      toast.success('Conta criada! Verifique seu email para ativar a conta.', {
        duration: 5000
      })
    } catch (err: any) {
      const message = err.response?.data?.message ?? err.response?.data?.error ?? 'Erro ao registar'
      toast.error(message)
    } finally { 
      setLoading(false) 
    }
  }

  // Impedir copiar, cortar e colar nos campos de senha
  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
      e.preventDefault()
      toast.error('Não é permitido copiar a senha', { icon: '🔒' })
    }
  }

  const handlePasswordPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    toast.error('Não é permitido colar a senha', { icon: '🔒' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
      <div className="w-full max-w-lg animate-fadeIn">
        {/* Botão Voltar e Limpar Cache */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/auth/login')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#001E3D] transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para o Login
          </button>
          
          {/* Botão para limpar cache */}
          {localStorage.getItem(REGISTER_CACHE_KEY) && (
            <button
              type="button"
              onClick={clearCache}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} />
              Limpar dados
            </button>
          )}
        </div>

        {/* Logo e Título */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#001E3D] rounded-xl flex items-center justify-center shadow-md">
              <Hotel size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl font-bold text-[#001E3D]">Criar Conta</span>
                {localStorage.getItem(REGISTER_CACHE_KEY) && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    💾 Rascunho salvo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">Preencha os dados para se registar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">
                Nome completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:border-[#001E3D] focus:ring-1 focus:ring-[#001E3D] transition-all text-sm shadow-sm"
                  placeholder="João Silva"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:border-[#001E3D] focus:ring-1 focus:ring-[#001E3D] transition-all text-sm shadow-sm"
                  placeholder="joao@hotel.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:border-[#001E3D] focus:ring-1 focus:ring-[#001E3D] transition-all text-sm shadow-sm"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={handlePasswordKeyDown}
                  onCopy={handlePasswordPaste}
                  onCut={handlePasswordPaste}
                  onPaste={handlePasswordPaste}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo de 8 caracteres
              </p>
            </div>

            {/* Confirmar Password */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">
                Confirmar password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200/80 bg-white focus:outline-none focus:border-[#001E3D] focus:ring-1 focus:ring-[#001E3D] transition-all text-sm shadow-sm"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  onKeyDown={handlePasswordKeyDown}
                  onCopy={handlePasswordPaste}
                  onCut={handlePasswordPaste}
                  onPaste={handlePasswordPaste}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão Submit */}
            <button 
              type="submit" 
              className="w-full bg-[#001E3D] hover:bg-[#002d5c] text-white py-3 rounded-xl font-medium tracking-wide transition-all shadow-md text-sm disabled:opacity-50 mt-6" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  A registar...
                </span>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Link para Login */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link to="/auth/login" className="text-[#001E3D] hover:text-[#002d5c] font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}