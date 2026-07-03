import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Hotel, ArrowLeft } from 'lucide-react'
import { authApi } from '@/api/services'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
      toast.success('Email de recuperação enviado!')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao enviar email')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <div className="w-full max-w-sm animate-fadeIn">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-gold-500 rounded-xl flex items-center justify-center">
            <Hotel size={18} className="text-white" />
          </div>
        </div>
        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="section-title mb-2">Email enviado!</h2>
              <p className="text-sm text-stone-500 mb-6">Verifique a sua caixa de correio para continuar.</p>
              <Link to="/auth/login" className="btn-primary inline-flex">Voltar ao login</Link>
            </div>
          ) : (
            <>
              <Link to="/auth/login" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-4 transition-colors">
                <ArrowLeft size={14} /> Voltar
              </Link>
              <h1 className="font-display text-2xl font-semibold text-stone-900 mb-1">Recuperar password</h1>
              <p className="text-stone-500 text-sm mb-6">Introduza o seu email para receber as instruções.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="nome@hotel.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                  {loading ? <span className="flex items-center justify-center gap-2"><Spinner size={16} className="text-white" />A enviar...</span> : 'Enviar email'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
