import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, CheckCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/services'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || localStorage.getItem('email_verificacao') || ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(true)
  const [error, setError] = useState('')
  const [verificationSuccess, setVerificationSuccess] = useState(false)

  useEffect(() => {
    if (!email) {
      toast.error('Email não encontrado. Faça o registo novamente.')
      navigate('/register')
    }
  }, [email, navigate])

  // Timer para reenvio
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (!canResend && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setCanResend(true)
      setTimeLeft(60)
    }
    return () => clearInterval(timer)
  }, [canResend, timeLeft])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      nextInput?.focus()
    }

    // Clear error when typing
    if (error) setError('')
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleVerify = async () => {
    const verificationCode = code.join('')
    if (verificationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos')
      return
    }

    setLoading(true)
    setError('')

    try {
      await authApi.verifyEmail(email, verificationCode)
      setVerificationSuccess(true)
      localStorage.removeItem('email_verificacao')
      toast.success('Email verificado com sucesso!')

      setTimeout(() => {
        navigate('/auth/login')
      }, 2000)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Código inválido ou expirado'
      setError(message)
      toast.error(message)
      setCode(['', '', '', '', '', ''])
      document.getElementById('code-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!canResend) return

    setResendLoading(true)
    try {
      await authApi.resendVerificationCode(email)
      setCanResend(false)
      setTimeLeft(60)
      toast.success('Novo código enviado! Verifique seu email.')
      setCode(['', '', '', '', '', ''])
      setError('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao reenviar código')
    } finally {
      setResendLoading(false)
    }
  }

  if (verificationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#001E3D] mb-2">Email Verificado!</h2>
          <p className="text-gray-600 mb-6">
            Sua conta foi ativada com sucesso. Agora pode fazer login.
          </p>
          <Link
            to="/auth/login"
            className="block w-full bg-[#001E3D] hover:bg-[#002d5c] text-white py-3 rounded-xl font-medium transition-colors"
          >
            Ir para o Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/auth/register')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#001E3D] transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao registo
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#001E3D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#001E3D]" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#001E3D] mb-2">Verifique seu email</h1>
            <p className="text-sm text-gray-600">
              Enviamos um código de verificação para
            </p>
            <p className="text-sm font-semibold text-[#001E3D] mt-1">{email}</p>
          </div>

          <div className="space-y-6">
            {/* Código de 6 dígitos */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-4 text-center">
                Código de verificação
              </label>
              <div className="flex justify-center gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border ${error
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#001E3D]'
                      } bg-white focus:outline-none focus:ring-1 focus:ring-[#001E3D] transition-all shadow-sm`}
                    disabled={loading}
                  />
                ))}
              </div>
              {error && (
                <p className="text-xs text-red-500 text-center mt-3">{error}</p>
              )}
            </div>

            {/* Botão Verificar */}
            <button
              onClick={handleVerify}
              disabled={loading || code.join('').length !== 6}
              className="w-full bg-[#001E3D] hover:bg-[#002d5c] text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  A verificar...
                </span>
              ) : (
                'Verificar código'
              )}
            </button>

            {/* Reenviar código */}
            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={resendLoading || !canResend}
                className="text-sm text-[#001E3D] hover:text-[#002d5c] font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                <RefreshCw size={14} className={resendLoading ? 'animate-spin' : ''} />
                {resendLoading
                  ? 'A enviar...'
                  : !canResend
                    ? `Reenviar em ${timeLeft}s`
                    : 'Reenviar código'}
              </button>
            </div>

            <div className="text-center text-xs text-gray-400">
              <p>Não recebeu o código? Verifique a pasta de spam.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}