import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/rooms':        'Gestão de Quartos',
  '/reservations': 'Reservas',
  '/tickets':      'Tickets de Suporte',
  '/policies':     'Políticas do Hotel',
  '/reports':      'Relatórios',
  '/users':        'Utilizadores',
  '/profile':      'Meu Perfil',
}

export default function AppLayout() {
  const loc = useLocation()
  const title = pageTitles[loc.pathname] ?? 'Hotel PMS'

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
