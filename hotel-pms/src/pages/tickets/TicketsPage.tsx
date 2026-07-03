import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as apiServices from '@/api/services'
import { PageSpinner } from '@/components/ui'
import {
  Plus, Ticket, ChevronRight, Send, X, Search,
  CheckCircle, Clock, MessageSquare, AlertTriangle,
  Calendar, Info, Tag, User, HelpCircle
} from 'lucide-react'
import { formatDateTime, cn } from '@/utils'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

const { ticketsApi, roomsApi } = apiServices

// Tipos
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketType = 'SUPPORT' | 'COMPLAINT' | 'REQUEST' | 'INFO' | 'RESCHEDULE' | 'CANCELLATION'

export interface Ticket {
  id: string
  code: string
  subject: string
  message?: string
  type: TicketType
  status: TicketStatus
  priority: TicketPriority
  lastMessage?: string
  lastMessageAt?: string
  messageCount?: number
  createdAt: string
  updatedAt: string
  reservation?: { id: string; room?: { number: string } }
  user?: { id: string; name: string; email: string }
  assignedTo?: { id: string; name: string }
}

export interface TicketMessage {
  id: string
  message: string
  userId: string
  user: { id: string; name: string; role: string }
  isStaff: boolean
  createdAt: string
}

const TICKET_TYPES: { value: TicketType; label: string; icon: any; color: string }[] = [
  { value: 'SUPPORT', label: 'Suporte', icon: HelpCircle, color: 'bg-blue-50 text-blue-700' },
  { value: 'COMPLAINT', label: 'Reclamação', icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
  { value: 'REQUEST', label: 'Solicitação', icon: Tag, color: 'bg-purple-50 text-purple-700' },
  { value: 'INFO', label: 'Informação', icon: Info, color: 'bg-indigo-50 text-indigo-700' },
  { value: 'RESCHEDULE', label: 'Reagendamento', icon: Calendar, color: 'bg-amber-50 text-amber-700' },
  { value: 'CANCELLATION', label: 'Cancelamento', icon: X, color: 'bg-rose-50 text-rose-700' },
]

const PRIORITY_OPTS: { value: TicketPriority; label: string; color: string; border: string }[] = [
  { value: 'LOW', label: 'Baixa', color: 'bg-emerald-50 text-emerald-700 font-medium', border: 'border-emerald-100' },
  { value: 'MEDIUM', label: 'Média', color: 'bg-slate-100 text-slate-700 font-medium', border: 'border-slate-200' },
  { value: 'HIGH', label: 'Alta', color: 'bg-orange-50 text-orange-700 font-semibold', border: 'border-orange-100' },
  { value: 'URGENT', label: 'Urgente', color: 'bg-rose-100 text-rose-700 font-bold animate-pulse', border: 'border-rose-200' },
]

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; dot: string }> = {
  OPEN: { label: 'Aberto', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  WAITING_CLIENT: { label: 'Aguardando Cliente', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  RESOLVED: { label: 'Resolvido', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Fechado', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
}

export default function TicketsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isStaff = ['ADMIN', 'MANAGER', 'RECEPTION'].includes(user?.role ?? '')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    subject: '',
    message: '',
    type: 'SUPPORT' as TicketType,
    priority: 'MEDIUM' as TicketPriority,
    reservationId: '',
    requestedCheckIn: '',
    requestedCheckOut: '',
    requestedRoomId: '',
  })

  // Queries
  const { data: ticketsData = [], isLoading, refetch } = useQuery({
    queryKey: ['tickets', filterStatus, isStaff, search],
    queryFn: async () => {
      const params: any = {}
      if (filterStatus !== 'all') params.status = filterStatus
      if (search && isStaff) params.search = search

      const response = isStaff
        ? await ticketsApi.listAll(params)
        : await ticketsApi.listMine(params)

      const result = response.data
      if (Array.isArray(result)) return result
      if (result?.data && Array.isArray(result.data)) return result.data
      if (result?.content && Array.isArray(result.content)) return result.content
      return []
    }
  })

  const tickets = ticketsData as Ticket[]

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await roomsApi.list()
      return Array.isArray(response.data) ? response.data : (response.data as any)?.data || []
    },
    enabled: showCreate
  })

// Query para mensagens com polling
// Query para mensagens com polling
const { data: messagesResponse, refetch: refetchMessages, isLoading: messagesLoading } = useQuery({
  queryKey: ['ticket-messages', selectedTicket?.id],
  queryFn: async () => {
    if (!selectedTicket) return null
    const response = await ticketsApi.getMessages(selectedTicket.id)
    return response
  },
  enabled: !!selectedTicket,
  refetchInterval: 3000,
})

