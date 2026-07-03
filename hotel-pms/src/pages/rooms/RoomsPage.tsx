import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '@/api/services'
import { PageSpinner, LazyImage, Modal, ConfirmDialog } from '@/components/ui'
import { Plus, Trash2, Brush, CheckCircle, Wrench, BedDouble, RefreshCw, AlertCircle } from 'lucide-react'
import { formatCurrency, cn } from '@/utils'
import { useRole } from '@/hooks/useRole'
import useAuthStore from '@/store/authStore'
import type { Room } from '@/types'
import toast from 'react-hot-toast'

// Mapeamento de estados do backend para o frontend
const STATUS_MAP: Record<string, string> = {
  'VACANT_CLEAN': 'available',
  'VACANT_DIRTY': 'dirty',
  'OCCUPIED': 'occupied',
  'CLEANING': 'cleaning',
  'MAINTENANCE': 'maintenance'
}

const STATUS_LABELS: Record<string, string> = {
  'available': 'Disponível',
  'dirty': 'Sujo (Limpeza necessária)',
  'occupied': 'Ocupado',
  'cleaning': 'Limpeza',
  'maintenance': 'Manutenção'
}

const STATUS_COLORS: Record<string, string> = {
  'available': 'bg-emerald-100 text-emerald-700',
  'dirty': 'bg-orange-100 text-orange-700',
  'occupied': 'bg-blue-100 text-blue-700',
  'cleaning': 'bg-amber-100 text-amber-700',
  'maintenance': 'bg-red-100 text-red-700'
}

const STATUS_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponível', value: 'available' },
  { label: 'Sujo', value: 'dirty' },
  { label: 'Ocupado', value: 'occupied' },
  { label: 'Limpeza', value: 'cleaning' },
  { label: 'Manutenção', value: 'maintenance' },
]

const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'PRESIDENTIAL']

