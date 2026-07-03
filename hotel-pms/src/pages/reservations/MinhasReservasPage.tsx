// src/pages/client/MinhasReservasPage.tsx
import { useQuery } from '@tanstack/react-query'
import { reservationsApi } from '@/api/services'
import { PageSpinner } from '@/components/ui'
import { Calendar, BedDouble, MapPin, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/utils'
import useAuthStore from '@/store/authStore'

export default function MinhasReservasPage() {
  const { user } = useAuthStore()
  
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['minhas-reservas'],
    queryFn: () => reservationsApi.getMine().then(r => r.data)
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      checked_in: 'bg-blue-100 text-blue-700',
      checked_out: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmada',
      checked_in: 'Em andamento',
      checked_out: 'Concluída',
      cancelled: 'Cancelada',
      expired: 'Expirada',
    }
    return labels[status] || status
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#001E3D]">Minhas Reservas</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe o status das suas reservas</p>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Você ainda não possui reservas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation: any) => (
            <div key={reservation.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#001E3D]/10 flex items-center justify-center">
                    <BedDouble size={20} className="text-[#001E3D]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Quarto {reservation.room?.number}</p>
                    <p className="text-xs text-slate-500">{reservation.room?.type}</p>
                  </div>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-semibold w-fit', getStatusColor(reservation.status))}>
                  {getStatusLabel(reservation.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> Check-in
                  </p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(reservation.checkIn)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> Check-out
                  </p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(reservation.checkOut)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Users size={12} /> Hóspedes
                  </p>
                  <p className="text-sm font-medium text-slate-700">{reservation.adults || 1} adulto(s)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> Criada em
                  </p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(reservation.createdAt)}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-xl font-bold text-[#001E3D]">{formatCurrency(reservation.totalPrice)}</p>
                </div>
                {reservation.status === 'pending' && (
                  <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Fazer Pagamento
                  </button>
                )}
                {reservation.status === 'confirmed' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Reserva confirmada</span>
                  </div>
                )}
                {reservation.status === 'cancelled' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle size={16} />
                    <span className="text-sm font-medium">Reserva cancelada</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}