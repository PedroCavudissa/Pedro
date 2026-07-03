import React from 'react'
import { Menu, Bell } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import useAuthStore from '@/store/authStore'

interface TopbarProps { title?: string }

export default function Topbar({ title }: TopbarProps) {
  const { toggleSidebar } = useUIStore()
  const { user } = useAuthStore()

  return (
    <header className="h-16 bg-white border-b border-stone-100 flex items-center px-4 md:px-6 gap-4 sticky top-0 z-10">
      <button onClick={toggleSidebar}
        className="p-2 rounded-xl hover:bg-stone-100 transition-colors lg:hidden">
        <Menu size={20} className="text-stone-600" />
      </button>

      {title && (
        <h1 className="font-display text-lg font-semibold text-stone-900 hidden md:block">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-stone-100 transition-colors">
       
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center text-white text-sm font-semibold">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  )
}