// CORREÇÃO: Usar type assertion para acessar a estrutura correta
const messages = (messagesResponse as any)?.data?.data ?? []


  // Scroll automático para o fim do chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mutations
  const createMutation = useMutation({
    mutationFn: (formData: typeof form) => ticketsApi.create({
      subject: formData.subject,
      message: formData.message,
      type: formData.type,
      priority: formData.priority,
      reservationId: formData.reservationId || undefined,
      requestedCheckIn: formData.requestedCheckIn || undefined,
      requestedCheckOut: formData.requestedCheckOut || undefined,
      requestedRoomId: formData.requestedRoomId || undefined,
    }),
    onSuccess: () => {
      refetch()
      qc.invalidateQueries({ queryKey: ['tickets-stats'] })
      setShowCreate(false)
      setForm({
        subject: '', message: '', type: 'SUPPORT', priority: 'MEDIUM',
        reservationId: '', requestedCheckIn: '', requestedCheckOut: '', requestedRoomId: ''
      })
      toast.success('Ticket criado com sucesso!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao criar ticket'),
  })

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => ticketsApi.sendMessage(selectedTicket!.id, message),
    onSuccess: async () => {
      await refetchMessages()
      qc.invalidateQueries({ queryKey: ['ticket-messages', selectedTicket?.id] })
      await refetch()
      setReplyMessage('')
      toast.success('Mensagem enviada!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao enviar mensagem'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ticketsApi.update(id, { status }),
    onSuccess: (data, variables) => {
      refetch()
      qc.invalidateQueries({ queryKey: ['tickets-stats'] })
      if (selectedTicket && selectedTicket.id === variables.id) {
        setSelectedTicket(prev => prev ? { ...prev, status: variables.status as TicketStatus } : null)
      }
      refetchMessages()
      toast.success('Status atualizado!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao atualizar status'),
  })

  const { data: statsData } = useQuery({
    queryKey: ['tickets-stats'],
    queryFn: () => ticketsApi.getStats().then(r => r.data),
    enabled: isStaff,
  })

  const filteredTickets = tickets.filter(ticket => {
    const matchStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchSearch = !search ||
      ticket.code?.toLowerCase().includes(search.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(search.toLowerCase()) ||
      ticket.user?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const stats = isStaff && statsData ? [
    { label: 'Abertos', count: statsData.open || 0, color: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100' },
    { label: 'Em andamento', count: statsData.inProgress || 0, color: 'text-blue-600', bg: 'bg-blue-50/60 border-blue-100' },
    { label: 'Resolvidos', count: statsData.resolved || 1, color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
  ] : [
    { label: 'Abertos', count: tickets.filter(t => t.status === 'OPEN').length, color: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100' },
    { label: 'Em andamento', count: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-blue-600', bg: 'bg-blue-50/60 border-blue-100' },
    { label: 'Resolvidos', count: tickets.filter(t => t.status === 'RESOLVED').length, color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
  ]

  if (isLoading) return <PageSpinner />

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden gap-5 animate-fadeIn">

      {/* Top Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#001E3D] tracking-tight">Central de Suporte</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isStaff ? 'Gerencie e responda aos chamados dos hóspedes em tempo real.' : 'Abra chamados ou tire dúvidas sobre a sua estadia.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center">
          <div className="flex gap-2">
            {stats.map(s => (
              <div key={s.label} className={cn("px-4 py-2 rounded-xl border flex flex-col items-center min-w-[5rem]", s.bg)}>
                <span className={cn("text-lg font-bold leading-none", s.color)}>{s.count}</span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">{s.label}</span>
              </div>
            ))}
          </div>
          <button
            className="bg-[#001E3D] hover:bg-[#002d5c] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm text-xs font-semibold h-fit self-center"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} /> Novo Ticket
          </button>
        </div>
      </div>

      {/* Main Workspace (Split View) */}
      <div className="flex flex-1 overflow-hidden gap-5 items-stretch">

        {/* LEFT COLUMN: Ticket List */}
        <div className={cn(
          "bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden transition-all duration-300",
          selectedTicket ? "w-full md:w-[40%] lg:w-[35%] hidden md:flex" : "w-full"
        )}>

          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-[#001E3D] focus:outline-none focus:ring-2 focus:ring-[#001E3D]/5 transition-all"
                placeholder="Pesquisar código, assunto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { v: 'all', l: 'Todos' },
                { v: 'OPEN', l: 'Abertos' },
                { v: 'IN_PROGRESS', l: 'Andamento' },
                { v: 'WAITING_CLIENT', l: 'Aguardando' },
                { v: 'RESOLVED', l: 'Resolvidos' }
              ].map(f => (
                <button
                  key={f.v}
                  onClick={() => setFilterStatus(f.v)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex-shrink-0 border',
                    filterStatus === f.v
                      ? 'bg-[#001E3D] border-[#001E3D] text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Ticket size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-xs font-medium">Nenhum ticket encontrado</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const typeObj = TICKET_TYPES.find(t => t.value === ticket.type)
                const isSelected = selectedTicket?.id === ticket.id

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      "p-4 cursor-pointer transition-all flex items-start justify-between gap-3 relative border-l-4",
                      isSelected
                        ? "bg-slate-50/80 border-l-[#001E3D]"
                        : "border-l-transparent hover:bg-slate-50/40"
                    )}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 font-medium tracking-wider">{ticket.code}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', typeObj?.color)}>
                          {typeObj?.label}
                        </span>
                      </div>
                      <h3 className={cn("text-xs font-semibold text-slate-800 truncate", isSelected && "text-[#001E3D]")}>
                        {ticket.subject}
                      </h3>
                      {isStaff && ticket.user && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <User size={10} /> {ticket.user.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[ticket.status]?.dot)} />
                        <span className="text-[10px] text-slate-500 font-medium">
                          {STATUS_CONFIG[ticket.status]?.label}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">
                          {ticket.lastMessageAt ? formatDateTime(ticket.lastMessageAt) : formatDateTime(ticket.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between h-full gap-4">
                      <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold border', PRIORITY_OPTS.find(p => p.value === ticket.priority)?.color, PRIORITY_OPTS.find(p => p.value === ticket.priority)?.border)}>
                        {PRIORITY_OPTS.find(p => p.value === ticket.priority)?.label}
                      </span>
                      <ChevronRight size={14} className={cn("text-slate-300 transition-transform", isSelected && "translate-x-0.5 text-[#001E3D]")} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Ticket Detail & Chat Workspace */}
        <div className={cn(
          "flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden relative",
          !selectedTicket && "hidden md:flex items-center justify-center bg-slate-50/30 border-dashed"
        )}>
          {selectedTicket ? (
            <div className="flex flex-col h-full w-full">

              {/* Workspace Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 md:hidden"
                  >
                    <X size={16} className="text-slate-500" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{selectedTicket.code}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', STATUS_CONFIG[selectedTicket.status]?.bg, STATUS_CONFIG[selectedTicket.status]?.color)}>
                        {STATUS_CONFIG[selectedTicket.status]?.label}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 truncate mt-1">{selectedTicket.subject}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isStaff ? (
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: selectedTicket.id, status: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#001E3D]/10"
                    >
                      <option value="OPEN">Aberto</option>
                      <option value="IN_PROGRESS">Em andamento</option>
                      <option value="WAITING_CLIENT">Aguardando Cliente</option>
                      <option value="RESOLVED">Resolvido</option>
                      <option value="CLOSED">Fechado</option>
                    </select>
                  ) : (
                    <span className={cn('px-2.5 py-1 rounded-xl text-xs font-semibold border', PRIORITY_OPTS.find(p => p.value === selectedTicket.priority)?.color)}>
                      Prioridade {PRIORITY_OPTS.find(p => p.value === selectedTicket.priority)?.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Context bar */}
              {selectedTicket.reservation && (
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span className="font-medium">Vinculado à Reserva do Quarto {selectedTicket.reservation.room?.number || 'N/A'}</span>
                  <span className="text-[10px] text-slate-400">Criado em {formatDateTime(selectedTicket.createdAt)}</span>
                </div>
              )}

           {/* Chat Thread Messages Area - Versão Simplificada */}
<div className="flex-1 overflow-y-auto p-4 bg-slate-50/40 space-y-3">
  {/* Original Ticket Description */}
  {selectedTicket.message && (
    <div className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-xs max-w-[90%] mx-auto mb-6">
      <p className="text-[10px] font-bold text-[#001E3D] uppercase tracking-wider mb-1">Descrição Inicial</p>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
    </div>
  )}

  {messagesLoading && messages.length === 0 ? (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#001E3D] border-t-transparent mx-auto mb-2" />
      <p className="text-xs text-slate-400">Carregando mensagens...</p>
    </div>
  ) : messages.length > 0 ? (
    <>
      {messages.map((msg: TicketMessage) => {
        // Verificar se quem enviou é o usuário atual
        const isMyMessage = msg.userId === user?.id
        
        return (
          <div 
            key={msg.id} 
            className={cn('flex flex-col', isMyMessage ? 'items-end' : 'items-start')}
          >
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 shadow-xs text-xs',
              isMyMessage
                ? 'bg-[#001E3D] text-white rounded-tr-none'
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
            )}>
              <div className="flex items-center gap-2 mb-1 opacity-75 text-[10px]">
                <span className="font-bold">{msg.user?.name || (msg.isStaff ? 'Suporte' : 'Cliente')}</span>
                <span>•</span>
                <span>{formatDateTime(msg.createdAt)}</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
            </div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </>
  ) : (
    <div className="text-center py-12 text-slate-400 text-xs">
      <MessageSquare size={24} className="mx-auto text-slate-300 mb-2" />
      Nenhuma conversa iniciada.
    </div>
  )}
</div>

              {/* Chat Box Input/Footer */}
              {['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'].includes(selectedTicket.status) ? (
                <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
                  <div className="flex gap-2 items-end bg-slate-50 rounded-xl p-1.5 border border-slate-200 focus-within:border-[#001E3D]/50 focus-within:ring-2 focus-within:ring-[#001E3D]/5 transition-all">
                    <textarea
                      className="flex-1 bg-transparent px-3 py-1.5 text-xs bg-none resize-none focus:outline-none min-h-[2.5rem] max-h-24 text-slate-700"
                      rows={1}
                      placeholder="Escreva sua resposta..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (replyMessage.trim()) sendMessageMutation.mutate(replyMessage)
                        }
                      }}
                    />
                    <button
                      className="bg-[#001E3D] hover:bg-[#002d5c] text-white p-2 rounded-lg disabled:opacity-40 transition-colors flex-shrink-0"
                      onClick={() => replyMessage.trim() && sendMessageMutation.mutate(replyMessage)}
                      disabled={sendMessageMutation.isPending || !replyMessage.trim()}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  {sendMessageMutation.isPending && (
                    <p className="text-[10px] text-slate-400 mt-1 text-center">Enviando mensagem...</p>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "p-3 text-center text-xs font-medium border-t border-slate-100 flex items-center justify-center gap-1.5 flex-shrink-0",
                  selectedTicket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                )}>
                  {selectedTicket.status === 'RESOLVED' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  Este ticket está {selectedTicket.status === 'RESOLVED' ? 'resolvido' : 'fechado'} e não aceita novas respostas.
                </div>
              )}

            </div>
          ) : (
            <div className="text-center p-8 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={20} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Nenhum Chamado Selecionado</h3>
              <p className="text-xs text-slate-400 mt-1">
                Escolha um ticket na lista ao lado para ver o histórico de mensagens e responder ao suporte.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* NEW TICKET SLIDE-OVER */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity" onClick={() => setShowCreate(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col justify-between animate-slideLeft">

            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-serif font-bold text-[#001E3D]">Novo Chamado de Suporte</h2>
                <p className="text-[11px] text-slate-400">Preencha os dados abaixo para iniciar um atendimento.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Solicitação *</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-[#001E3D] focus:outline-none" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as TicketType }))}>
                    {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prioridade *</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-[#001E3D] focus:outline-none" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}>
                    {PRIORITY_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assunto / Título *</label>
                <input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#001E3D] focus:outline-none" placeholder="Ex: Vazamento de água no banheiro" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição Detalhada *</label>
                <textarea className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#001E3D] focus:outline-none resize-none" rows={4} placeholder="Por favor informe com detalhes o que está acontecendo..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>

      

              {['RESCHEDULE', 'CANCELLATION'].includes(form.type) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3 animate-fadeIn">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Datas Desejadas</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Novo Check-in</label>
                      <input type="date" className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs" value={form.requestedCheckIn} onChange={e => setForm(f => ({ ...f, requestedCheckIn: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Novo Check-out</label>
                      <input type="date" className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs" value={form.requestedCheckOut} onChange={e => setForm(f => ({ ...f, requestedCheckOut: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5 flex-shrink-0">
              <button className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-white text-slate-500 transition-colors" onClick={() => setShowCreate(false)}>
                Cancelar
              </button>
              <button
                className="bg-[#001E3D] text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-[#002d5c] disabled:opacity-50 transition-colors shadow-xs"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.subject || !form.message}
              >
                {createMutation.isPending ? 'Enviando...' : 'Criar Chamado'}
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  )
}