export default function RoomsPage() {
  const qc = useQueryClient()
  const { isAdmin, isReceptionist, isStaff } = useRole()
  const { token } = useAuthStore()
  const [filter, setFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [form, setForm] = useState({
    number: '',
    type: 'SINGLE',
    title: '',
    floor: '1',
    pricePerNight: '',
    capacity: '2',
    description: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list().then(r => r.data),
  })

  const { data: amenities = [] } = useQuery({
    queryKey: ['amenities'],
    queryFn: () => fetch('http://localhost:9090/amenities', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  })

  // Normalizar quartos com o status correto
  const normalizedRooms = rooms.map((room: any) => ({
    ...room,
    displayStatus: STATUS_MAP[room.state] || 'available',
    statusLabel: STATUS_LABELS[STATUS_MAP[room.state] || 'available'],
    statusColor: STATUS_COLORS[STATUS_MAP[room.state] || 'available'],
    rawState: room.state,
    image: room.imageUrl,
  }))

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('number', form.number)
      formData.append('type', form.type)
      formData.append('title', form.title || '')
      formData.append('description', form.description || '')
      formData.append('pricePerNight', String(form.pricePerNight))
      formData.append('capacity', String(form.capacity))
      formData.append('floor', String(form.floor))
      if (imageFile) formData.append('image', imageFile)
      selectedAmenities.forEach(id => formData.append('amenityIds[]', id))

      const response = await fetch('http://localhost:9090/rooms', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar quarto')
      }
      return response.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      setShowCreate(false)
      toast.success('Quarto criado com sucesso!')
      setForm({ number: '', type: 'SINGLE', title: '', floor: '1', pricePerNight: '', capacity: '2', description: '' })
      setSelectedAmenities([])
      setImageFile(null)
      setImagePreview(null)
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao criar quarto'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await roomsApi.delete(id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Quarto eliminado com sucesso')
    },
    onError: () => toast.error('Erro ao eliminar quarto'),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const room = normalizedRooms.find(r => r.id === id)
      if (!room) throw new Error('Quarto não encontrado')

    
      // Validações de negócio
      if (room.rawState === 'VACANT_CLEAN' && action === 'start_cleaning') {
        throw new Error('Este quarto já está limpo e disponível. Não é necessário limpeza.')
      }
      
      if (room.rawState === 'VACANT_DIRTY' && action === 'start_cleaning') {
        // Permite iniciar limpeza
      }
      
      if (room.rawState === 'OCCUPIED' && action === 'start_cleaning') {
        throw new Error('Quartos ocupados não podem iniciar limpeza. Aguarde o check-out.')
      }
      
      if (room.rawState !== 'CLEANING' && (action === 'finish_cleaning' || action === 'inspect')) {
        throw new Error(`Quarto não está em limpeza. Estado atual: ${room.rawState}`)
      }

      switch (action) {
        case 'start_cleaning': 
          return await roomsApi.startCleaning(id)
        case 'finish_cleaning': 
          return await roomsApi.finishCleaning(id)
        case 'inspect': 
          return await roomsApi.inspect(id)
        case 'start_maintenance': 
          return await roomsApi.startMaintenance(id, 'OUT_OF_ORDER')
        case 'finish_maintenance': 
          return await roomsApi.finishMaintenance(id)
        default: 
          throw new Error('Ação inválida')
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      const messages: Record<string, string> = {
        start_cleaning: '🧹 Limpeza iniciada!',
        finish_cleaning: '✅ Limpeza finalizada!',
        inspect: '🔍 Quarto inspecionado!',
        start_maintenance: '🔧 Manutenção iniciada!',
        finish_maintenance: '✅ Manutenção finalizada!'
      }
      toast.success(messages[variables.action] || 'Ação executada')
    },
    onError: (error: any) => {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao executar ação')
    },
  })

  const filtered = normalizedRooms.filter(r => filter === 'all' || r.displayStatus === filter)

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Quartos</h1>
          <p className="text-sm text-stone-500 mt-1">
            {isAdmin && '🔒 Acesso total - Pode criar, editar e eliminar quartos'}
            {isReceptionist && '👋 Rececionista - Pode gerir limpeza e inspeção'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-100">
            <RefreshCw size={18} />
          </button>
          {isAdmin && (
            <button className="bg-stone-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-stone-700" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Novo Quarto
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button 
            key={f.value} 
            onClick={() => setFilter(f.value)} 
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all',
              filter === f.value ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <BedDouble size={48} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500">Nenhum quarto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              isAdmin={isAdmin}
              isReceptionist={isReceptionist}
              onDelete={() => setDeleteId(room.id)}
              onAction={(action) => statusMutation.mutate({ id: room.id, action })}
              isLoading={statusMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Quarto" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número *</label>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="101" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Quarto Luxo" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Piso</label>
              <input className="w-full border rounded-lg px-3 py-2" type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preço / noite *</label>
              <input className="w-full border rounded-lg px-3 py-2" type="number" placeholder="15000" value={form.pricePerNight} onChange={e => setForm(f => ({ ...f, pricePerNight: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacidade *</label>
              <input className="w-full border rounded-lg px-3 py-2" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>

          {amenities.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Amenidades</label>
              <div className="border rounded-lg p-3 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {amenities.map((a: any) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedAmenities.includes(a.id)} onChange={(e) => {
                      if (e.target.checked) setSelectedAmenities([...selectedAmenities, a.id])
                      else setSelectedAmenities(selectedAmenities.filter(id => id !== a.id))
                    }} />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Imagem</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setImageFile(file)
                setImagePreview(URL.createObjectURL(file))
              }
            }} />
            {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea className="w-full border rounded-lg px-3 py-2" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="px-4 py-2 border rounded-lg hover:bg-stone-50" onClick={() => setShowCreate(false)}>Cancelar</button>
          <button className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Criando...' : 'Criar Quarto'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Eliminar Quarto" message="Tem certeza que deseja eliminar este quarto?" danger />
    </div>
  )
}

// RoomCard Component - Lógica de ações 
function RoomCard({ room, isAdmin, isReceptionist, onDelete, onAction, isLoading }: any) {
  const [showActions, setShowActions] = useState(false)

  // Definir ações disponíveis baseado no estado RAW do backend
  const getAvailableActions = () => {
    const actions = []
    
    switch (room.rawState) {
      case 'VACANT_DIRTY':
        // Quarto sujo - pode iniciar limpeza
        actions.push({ 
          label: 'Iniciar limpeza', 
          action: 'start_cleaning', 
          icon: Brush,
          description: 'Quarto sujo, necessário limpeza'
        })
        break
        
      case 'CLEANING':
        // Quarto em limpeza - pode finalizar ou inspecionar
        actions.push(
          { 
            label: 'Terminar limpeza', 
            action: 'finish_cleaning', 
            icon: CheckCircle,
            description: 'Finalizar limpeza'
          },
          { 
            label: 'Inspecionar', 
            action: 'inspect', 
            icon: CheckCircle,
            description: 'Inspecionar quarto'
          }
        )
        break
        
      case 'VACANT_CLEAN':
        // Quarto limpo e disponível - NENHUMA ação de limpeza
        // Apenas manutenção se for admin
        if (isAdmin) {
          actions.push({ 
            label: 'Iniciar manutenção', 
            action: 'start_maintenance', 
            icon: Wrench,
            description: 'Colocar em manutenção'
          })
        }
        break
        
      case 'MAINTENANCE':
        // Quarto em manutenção - apenas admin pode finalizar
        if (isAdmin) {
          actions.push({ 
            label: 'Terminar manutenção', 
            action: 'finish_maintenance', 
            icon: CheckCircle,
            description: 'Finalizar manutenção'
          })
        }
        break
        
      case 'OCCUPIED':
        // Quarto ocupado - nenhuma ação de limpeza
        break
    }
    
    return actions
  }

  const availableActions = getAvailableActions()

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-44">
        <LazyImage src={room.image || '/images/room-placeholder.jpg'} alt={room.number} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', room.statusColor)}>
            {room.statusLabel}
          </span>
        </div>
        
        {/* Delete Button - Apenas Admin */}
        {isAdmin && (
          <button 
            onClick={onDelete} 
            className="absolute top-3 right-3 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        
        {/* Room Info */}
        <div className="absolute bottom-3 left-3 text-white">
          <p className="font-bold text-lg">#{room.number}</p>
          <p className="text-xs opacity-90">{room.title}</p>
          <p className="text-xs opacity-75">{room.type} • Piso {room.floor}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-stone-500">Preço por noite</span>
          <span className="font-semibold text-stone-800">{formatCurrency(room.pricePerNight)}</span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-stone-500">Capacidade</span>
          <span className="text-sm text-stone-700">👥 {room.capacity} {room.capacity === 1 ? 'pessoa' : 'pessoas'}</span>
        </div>
        
        {/* Ações */}
        <div className="flex justify-between items-center pt-2 border-t border-stone-100">
          <div className="text-xs text-stone-400">
            {room.rawState === 'VACANT_CLEAN' && '✨ Quarto pronto para uso'}
            {room.rawState === 'VACANT_DIRTY' && '⚠️ Necessita limpeza'}
            {room.rawState === 'OCCUPIED' && '🚫 Aguardando check-out'}
            {room.rawState === 'CLEANING' && '🧹 Em processo de limpeza'}
            {room.rawState === 'MAINTENANCE' && '🔧 Em manutenção'}
          </div>
          
          {availableActions.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setShowActions(!showActions)} 
                className="text-xs text-amber-600 font-medium hover:text-amber-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'A processar...' : 'Ações ▾'}
              </button>
              
              {showActions && !isLoading && (
                <div className="absolute right-0 bottom-full mb-2 bg-white border rounded-lg shadow-lg z-10 min-w-[160px]">
                  {availableActions.map(a => (
                    <button 
                      key={a.action} 
                      onClick={() => { onAction(a.action); setShowActions(false) }} 
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-stone-50 text-left transition-colors"
                      title={a.description}
                    >
                      <a.icon size={14} className="text-stone-500" /> 
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Mensagem específica para quarto limpo */}
        {room.rawState === 'VACANT_CLEAN' && (
          <div className="mt-3 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 flex items-center gap-1">
            <CheckCircle size={12} />
            Quarto limpo e disponível para reserva
          </div>
        )}
        
        {/* Mensagem para quarto sujo */}
        {room.rawState === 'VACANT_DIRTY' && isReceptionist && (
          <div className="mt-3 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1 flex items-center gap-1">
            <AlertCircle size={12} />
            Necessita limpeza antes da próxima reserva
          </div>
        )}
      </div>
    </div>
  )
}