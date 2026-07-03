import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { reservationsApi, roomsApi, ticketsApi, reportsApi } from '@/api/services'
import { PageSpinner, LazyImage } from '@/components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BedDouble, CalendarCheck2, Ticket, TrendingUp, Users, Clock, Wrench, CheckCircle, AlertCircle, LogOut } from 'lucide-react'
import { formatCurrency } from '@/utils'
import { format, subDays, eachDayOfInterval, isSameDay, startOfDay, parseISO, isWithinInterval } from 'date-fns'
import { pt } from 'date-fns/locale'

// Mapeamentos de status
const roomStateMap: Record<string, string> = {
  'VACANT_CLEAN': 'Disponível',
  'VACANT_DIRTY': 'Sujo',
  'OCCUPIED': 'Ocupado',
  'MAINTENANCE': 'Manutenção'
}

const roomStateColor: Record<string, string> = {
  'VACANT_CLEAN': 'bg-emerald-100 text-emerald-700',
  'VACANT_DIRTY': 'bg-amber-100 text-amber-700',
  'OCCUPIED': 'bg-blue-100 text-blue-700',
  'MAINTENANCE': 'bg-red-100 text-red-700'
}

const reservationStatusMap: Record<string, string> = {
  'PENDING': 'Pendente',
  'CONFIRMED': 'Confirmada',
  'CHECKED_IN': 'Check-in Realizado',
  'CHECKED_OUT': 'Check-out Realizado',
  'COMPLETED': 'Concluída',
  'EXPIRED': 'Expirada',
  'CANCELLED': 'Cancelada'
}

const reservationStatusColor: Record<string, string> = {
  'PENDING': 'bg-amber-100 text-amber-700',
  'CONFIRMED': 'bg-green-100 text-green-700',
  'CHECKED_IN': 'bg-blue-100 text-blue-700',
  'CHECKED_OUT': 'bg-slate-100 text-slate-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'EXPIRED': 'bg-gray-100 text-gray-700',
  'CANCELLED': 'bg-red-100 text-red-700'
}

