import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BedDouble, CalendarCheck2, Ticket,
  ScrollText, BarChart3, Users, LogOut,
  X, Hotel, ChevronRight,
  LogIn,
  User
} from 'lucide-react'

import { useUIStore } from '@/store/uiStore'
import { useRole } from '@/hooks/useRole'
import { authApi } from '@/api/services'
import { cn } from '@/utils'
import useAuthStore from '@/store/authStore'

type Role = 'ADMIN' | 'RECEPTION' | 'CLIENT'

type NavItem = {
  to: string
  icon: React.ElementType
  label: string
  roles: Role[]
}

const nav: NavItem[] = [
  // ADMIN
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN'] },

  { to: '/users', icon: Users, label: 'Utilizadores', roles: ['ADMIN'] },
  
  // ADMIN e RECEPTION
  { to: '/rooms', icon: BedDouble, label: 'Quartos', roles: ['ADMIN', 'RECEPTION'] },
  { to: '/reservations', icon: CalendarCheck2, label: 'Reservas', roles: ['ADMIN', 'RECEPTION','CLIENT'] },

  { to: '/tickets', icon: Ticket, label: 'Tickets', roles: ['ADMIN', 'RECEPTION'] },
  { to: '/policies', icon: ScrollText, label: 'Políticas', roles: ['ADMIN', 'RECEPTION'] },
  
  // CLIENT
 
  { to: '/cliente/quartos', icon: BedDouble, label: 'Quartos', roles: ['CLIENT'] },
  { to: '/tickets', icon: Ticket, label: 'Meus Tickets', roles: ['CLIENT'] },
  
  // Todos
  { to: '/profile', icon: User, label: 'Perfil', roles: ['ADMIN', 'RECEPTION', 'CLIENT'] },
     { to: '/reports', icon: BarChart3, label: 'Relatórios', roles: ['ADMIN'] },
]

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepcionista',
  CLIENT: 'Cliente',
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { can } = useRole()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    if(confirm('Tem certeza que deseja sair?')) {
      logout()
      navigate('/auth/login')
    }
  }

  const visibleNav = nav.filter(n => can(n.roles))

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col bg-[#001E3D] text-white transition-transform duration-300 w-[280px]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:flex'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-[#D4AF37] rounded-xl flex items-center justify-center">
            <Hotel size={18} className="text-[#001E3D]" />
          </div>
          <div>
            <p className="font-serif text-base font-semibold text-white leading-tight">PEDRO HOTEL</p>
            <p className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Management</p>
          </div>
          <button onClick={toggleSidebar} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 lg:hidden transition-colors">
            <X size={16} className="text-white/70" />
          </button>
        </div>

   

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-body font-medium text-sm transition-all duration-150',
                isActive ? 'bg-[#D4AF37] text-[#001E3D]' : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer mb-1"
            onClick={() => navigate('/profile')}>
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#001E3D] text-sm font-semibold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
            <ChevronRight size={14} className="text-white/40 flex-shrink-0" />
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors text-sm font-medium">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  )
}