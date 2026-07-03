import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { usersApi, authApi } from '@/api/services'

import { PageSpinner } from '@/components/ui'
import { User, Lock, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepcionista',
  GUEST: 'Cliente',
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })

  const updateMutation = useMutation({
    mutationFn: () => usersApi.updateMe(form),
    onSuccess: (res) => { setUser(res.data); toast.success('Perfil atualizado!') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro'),
  })

  const pwMutation = useMutation({
    mutationFn: () => authApi.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { toast.success('Password alterada!'); setPwForm({ oldPassword: '', newPassword: '', confirm: '' }) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro'),
  })

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('As passwords não coincidem'); return }
    pwMutation.mutate()
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl">
      <h1 className="page-title">Meu Perfil</h1>

      {/* User card */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 flex items-center justify-center text-white text-2xl font-display font-semibold flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-stone-900">{user?.name}</h2>
          <p className="text-stone-500 text-sm">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="badge bg-stone-100 text-stone-700">
              <Shield size={11} /> {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
            </span>
            <span className={`badge ${user?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
              {user?.isActive ? 'Ativo' : 'Inativo'}
            </span>
            {user?.isVerified && <span className="badge bg-blue-100 text-blue-700">✓ Verificado</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
        {[{ v: 'info', l: 'Informações', icon: User }, { v: 'password', l: 'Password', icon: Lock }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            <t.icon size={15} /> {t.l}
          </button>
        ))}
      </div>

      {/* Info form */}
      {tab === 'info' && (
        <div className="card space-y-4">
          <h2 className="section-title">Informações Pessoais</h2>
          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* Password form */}
      {tab === 'password' && (
        <form className="card space-y-4" onSubmit={handlePwSubmit}>
          <h2 className="section-title">Alterar Password</h2>
          <div>
            <label className="label">Password atual</label>
            <input className="input" type="password" value={pwForm.oldPassword} onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Nova password</label>
            <input className="input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Confirmar nova password</label>
            <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={pwMutation.isPending}>
              {pwMutation.isPending ? 'A alterar...' : 'Alterar password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
