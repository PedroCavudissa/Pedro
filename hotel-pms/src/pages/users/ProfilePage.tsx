import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, authApi } from '@/api/services'
import { PageSpinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Shield, ConciergeBell, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrador', RECEPTION: 'Recepção', CLIENT: 'Hóspede' }
const ROLE_COLOR: Record<string, string> = { ADMIN: 'bg-purple-100 text-purple-700', RECEPTION: 'bg-blue-100 text-blue-700', CLIENT: 'bg-stone-100 text-stone-600' }
const ROLE_ICON: Record<string, React.ElementType> = { ADMIN: Shield, RECEPTION: ConciergeBell, CLIENT: User }

export default function ProfilePage() {
  const qc = useQueryClient()
  const { setUser } = useAuthStore()
  const [nameForm, setNameForm] = useState({ name: '', email: '' })
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)

  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => usersApi.me().then(r => r.data) })

  useEffect(() => { if (me) setNameForm({ name: me.name, email: me.email }) }, [me])

  const updateMutation = useMutation({
    mutationFn: () => usersApi.updateMe({ name: nameForm.name }),
    onSuccess: (res) => { setUser(res.data); qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Perfil atualizado!') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro'),
  })

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { setPwForm({ oldPassword: '', newPassword: '', confirm: '' }); toast.success('Password alterada!') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao alterar password'),
  })

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('As passwords não coincidem'); return }
    changePwMutation.mutate()
  }

  if (isLoading) return <PageSpinner />
  if (!me) return null

  const RoleIcon = ROLE_ICON[me.role] ?? User

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl">
      <h1 className="page-title">Meu Perfil</h1>

      {/* Avatar + info card */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 flex items-center justify-center text-white text-2xl font-display font-semibold flex-shrink-0">
          {me.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-stone-900">{me.name}</h2>
          <p className="text-stone-500 text-sm">{me.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge ${ROLE_COLOR[me.role]}`}><RoleIcon size={11} />{ROLE_LABEL[me.role]}</span>
            <span className={`badge ${me.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {me.isActive ? '● Ativo' : '● Inativo'}
            </span>
            {me.isVerified && <span className="badge bg-blue-100 text-blue-700">✓ Verificado</span>}
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card">
        <h2 className="section-title mb-4">Editar Perfil</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={nameForm.name} onChange={e => setNameForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={nameForm.email} disabled className="input opacity-50 cursor-not-allowed" />
            <p className="text-xs text-stone-400 mt-1">O email não pode ser alterado.</p>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="section-title mb-4">Alterar Password</h2>
        <form onSubmit={handleChangePw} className="space-y-4">
          <div>
            <label className="label">Password Atual</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} value={pwForm.oldPassword} onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))} required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nova Password</label>
            <input className="input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Confirmar Nova Password</label>
            <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={changePwMutation.isPending}>
              {changePwMutation.isPending ? 'A alterar...' : 'Alterar Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
