import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, usersApi } from '@/api/services'
import { PageSpinner, EmptyState, ConfirmDialog } from '@/components/ui'
import { Users, Trash2, UserCheck, UserX, Search, Shield, ShieldAlert, User as UserIcon } from 'lucide-react'
import { cn, formatDate } from '@/utils'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  RECEPTION: 'bg-blue-100 text-blue-700',
  CLIENT: 'bg-stone-100 text-stone-600',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Receção',
  CLIENT: 'Cliente',
}

const ROLE_ICON: Record<string, any> = {
  ADMIN: ShieldAlert,
  RECEPTION: Shield,
  CLIENT: UserIcon,
}

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'ADMIN'
  const canManageUsers = isAdmin

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
    enabled: canManageUsers,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!canManageUsers) {
        toast.error('Apenas administradores podem eliminar utilizadores')
        return Promise.reject()
      }
      return usersApi.delete(id)
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['users'] }); 
      toast.success('Utilizador eliminado com sucesso') 
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao eliminar utilizador'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => {
      if (!canManageUsers) {
        toast.error('Apenas administradores podem alterar estado de utilizadores')
        return Promise.reject()
      }
      return active ? authApi.disableUser(id) : authApi.activateUser(id)
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['users'] }); 
      toast.success('Estado do utilizador atualizado') 
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao alterar estado'),
  })

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = !search || 
      u.name?.toLowerCase().includes(search.toLowerCase()) || 
      u.email?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const stats = [
    { label: 'Administradores', count: users.filter(u => u.role === 'ADMIN').length, color: 'text-purple-600', bg: 'bg-purple-50', icon: ShieldAlert },
    { label: 'Receção', count: users.filter(u => u.role === 'RECEPTION').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Shield },
    { label: 'Clientes', count: users.filter(u => u.role === 'CLIENT').length, color: 'text-stone-600', bg: 'bg-stone-50', icon: UserIcon },
    { label: 'Ativos', count: users.filter(u => u.isActive).length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: UserCheck },
  ]

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShieldAlert size={48} className="mx-auto text-red-300 mb-3" />
          <h2 className="text-lg font-semibold text-stone-700">Acesso Restrito</h2>
          <p className="text-sm text-stone-400 mt-1">
            Apenas administradores podem aceder à gestão de utilizadores.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="page-title">Utilizadores</h1>
        <p className="text-sm text-stone-400 mt-1">
          Gerir contas de acesso ao sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <Icon size={24} className={s.color} />
              <div>
                <p className={`text-2xl font-display font-semibold ${s.color}`}>{s.count}</p>
                <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input 
            className="input pl-9" 
            placeholder="Pesquisar por nome ou email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'all', l: 'Todos' },
            { v: 'ADMIN', l: 'Administradores' },
            { v: 'RECEPTION', l: 'Receção' },
            { v: 'CLIENT', l: 'Clientes' }
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setRoleFilter(f.v)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                roleFilter === f.v 
                  ? 'bg-stone-900 text-white' 
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              )}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={<Users size={48} />} 
          title="Sem utilizadores" 
          description="Nenhum utilizador encontrado com os filtros selecionados."
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="table-head text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Utilizador</th>
                  <th className="table-head text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="table-head text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Perfil</th>
                  <th className="table-head text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider hidden md:table-cell">Estado</th>
                  <th className="table-head text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider hidden lg:table-cell">Registado</th>
                  <th className="table-head text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const isCurrentUser = currentUser?.id === user.id
                  const RoleIcon = ROLE_ICON[user.role] || UserIcon
                  
                  return (
                    <tr key={user.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
                            ROLE_COLOR[user.role]
                          )}>
                            <RoleIcon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-800">{user.name}</p>
                            {!user.emailVerified && (
                              <span className="text-[10px] text-amber-600">Email não verificado</span>
                            )}
                          </div>
                        </div>
                       </td>
                      <td className="px-4 py-3 text-sm text-stone-500 hidden sm:table-cell">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ROLE_COLOR[user.role]}`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className={`badge w-fit ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                          {!user.emailVerified && (
                            <span className="badge w-fit bg-amber-100 text-amber-700">Não verificado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-400 hidden lg:table-cell">
                        {user.createdAt ? formatDate(user.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Botão Ativar/Desativar - não permite desativar o próprio usuário */}
                          {!isCurrentUser && (
                            <button
                              title={user.isActive ? 'Desativar utilizador' : 'Ativar utilizador'}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                user.isActive 
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              )}
                              onClick={() => toggleMutation.mutate({ id: user.id, active: user.isActive })}
                              disabled={toggleMutation.isPending}
                            >
                              {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          )}
                          
                          {/* Botão Eliminar - não permite eliminar o próprio usuário */}
                          {!isCurrentUser && (
                            <button
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              onClick={() => setDeleteId(user.id)}
                              disabled={deleteMutation.isPending}
                              title="Eliminar utilizador"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          
                          {/* Indicador para o próprio usuário */}
                          {isCurrentUser && (
                            <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                      </td>
                     </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Footer com total */}
          <div className="border-t border-stone-100 px-4 py-3 bg-stone-50/50">
            <p className="text-xs text-stone-500">
              Mostrando {filtered.length} de {users.length} utilizadores
            </p>
          </div>
        </div>
      )}

      {/* Confirm Dialog para eliminar */}
      <ConfirmDialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Eliminar utilizador" 
        message="Tem a certeza que pretende eliminar este utilizador? Esta ação não pode ser revertida." 
        danger 
      />
    </div>
  )
}