export default function DashboardPage() {
  // Buscar dados
  const { data: rooms, isLoading: rl } = useQuery({ 
    queryKey: ['rooms'], 
    queryFn: () => roomsApi.list().then(r => r.data) 
  })
  
  const { data: reservations, isLoading: resl } = useQuery({ 
    queryKey: ['reservations'], 
    queryFn: () => reservationsApi.list().then(r => r.data) 
  })
  
  const { data: ticketsData, isLoading: tl } = useQuery({ 
    queryKey: ['tickets', 'aberto'], 
    queryFn: () => ticketsApi.listAdmin?.({ status: 'aberto' }).then(r => r.data) ?? Promise.resolve([])
  })
  
  const { data: financialReport } = useQuery({ 
    queryKey: ['financial'], 
    queryFn: () => reportsApi.getFinancialReport?.()?.then(r => r.data) ?? Promise.resolve(null)
  })

  if (rl || resl || tl) return <PageSpinner />


  const totalRooms = rooms?.length ?? 0
  const cleanAvailable = rooms?.filter(r => r.state === 'VACANT_CLEAN').length ?? 0
  const dirtyRooms = rooms?.filter(r => r.state === 'VACANT_DIRTY').length ?? 0
  const occupied = rooms?.filter(r => r.state === 'OCCUPIED').length ?? 0
  const maintenance = rooms?.filter(r => r.maintenance !== 'NONE').length ?? 0
  
  const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0

  
  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // CHECK-INS DE HOJE: Reservas que têm check-in hoje E status CONFIRMED ou CHECKED_IN
  const todayCheckIns = reservations?.filter(r => {
    if (!r.checkIn) return false
    const checkInDate = startOfDay(parseISO(r.checkIn))
    // Considera reservas confirmadas que fazem check-in hoje OU que já fizeram check-in hoje
    const isToday = isSameDay(checkInDate, today)
    const isValidStatus = r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'
    return isToday && isValidStatus
  }) ?? []
  
  const todayCheckInsCount = todayCheckIns.length

  // CHECK-OUTS DE HOJE
  const todayCheckOuts = reservations?.filter(r => {
    if (!r.checkOut) return false
    const checkOutDate = startOfDay(parseISO(r.checkOut))
    const isToday = isSameDay(checkOutDate, today)
    const isValidStatus = r.status === 'CHECKED_IN' || r.status === 'CONFIRMED'
    return isToday && isValidStatus
  }) ?? []
  
  const todayCheckOutsCount = todayCheckOuts.length

  // ESTADIAS EM ANDAMENTO 
  const activeStays = reservations?.filter(r => {
    if (!r.checkIn || !r.checkOut) return false
    const checkInDate = startOfDay(parseISO(r.checkIn))
    const checkOutDate = startOfDay(parseISO(r.checkOut))
    const now = startOfDay(new Date())
    // Está entre check-in e check-out (inclusive)
    const isBetween = now >= checkInDate && now <= checkOutDate
    const isValidStatus = r.status === 'CHECKED_IN' || (r.status === 'CONFIRMED' && isSameDay(now, checkInDate))
    return isBetween && isValidStatus
  }) ?? []

  //  CHECK-INS ATRASADOS 
  const delayedCheckIns = reservations?.filter(r => {
    if (!r.checkIn) return false
    const checkInDate = startOfDay(parseISO(r.checkIn))
    const now = startOfDay(new Date())
    // Check-in deveria ter acontecido antes de hoje mas ainda não foi feito
    return checkInDate < now && r.status === 'CONFIRMED'
  }) ?? []

  //  RESERVAS CONFIRMADAS NO PERÍODO 
  const activeReservations = reservations?.filter(r => r.status === 'CONFIRMED').length ?? 0
  const checkedInReservations = reservations?.filter(r => r.status === 'CHECKED_IN').length ?? 0
  const completedReservations = reservations?.filter(r => r.status === 'COMPLETED').length ?? 0

  //  TICKETS ABERTOS 
  const openTickets = ticketsData?.length ?? 0

  //  RECEITA TOTAL (reservas pagas)
  const totalRevenue = reservations
    ?.filter(r => r.paymentStatus === 'PAID' && r.amountPaid)
    .reduce((sum, r) => sum + (r.amountPaid ?? 0), 0) ?? 0

  //  RECEITA DO DIA 
  const todayRevenue = reservations
    ?.filter(r => {
      if (!r.createdAt) return false
      const createdAt = startOfDay(parseISO(r.createdAt))
      return isSameDay(createdAt, today) && r.paymentStatus === 'PAID'
    })
    .reduce((sum, r) => sum + (r.amountPaid ?? 0), 0) ?? 0

  // DADOS PARA O GRÁFICO DE RECEITA (últimos 7 dias) 
  const generateChartData = () => {
    const days = 7
    const startDate = subDays(today, days - 1)
    const dateRange = eachDayOfInterval({ start: startDate, end: today })
    
    // Agrupar reservas por data de criação
    const revenueByDate = dateRange.map(date => {
      const dayReservations = reservations?.filter(r => {
        if (!r.createdAt) return false
        const createdAt = startOfDay(parseISO(r.createdAt))
        return isSameDay(createdAt, date) && r.paymentStatus === 'PAID'
      }) ?? []
      
      const dailyRevenue = dayReservations.reduce((sum, r) => sum + (r.amountPaid ?? 0), 0)
      
      return {
        date: format(date, 'dd/MM'),
        fullDate: date,
        revenue: dailyRevenue,
        reservationsCount: dayReservations.length
      }
    })
    
    return revenueByDate
  }
  
  const chartData = generateChartData()
  const totalChartRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)

  //  RESERVAS RECENTES 
  const recentReservations = reservations
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) ?? []

  //  QUARTOS RECENTES/DESTAQUE 
  const featuredRooms = rooms?.slice(0, 6) ?? []

  // Estatísticas para os cards
  const stats = [
    { 
      label: 'Taxa de Ocupação', 
      value: `${occupancyRate}%`, 
      icon: TrendingUp, 
      color: 'bg-gold-50 text-gold-600',
      sub: `${occupied} de ${totalRooms} quartos ocupados`,
      trend: occupancyRate > 70 ? 'Alta' : occupancyRate > 40 ? 'Média' : 'Baixa'
    },
    { 
      label: 'Quartos Disponíveis', 
      value: cleanAvailable, 
      icon: BedDouble, 
      color: 'bg-emerald-50 text-emerald-600',
      sub: `${dirtyRooms} sujos, ${maintenance} em manutenção`,
      trend: cleanAvailable > 0 ? `${cleanAvailable} limpos` : 'Indisponíveis'
    },
    { 
      label: 'Check-ins Hoje', 
      value: todayCheckInsCount, 
      icon: CalendarCheck2, 
      color: 'bg-blue-50 text-blue-600',
      sub: `${todayCheckOutsCount} check-outs hoje`,
      trend: todayCheckInsCount > 0 ? `${todayCheckInsCount} confirmados` : 'Nenhum hoje'
    },
    { 
      label: 'Em Andamento', 
      value: activeStays.length, 
      icon: Users, 
      color: 'bg-purple-50 text-purple-600',
      sub: `${checkedInReservations} check-ins realizados`,
      trend: activeStays.length > 0 ? 'Hóspedes no hotel' : 'Sem hóspedes'
    },
  ]

  // Distribuição de status dos quartos
  const roomStatusDistribution = [
    { status: 'VACANT_CLEAN', label: 'Disponíveis', count: cleanAvailable, color: 'bg-emerald-500' },
    { status: 'OCCUPIED', label: 'Ocupados', count: occupied, color: 'bg-blue-500' },
    { status: 'VACANT_DIRTY', label: 'Sujos', count: dirtyRooms, color: 'bg-amber-500' },
    { status: 'MAINTENANCE', label: 'Manutenção', count: maintenance, color: 'bg-red-500' }
  ].filter(s => s.count > 0)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-stone-400 mt-1 font-body">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>

      {/* Alerta de check-ins atrasados */}
      {delayedCheckIns.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {delayedCheckIns.length} {delayedCheckIns.length === 1 ? 'reserva está' : 'reservas estão'} com check-in atrasado
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Estas reservas já deveriam ter feito check-in. Por favor, verifique.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, sub, trend }) => (
          <div key={label} className="card flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-display font-semibold text-stone-900">{value}</p>
              <p className="text-sm font-medium text-stone-700 mt-0.5">{label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
              <p className="text-[10px] text-stone-400 mt-1">
                {trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Room Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Financial Chart */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Receita Diária</h2>
            <div className="text-right">
              <p className="text-xs text-stone-400">Hoje</p>
              <p className="text-sm font-semibold text-gold-600">{formatCurrency(todayRevenue)}</p>
            </div>
          </div>
          
          {chartData.length > 0 && chartData.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fontFamily: 'DM Mono' }} 
                  interval={Math.floor(chartData.length / 6)}
                />
                <YAxis 
                  tick={{ fontSize: 11, fontFamily: 'DM Mono' }} 
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
                />
                <Tooltip 
                  formatter={(v: number) => formatCurrency(v)} 
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontFamily: 'DM Sans' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#d49620" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#d49620' }}
                  name="Receita"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-stone-300 text-sm">
              Sem dados de receita nos últimos 7 dias
            </div>
          )}
          
          {/* Mini stats */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-100">
              <div>
                <p className="text-xs text-stone-400">Média diária</p>
                <p className="text-sm font-semibold text-stone-700">
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.revenue, 0) / chartData.length)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-400">Melhor dia</p>
                <p className="text-sm font-semibold text-stone-700">
                  {formatCurrency(Math.max(...chartData.map(d => d.revenue), 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-400">Total período</p>
                <p className="text-sm font-semibold text-stone-700">
                  {formatCurrency(totalChartRevenue)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Room Status Distribution */}
        <div className="card">
          <h2 className="section-title mb-4">Distribuição dos Quartos</h2>
          <div className="space-y-3">
            {roomStatusDistribution.map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">{label}</span>
                  <span className="font-semibold text-stone-800">{count}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${color} transition-all duration-500`}
                    style={{ width: `${(count / totalRooms) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {roomStatusDistribution.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-4">Sem dados de quartos</p>
            )}
          </div>
          
          {/* Additional info */}
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Taxa de ocupação</span>
              <span className="font-semibold text-stone-800">{occupancyRate}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Reservas confirmadas</span>
              <span className="font-semibold text-stone-800">{activeReservations}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Check-ins realizados</span>
              <span className="font-semibold text-stone-800">{checkedInReservations}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Reservas concluídas</span>
              <span className="font-semibold text-stone-800">{completedReservations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Check-ins de Hoje */}
      {todayCheckIns.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Check-ins de Hoje</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {todayCheckInsCount} {todayCheckInsCount === 1 ? 'check-in' : 'check-ins'}
            </span>
          </div>
          <div className="space-y-2">
            {todayCheckIns.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-blue-50/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{r.guest?.name || r.user?.name}</p>
                    <p className="text-xs text-stone-500">Quarto #{r.room?.number} • {format(parseISO(r.checkIn), 'HH:mm')}</p>
                  </div>
                </div>
                <span className={`badge text-[10px] ${reservationStatusColor[r.status]}`}>
                  {reservationStatusMap[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Check-outs de Hoje */}
      {todayCheckOuts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Check-outs de Hoje</h2>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              {todayCheckOutsCount} {todayCheckOutsCount === 1 ? 'check-out' : 'check-outs'}
            </span>
          </div>
          <div className="space-y-2">
            {todayCheckOuts.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-orange-50/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <LogOut size={14} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{r.guest?.name || r.user?.name}</p>
                    <p className="text-xs text-stone-500">Quarto #{r.room?.number}</p>
                  </div>
                </div>
                <span className={`badge text-[10px] ${reservationStatusColor[r.status]}`}>
                  {reservationStatusMap[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reservations + Rooms Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Reservas Recentes</h2>
            <span className="text-xs text-stone-400">
              Total: {reservations?.length ?? 0}
            </span>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {recentReservations.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">Sem reservas recentes.</p>
            ) : (
              recentReservations.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-stone-200 flex items-center justify-center text-stone-500 flex-shrink-0">
                    <Users size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {r.guest?.name ?? `Reserva #${r.id.slice(0, 6)}`}
                      </p>
                      <span className={`badge text-[10px] ${reservationStatusColor[r.status] || 'bg-gray-100'}`}>
                        {reservationStatusMap[r.status] || r.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 flex items-center gap-1 mb-1">
                      <Clock size={11} /> 
                      {format(parseISO(r.checkIn), 'dd/MM')} → {format(parseISO(r.checkOut), 'dd/MM')}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-stone-500">
                        Quarto #{r.room?.number ?? 'N/A'}
                      </p>
                      {r.amountPaid && (
                        <p className="text-xs font-semibold text-gold-600">
                          {formatCurrency(r.amountPaid)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rooms Grid Preview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Quartos</h2>
            <span className="text-xs text-stone-400">
              {cleanAvailable} disponíveis
            </span>
          </div>
          
          {featuredRooms.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              Sem quartos cadastrados
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {featuredRooms.map(room => (
                <div key={room.id} className="relative rounded-xl overflow-hidden aspect-[4/3] group cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                  <LazyImage 
                    src={room.imageUrl || '/images/room-placeholder.jpg'} 
                    alt={`Quarto ${room.number}`} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-semibold">Quarto #{room.number}</p>
                    <p className="text-white/80 text-[10px]">{room.title || room.type}</p>
                    <span className={`inline-block mt-1 badge text-[9px] ${roomStateColor[room.state] || 'bg-gray-500 text-white'}`}>
                      {roomStateMap[room.state] || room.state}
                    </span>
                  </div>
                  {room.maintenance !== 'NONE' && (
                    <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                      <Wrench size={10} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Quick stats footer */}
          <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle size={12} className="text-emerald-500" />
              <span>{cleanAvailable} limpos</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle size={12} className="text-amber-500" />
              <span>{dirtyRooms} sujos</span>
            </div>
            <div className="flex items-center gap-1">
              <Wrench size={12} className="text-red-500" />
              <span>{maintenance} manutenção</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info: Ticket Summary if exists */}
      {openTickets > 0 && ticketsData && ticketsData.length > 0 && (
        <div className="card bg-orange-50/30 border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Ticket size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {openTickets} {openTickets === 1 ? 'ticket aberto' : 'tickets abertos'}
              </p>
              <p className="text-xs text-orange-600">
                Requerem atenção da equipe de atendimento
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}