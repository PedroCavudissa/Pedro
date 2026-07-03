// src/pages/reception/AtendimentoPage.tsx
import { useQuery } from '@tanstack/react-query'
import { reservationsApi, roomsApi } from '@/api/services'
import { PageSpinner } from '@/components/ui'
import { BedDouble, CalendarCheck2, LogIn, LogOut, Users, Clock } from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/utils'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export default function AtendimentoPage() {
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list().then(r => r.data)
  })

  const { data: reservations = [], isLoading: resLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.list().then(r => r.data)
  })

  if (roomsLoading || resLoading) return <PageSpinner />

  const today = new Date().toISOString().split('T')[0]

  const todayCheckIns = reservations.filter(r =>
    r.status === 'confirmed' && r.checkIn?.split('T')[0] === today
  ).length

  const todayCheckOuts = reservations.filter(r =>
    r.status === 'checked_in' && r.checkOut?.split('T')[0] === today
  ).length

  const availableRooms = rooms.filter(r => r.state === 'VACANT_CLEAN').length
  const occupiedRooms = rooms.filter(r => r.state === 'OCCUPIED').length
  const totalRooms = rooms.length

  const stats = [
    { label: 'Check-ins Hoje', value: todayCheckIns, icon: LogIn, color: 'bg-green-100 text-green-700' },
    { label: 'Check-outs Hoje', value: todayCheckOuts, icon: LogOut, color: 'bg-orange-100 text-orange-700' },
    { label: 'Quartos Disponíveis', value: availableRooms, icon: BedDouble, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Quartos Ocupados', value: occupiedRooms, icon: Users, color: 'bg-blue-100 text-blue-700' },
  ]

  const upcomingReservations = reservations
    .filter(r => r.status === 'confirmed' && new Date(r.checkIn) >= new Date())
    .slice(0, 5)
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#001E3D]">Atendimento</h1>
        <p className="text-sm text-slate-500 mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-[#001E3D]">{value}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Próximas reservas */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Próximas Reservas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Hóspede</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Quarto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Check-in</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {upcomingReservations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                    Nenhuma reserva futura
                  </td>
                </tr>
              ) : (
                upcomingReservations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-700">{r.guest?.name || '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">#{r.room?.number}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{formatDate(r.checkIn)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-[#001E3D]">{formatCurrency(r.totalPrice)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status dos quartos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Status dos Quartos</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rooms.slice(0, 12).map((room: any) => (
              <div key={room.id} className={cn(
                'p-3 rounded-xl text-center border transition-all',
                room.state === 'VACANT_CLEAN' ? 'bg-emerald-50 border-emerald-200' :
                  room.state === 'OCCUPIED' ? 'bg-blue-50 border-blue-200' :
                    'bg-yellow-50 border-yellow-200'
              )}>
                <p className="font-bold text-sm">#{room.number}</p>
                <p className="text-[10px] font-medium mt-1">
                  {room.state === 'VACANT_CLEAN' ? 'Disponível' :
                    room.state === 'OCCUPIED' ? 'Ocupado' : 'Sujo'}
                </p>
              </div>
            ))}
          </div>
          {rooms.length > 12 && (
            <p className="text-center text-xs text-slate-400 mt-4">
              +{rooms.length - 12} quartos
            </p>
          )}
        </div>
      </div>
    </div>
  )
}