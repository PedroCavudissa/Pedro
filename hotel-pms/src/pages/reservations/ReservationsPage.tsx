import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reservationsApi, roomsApi } from '@/api/services'
import { PageSpinner } from '@/components/ui'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, CreditCard, LogIn, LogOut, X, Search,
  ChevronLeft, Calendar, Phone, Mail,
  User, FileText, CheckCircle, ArrowRight, Home,
  BedDouble, Moon, Sparkles, ChevronRight, Clock,
  DollarSign, StickyNote, Upload, AlertCircle, Edit2,
  Trash2, Eye, Download, FileWarning, RefreshCw, Loader2
} from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/utils'
import type { ReservationStatus } from '@/types'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

// ─── Cache key for form draft ─────────────────────
const FORM_CACHE_KEY = 'hotel_pms_reservation_draft'

type FormStep = 'select-room' | 'guest-data' | 'review'

const STATUS_META: Record<string, { label: string; dot: string; pill: string }> = {
  PENDING:     { label: 'Pendente',   dot: '#D97706', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED:   { label: 'Confirmada', dot: '#059669', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CHECKED_IN:  { label: 'Checked-in',  dot: '#2563EB', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  CHECKED_OUT: { label: 'Checked-out', dot: '#64748B', pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED:   { label: 'Cancelada', dot: '#DC2626', pill: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED:     { label: 'Expirada',  dot: '#9CA3AF', pill: 'bg-gray-100 text-gray-500 border-gray-200' },
  COMPLETED:   { label: 'Concluída', dot: '#16A34A', pill: 'bg-green-50 text-green-700 border-green-200' },
  pending:     { label: 'Pendente',   dot: '#D97706', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:   { label: 'Confirmada', dot: '#059669', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  checked_in:  { label: 'Checked-in',  dot: '#2563EB', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  checked_out: { label: 'Checked-out', dot: '#64748B', pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled:   { label: 'Cancelada', dot: '#DC2626', pill: 'bg-red-50 text-red-700 border-red-200' },
  expired:     { label: 'Expirada',  dot: '#9CA3AF', pill: 'bg-gray-100 text-gray-500 border-gray-200' },
  completed:   { label: 'Concluída', dot: '#16A34A', pill: 'bg-green-50 text-green-700 border-green-200' },
}

const STATUS_TABS: { label: string; value: ReservationStatus | 'all' }[] = [
  { label: 'Todas',      value: 'all' },
  { label: 'Pendentes',  value: 'pending' },
  { label: 'Confirmadas',value: 'confirmed' },
  { label: 'Check-in',  value: 'checked_in' },
  { label: 'Check-out', value: 'checked_out' },
  { label: 'Canceladas', value: 'cancelled' },
  { label: 'Expiradas',  value: 'expired' },
]

// ─── Validation helpers ───────────────────────────────────

function validateName(name: string): string | null {
  if (!name.trim()) return 'Campo obrigatório'
  if (/\d/.test(name)) return 'O nome não pode conter números'
  return null
}

function validateIdDocument(doc: string, country: string): string | null {
  if (!doc.trim()) return 'Campo obrigatório'
  if (country === 'Angola') {
    if (doc.length !== 14) return 'O BI deve ter exactamente 14 caracteres'
    if (!/[A-Za-z]/.test(doc[9]) || !/[A-Za-z]/.test(doc[10])) {
      return 'Os caracteres 10 e 11 do BI devem ser letras (ex: 003456789LA042)'
    }
    const rest = doc.split('').filter((_, i) => i !== 9 && i !== 10).join('')
    if (!/^\d+$/.test(rest)) return 'Os restantes caracteres do BI devem ser números'
  }
  return null
}

function validatePhone(phone: string): string | null {
  if (!phone.trim()) return 'Campo obrigatório'
  const digits = phone.replace(/[\s\-().]/g, '')
  if (digits.startsWith('+') || digits.startsWith('00')) {
    const numPart = digits.replace(/^\+|^00/, '')
    if (numPart.length < 9 || numPart.length > 15) {
      return 'Número inválido. Inclua o indicativo (ex: +244 9XX XXX XXX)'
    }
    if (!/^\d+$/.test(numPart)) return 'O telefone só pode conter dígitos após o indicativo'
    return null
  }
  if (!/^\d{9}$/.test(digits)) {
    return 'Introduza 9 dígitos (sem indicativo) ou o indicativo + 9 dígitos (ex: +244 912345678)'
  }
  return null
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Campo obrigatório'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido'
  return null
}

// ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, dot: '#9CA3AF', pill: 'bg-gray-100 text-gray-500 border-gray-200' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap', m.pill)}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

const STEPS: FormStep[] = ['select-room', 'guest-data', 'review']
const STEP_LABELS = ['Quarto & Datas', 'Dados do Hóspede', 'Confirmação']

function Field({ label, icon: Icon, children, className = '', error }: any) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        {children}
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

const inputCls = (hasIcon = true, hasError = false) =>
  cn(
    'w-full py-2.5 rounded-lg border bg-white text-sm text-slate-800',
    'focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200 focus:border-[#001E3D] focus:ring-[#001E3D]/10',
    hasIcon ? 'pl-9 pr-3' : 'px-3'
  )

// ─── Terms Modal ─────────────────────────────────────────
function TermsModal({ onAccept, onCancel, isOpen }: { onAccept: () => void; onCancel: () => void; isOpen: boolean }) {
  const [policy, setPolicy] = useState<any>(null)
  useEffect(() => {
    if (isOpen) reservationsApi.getPolicy().then(r => setPolicy(r.data)).catch(console.error)
  }, [isOpen])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center"><FileWarning size={20} className="text-amber-600" /></div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[#001E3D]">Política de Cancelamento</h3>
              <p className="text-xs text-slate-400">Por favor, leia atentamente antes de prosseguir</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-emerald-600" /><span className="font-bold text-emerald-800">Cancelamento Gratuito</span></div>
            <p className="text-sm text-emerald-700">Cancelamentos com <strong>48 horas ou mais de antecedência</strong> do check-in têm <strong>reembolso TOTAL</strong>.</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 mb-2"><AlertCircle size={18} className="text-amber-600" /><span className="font-bold text-amber-800">Cancelamento com Taxa</span></div>
            <p className="text-sm text-amber-700">Com <strong>menos de 48 horas de antecedência</strong>, aplica-se uma taxa de <strong>{policy?.cancellationFeePercent ?? 20}%</strong> (mínimo {formatCurrency(policy?.minCancellationFee ?? 5000)}).</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2"><Clock size={18} className="text-blue-600" /><span className="font-bold text-blue-800">Informações</span></div>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Check-in a partir das 14h</li>
              <li>Check-out até às 12h</li>
              <li>Reservas pendentes requerem comprovativo de pagamento</li>
            </ul>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Recusar</button>
          <button onClick={onAccept} className="bg-[#001E3D] hover:bg-[#002d5c] text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><CheckCircle size={16} /> Aceitar e Continuar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Proof Viewer ─────────────────────────────────
function PaymentProofViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
  const isPdf = /\.pdf$/i.test(url)
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <a href={url} download className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-100"><Download size={18} /></a>
          <button onClick={onClose} className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-auto max-h-[90vh]">
          {isImage && <img src={url} alt="Comprovativo" className="w-full h-auto" />}
          {isPdf && <iframe src={url} className="w-full h-[80vh]" title="Comprovativo PDF" />}
          {!isImage && !isPdf && (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-slate-400 mb-4" />
              <a href={url} download className="mt-4 inline-block px-4 py-2 bg-[#001E3D] text-white rounded-lg">Baixar arquivo</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Checkout Modal ───────────────────────────────────────
function CheckoutModal({ reservation, onClose, onSuccess }: { reservation: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const scheduled = new Date(reservation.checkOut); scheduled.setHours(0, 0, 0, 0)
  const isEarly = today < scheduled

  const handleCheckout = async () => {
    if (!reason) { toast.error('Informe o motivo'); return }
    const finalReason = reason === 'Outro' ? otherReason.trim() : reason
    if (!finalReason) { toast.error('Descreva o motivo'); return }
    setLoading(true)
    try {
      await reservationsApi.checkOut(reservation.id, { earlyCheckoutReason: finalReason })
      toast.success('Check-out realizado!')
      onSuccess(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.error ?? 'Erro ao realizar check-out') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-serif font-bold text-[#001E3D]">{isEarly ? 'Check-out Antecipado' : 'Confirmar Check-out'}</h3>
        </div>
        <div className="p-6 space-y-4">
          {isEarly && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Saída antecipada detectada</p>}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Motivo *</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none">
              <option value="">Selecione...</option>
              <option>Fim da estadia programada</option>
              <option>Problemas pessoais/familiares</option>
              <option>Compromissos profissionais</option>
              <option>Insatisfação com o serviço</option>
              <option>Problemas com o quarto</option>
              <option>Emergência médica</option>
              <option>Mudança de planos</option>
              <option>Outro</option>
            </select>
          </div>
          {reason === 'Outro' && (
            <textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="Descreva o motivo..." rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none" />
          )}
        </div>
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium">Cancelar</button>
          <button onClick={handleCheckout} disabled={loading || !reason || (reason === 'Outro' && !otherReason.trim())} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? 'A processar...' : <><LogOut size={16} /> Confirmar Check-out</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Proof Form ───────────────────────────────────
function PaymentProofForm({ reservationId, onProofUploaded }: { reservationId: string; onProofUploaded: () => void }) {
  const qc = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      await reservationsApi.uploadPaymentProof(reservationId, selectedFile)
      qc.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Comprovativo enviado!')
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onProofUploaded()
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Erro ao enviar') }
    finally { setUploading(false) }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return }
    if (!['image/jpeg','image/png','image/jpg','application/pdf'].includes(f.type)) { toast.error('Use JPEG, PNG ou PDF'); return }
    setSelectedFile(f)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider"><Upload size={14} /><span>Pagamento Pendente — Anexar Comprovativo</span></div>
      <p className="text-xs text-amber-600">Faça o pagamento e envie o comprovativo para confirmar a reserva.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={handleChange}
          className="flex-1 text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#001E3D] file:text-white hover:file:bg-[#002d5c] cursor-pointer" />
        {selectedFile && (
          <button onClick={handleUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
            {uploading ? 'A enviar...' : 'Enviar'}
          </button>
        )}
      </div>
      {selectedFile && <p className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-600" /> {selectedFile.name}</p>}
    </div>
  )
}

// ─── Reschedule + Change Room Form ────────────────────────
function RescheduleForm({ reservation, onClose, onSuccess, isStaff, availableRooms }: {
  reservation: any; onClose: () => void; onSuccess: () => void; isStaff: boolean; availableRooms: any[]
}) {
  const [checkIn, setCheckIn] = useState(reservation.checkIn?.split('T')[0] ?? '')
  const [checkOut, setCheckOut] = useState(reservation.checkOut?.split('T')[0] ?? '')
  const [reason, setReason] = useState('')
  const [newRoomId, setNewRoomId] = useState('')
  const [loading, setLoading] = useState(false)
  const [roomConflict, setRoomConflict] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [roomAvailable, setRoomAvailable] = useState<boolean | null>(null)

  const pricePerNight = reservation.room?.pricePerNight ?? 0
  const origNights = Math.ceil((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86_400_000)
  const newNights  = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
  const diff = pricePerNight * (newNights - origNights)

  useEffect(() => {
    const checkAvailability = async () => {
      if (!newRoomId || !checkIn || !checkOut) {
        setRoomAvailable(null)
        return
      }
      setCheckingAvailability(true)
      try {
        const response = await reservationsApi.checkAvailability(
          newRoomId,
          checkIn,
          checkOut
        )
        setRoomAvailable(response.data.data.available)
        if (!response.data.data.available) {
          toast.error('Este quarto tem agendamento para esta data')
        }
      } catch {
        setRoomAvailable(false)
      } finally {
        setCheckingAvailability(false)
      }
    }
    checkAvailability()
  }, [newRoomId, checkIn, checkOut])

  const handleSubmit = async () => {
    if (!checkIn || !checkOut) { toast.error('Preencha as datas'); return }
    if (new Date(checkIn) >= new Date(checkOut)) { toast.error('Check-out deve ser posterior ao check-in'); return }
    setLoading(true)
    setRoomConflict(false)
    try {
      await reservationsApi.reschedule(reservation.id, {
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        reason: reason.trim(),
      })
      if (newRoomId && newRoomId !== reservation.roomId) {
        await reservationsApi.changeRoom(reservation.id, newRoomId)
      }
      toast.success('Reserva atualizada!')
      onSuccess(); onClose()
    } catch (e: any) {
      const status = e.response?.status
      const msg: string = e.response?.data?.message ?? e.response?.data?.error ?? ''
      if (status === 409 || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('disponível') || msg.toLowerCase().includes('occupied')) {
        setRoomConflict(true)
        toast.error('Este quarto tem agendamento para esta data. Selecione outro quarto abaixo.')
      } else {
        toast.error(msg || 'Erro ao remarcar')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-xl p-5 space-y-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Calendar size={16} className="text-[#001E3D]" />
        <h3 className="text-lg font-serif font-bold text-[#001E3D]">Remarcar Reserva</h3>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg">
        <p className="text-xs text-slate-500 mb-2">Período actual:</p>
        <div className="flex justify-between items-center">
          <div><p className="text-xs text-slate-400">Check-in</p><p className="text-sm font-semibold">{formatDate(reservation.checkIn)}</p></div>
          <ArrowRight size={16} className="text-slate-300" />
          <div><p className="text-xs text-slate-400">Check-out</p><p className="text-sm font-semibold">{formatDate(reservation.checkOut)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Check-in</label>
          <input type="date" min={isStaff ? undefined : new Date().toISOString().split('T')[0]}
            value={checkIn} onChange={e => setCheckIn(e.target.value)} disabled={!isStaff}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-400" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Novo Check-out *</label>
          <input type="date" min={checkIn}
            value={checkOut} onChange={e => setCheckOut(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Motivo</label>
        <input type="text" placeholder="Ex: Extensão de estadia" value={reason} onChange={e => setReason(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" />
      </div>

      {(roomConflict || newRoomId) && (
        <div className="space-y-2">
          {roomConflict && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle size={13} />
                Este quarto tem agendamento para esta data. Escolha outro quarto:
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {roomConflict ? 'Selecionar novo quarto *' : 'Trocar de quarto (opcional)'}
            </label>
            <select value={newRoomId} onChange={e => setNewRoomId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none">
              <option value="">Manter quarto actual</option>
              {availableRooms.filter(r => r.id !== reservation.roomId).map(r => (
                <option key={r.id} value={r.id}>#{r.number} — {r.type} · {formatCurrency(r.pricePerNight)}/noite</option>
              ))}
            </select>
          </div>
          {newRoomId && (
            <div className={`p-3 rounded-lg ${roomAvailable ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                  <span className="text-slate-500">Verificando disponibilidade...</span>
                </div>
              ) : roomAvailable ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle size={14} />
                  <span className="text-sm">Quarto disponível para o período</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle size={14} />
                  <span className="text-sm">Quarto indisponível para o período</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!roomConflict && !newRoomId && (
        <button onClick={() => setNewRoomId(' ')} className="text-xs text-[#001E3D] underline flex items-center gap-1">
          <RefreshCw size={12} /> Trocar de quarto
        </button>
      )}

      {newNights > 0 && (checkIn !== reservation.checkIn?.split('T')[0] || checkOut !== reservation.checkOut?.split('T')[0]) && (
        <div className={`p-3 rounded-lg ${diff > 0 ? 'bg-amber-50' : diff < 0 ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          <div className="flex justify-between text-sm"><span>Noites:</span><span className="font-semibold">{origNights} → {newNights}</span></div>
          {diff !== 0 && (
            <p className="text-xs pt-1">{diff > 0
              ? <span className="text-amber-600">➕ Valor adicional: {formatCurrency(diff)}</span>
              : <span className="text-emerald-600">➖ Valor a reembolsar: {formatCurrency(Math.abs(diff))}</span>}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || !checkIn || !checkOut || (roomConflict && !newRoomId) || (newRoomId && !roomAvailable)}
          className="flex-1 bg-[#001E3D] hover:bg-[#002d5c] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {loading ? 'A processar...' : 'Confirmar Alteração'}
        </button>
      </div>
    </div>
  )
}

// ─── Cancel Form ──────────────────────────────────────────
function CancelForm({ reservation, onClose, onSuccess }: { reservation: any; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [policy, setPolicy] = useState<any>(null)
  useEffect(() => { reservationsApi.getPolicy().then(r => setPolicy(r.data)).catch(console.error) }, [])

  const hoursUntil = (new Date(reservation.checkIn).getTime() - Date.now()) / 3_600_000
  const hasFee = hoursUntil < 48

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Informe o motivo'); return }
    setLoading(true)
    try {
      await reservationsApi.cancel(reservation.id, reason)
      toast.success('Reserva cancelada!')
      onSuccess(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Erro ao cancelar') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-xl p-5 space-y-4 max-w-md w-full">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <X size={16} className="text-red-600" />
        <h3 className="text-lg font-serif font-bold text-red-600">Cancelar Reserva</h3>
      </div>
      <div className={`p-3 rounded-lg ${hasFee ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
        {hasFee ? (
          <>
            <p className="text-xs font-bold text-amber-700 flex items-center gap-2 mb-1"><AlertCircle size={12} /> Cancelamento com taxa (menos de 48h)</p>
            <p className="text-xs text-amber-600">Taxa de {policy?.cancellationFeePercent ?? 50}% (mínimo {formatCurrency(policy?.minCancellationFee ?? 0)})</p>
            <p className="text-xs text-slate-500 mt-1">Reembolso aprox.: {formatCurrency((reservation.totalPrice ?? 0) * (1 - (policy?.cancellationFeePercent ?? 50) / 100))}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-2 mb-1"><CheckCircle size={12} /> Cancelamento gratuito</p>
            <p className="text-xs text-emerald-600">Reembolso total de {formatCurrency(reservation.totalPrice ?? 0)}</p>
          </>
        )}
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Motivo *</label>
        <textarea placeholder="Ex: Mudança de planos..." value={reason} onChange={e => setReason(e.target.value)}
          rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none" />
      </div>
      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
        <p className="text-xs text-red-700 flex items-center gap-2"><AlertCircle size={14} /> Esta ação não pode ser desfeita.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50">Voltar</button>
        <button onClick={handleSubmit} disabled={loading || !reason.trim()} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {loading ? 'A cancelar...' : 'Confirmar Cancelamento'}
        </button>
      </div>
    </div>
  )
}

// ─── Delete Form (Admin only) ─────────────────────────────
function DeleteForm({ reservation, onClose, onSuccess }: { reservation: any; onClose: () => void; onSuccess: () => void }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async () => {
    if (confirmText !== 'APAGAR') { toast.error('Digite APAGAR'); return }
    setLoading(true)
    try {
      await reservationsApi.delete(reservation.id)
      toast.success('Reserva apagada!')
      onSuccess(); onClose()
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Erro') }
    finally { setLoading(false) }
  }
  return (
    <div className="bg-white rounded-xl p-5 space-y-4 max-w-md w-full">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Trash2 size={16} className="text-red-600" />
        <h3 className="text-lg font-serif font-bold text-red-600">Apagar Permanentemente</h3>
      </div>
      <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-600">⚠️ Esta ação é irreversível.</div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Digite <span className="text-red-600">APAGAR</span> para confirmar *</label>
        <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="APAGAR" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono text-center focus:outline-none" />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || confirmText !== 'APAGAR'} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {loading ? 'A apagar...' : 'Apagar'}
        </button>
      </div>
    </div>
  )
}

// ─── Change Room Form ─────────────────────────────────────
function ChangeRoomForm({ reservation, onClose, onSuccess, rooms }: {
  reservation: any; onClose: () => void; onSuccess: () => void; rooms: any[]
}) {
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [roomAvailable, setRoomAvailable] = useState<boolean | null>(null)

  const selectedRoom = rooms.find(r => r.id === selectedRoomId)
  const currentRoom = reservation.room

  const checkRoomAvailability = async () => {
    if (!selectedRoomId) return
    setChecking(true)
    setRoomAvailable(null)
    try {
      const response = await reservationsApi.checkAvailability(
        selectedRoomId,
        reservation.checkIn.split('T')[0],
        reservation.checkOut.split('T')[0]
      )
      setRoomAvailable(response.data.data.available)
      if (!response.data.data.available) {
        toast.error('Este quarto tem agendamento para esta data')
      }
    } catch {
      toast.error('Erro ao verificar disponibilidade')
      setRoomAvailable(false)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => { if (selectedRoomId) checkRoomAvailability() }, [selectedRoomId])

  const handleSubmit = async () => {
    if (!selectedRoomId) { toast.error('Selecione um quarto'); return }
    if (!roomAvailable) { toast.error('Este quarto tem agendamento para esta data'); return }
    setLoading(true)
    try {
      await reservationsApi.changeRoom(reservation.id, selectedRoomId)
      toast.success(`Quarto alterado de #${currentRoom.number} para #${selectedRoom.number}`)
      onSuccess(); onClose()
    } catch (e: any) {
      const status = e.response?.status
      if (status === 409) {
        toast.error('Este quarto tem agendamento para esta data')
      } else {
        toast.error(e.response?.data?.message || 'Erro ao alterar quarto')
      }
    } finally {
      setLoading(false)
    }
  }

  const availableRoomsToChange = rooms.filter(r => r.state === 'VACANT_CLEAN' && r.id !== reservation.room?.id)

  return (
    <div className="bg-white rounded-xl p-5 space-y-4 max-w-md w-full">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <BedDouble size={16} className="text-indigo-600" />
        <h3 className="text-lg font-serif font-bold text-[#001E3D]">Trocar de Quarto</h3>
      </div>
      <div className="bg-slate-50 p-3 rounded-lg">
        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Quarto Actual</p>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-bold text-[#001E3D]">#{currentRoom.number}</p>
            <p className="text-xs text-slate-500">{currentRoom.type}</p>
          </div>
          <ArrowRight size={20} className="text-slate-400" />
          <div className="text-right">
            <p className="text-xs text-slate-400">Diária</p>
            <p className="text-sm font-semibold">{formatCurrency(currentRoom.pricePerNight)}</p>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Novo Quarto *</label>
        <select value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:outline-none text-sm">
          <option value="">Selecione um quarto...</option>
          {availableRoomsToChange.map((room: any) => (
            <option key={room.id} value={room.id}>Quarto {room.number} - {room.type} · {formatCurrency(room.pricePerNight)}/noite</option>
          ))}
        </select>
      </div>
      {selectedRoomId && (
        <div className={`p-3 rounded-lg ${roomAvailable ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          {checking ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 size={14} className="animate-spin text-indigo-600" />
              <span className="text-slate-500">Verificando disponibilidade...</span>
            </div>
          ) : roomAvailable ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle size={16} /><span className="text-sm">Quarto disponível para o período</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle size={16} /><span className="text-sm">Este quarto tem agendamento para esta data</span>
            </div>
          )}
          {selectedRoom && roomAvailable && (
            <div className="mt-2 pt-2 border-t border-emerald-200">
              <div className="flex justify-between text-sm">
                <span>Diferença de diária:</span>
                <span className={selectedRoom.pricePerNight !== currentRoom.pricePerNight ? 'font-bold' : ''}>
                  {formatCurrency(currentRoom.pricePerNight)} → {formatCurrency(selectedRoom.pricePerNight)}
                </span>
              </div>
              {selectedRoom.pricePerNight !== currentRoom.pricePerNight && (
                <p className="text-xs mt-1 text-slate-500">
                  {selectedRoom.pricePerNight > currentRoom.pricePerNight
                    ? `➕ Adicional de ${formatCurrency(selectedRoom.pricePerNight - currentRoom.pricePerNight)} por noite`
                    : `➖ Desconto de ${formatCurrency(currentRoom.pricePerNight - selectedRoom.pricePerNight)} por noite`}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || !selectedRoomId || !roomAvailable || checking}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          {loading ? 'A processar...' : 'Confirmar Troca'}
        </button>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────
function ReservationDetailPanel({ reservation: r, onClose, isStaff, isClient, isAdmin, onAction, refetch, availableRooms }: any) {
  const { user: currentUser } = useAuthStore()

  const isOwnReservation = isClient && (r.user?.id === currentUser?.id || r.userId === currentUser?.id || r.guestId === currentUser?.id || r.guest?.email === currentUser?.email)
  const canActAsClient = !isStaff && isOwnReservation

  const [showProof, setShowProof] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showPayMethod, setShowPayMethod] = useState(false)
  const [showUploadProof, setShowUploadProof] = useState(false)
  const [payMethod, setPayMethod] = useState('CASH')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const nights = Math.ceil((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86_400_000)
  const today = new Date(); today.setHours(0,0,0,0)
  const ciDate = new Date(r.checkIn); ciDate.setHours(0,0,0,0)

  const st = (r.status ?? '').toUpperCase()
  const canCheckIn = st === 'CONFIRMED' && ciDate.getTime() <= today.getTime()
  const canCheckOut = st === 'CHECKED_IN'
  const canCancel = ['CONFIRMED','PENDING'].includes(st)
  const canReschedule = ['PENDING','CONFIRMED'].includes(st)

  const clientCanUploadProof = canActAsClient && st === 'PENDING' && !r.paymentProofUrl
  const clientCanCancel = canActAsClient && st === 'CONFIRMED'
  const clientCanReschedule = canActAsClient && st === 'CONFIRMED'

  const name = r.guest?.name ?? r.user?.name ?? 'Hóspede'

  const handlePayConfirm = () => { onAction(r.id, 'pay', { method: payMethod }); setShowPayMethod(false); onClose() }

  const handleUploadProof = async () => {
    if (!selectedFile) { toast.error('Selecione um arquivo'); return }
    setUploading(true)
    try {
      await reservationsApi.uploadPaymentProof(r.id, selectedFile)
      toast.success('Comprovativo enviado com sucesso!')
      setShowUploadProof(false); setSelectedFile(null); refetch()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao enviar comprovativo')
    } finally { setUploading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="bg-[#001E3D] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black tracking-widest text-amber-400 uppercase mb-1">Detalhes da Reserva</p>
              <h2 className="text-xl font-serif font-bold text-white">{name}</h2>
              <p className="text-slate-300 text-sm mt-0.5">Quarto #{r.room?.number} · {r.room?.type}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} className="text-white/70" /></button>
          </div>
          <StatusPill status={r.status} />
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 flex-shrink-0">
          {[['Check-in', formatDate(r.checkIn)], ['Check-out', formatDate(r.checkOut)], ['Noites', `${nights}n`]].map(([label, value]) => (
            <div key={label} className="px-3 py-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
  
<section>
  <div className="flex items-center gap-1.5 mb-3">
    <DollarSign size={12} className="text-slate-400" />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro</p>
  </div>
  <div className="space-y-1">
    {[
      ['Diária', formatCurrency(r.room?.pricePerNight ?? 0)],
      ['Noites', `× ${nights}`],
    ].map(([l, v]) => (
      <div key={l} className="flex justify-between py-1.5 border-b border-slate-50">
        <span className="text-xs text-slate-400">{l}</span>
        <span className="text-xs font-semibold text-slate-700">{v}</span>
      </div>
    ))}
    
    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
      <span className="text-sm font-bold text-[#001E3D]">Total</span>
      <span className="text-xl font-black text-[#001E3D] font-serif">
        {formatCurrency(r.totalPrice ?? r.totalAmount ?? 0)}
      </span>
    </div>

    {/* ✅ VALOR PAGO */}
    {r.amountPaid > 0 && (
      <div className="flex justify-between py-1.5">
        <span className="text-xs text-slate-400">Valor Pago</span>
        <span className="text-xs font-semibold text-emerald-600">
          {formatCurrency(r.amountPaid)}
        </span>
      </div>
    )}

    {/*  REEMBOLSO (Check-out antecipado) */}
    {r.refundAmount !== null && r.refundAmount > 0 && (
      <div className="flex justify-between py-1.5 bg-emerald-50 -mx-2 px-2 rounded-lg border border-emerald-100">
        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
          <RefreshCw size={12} /> Reembolso (Check-out antecipado)
        </span>
        <span className="text-xs font-bold text-emerald-700">
          {formatCurrency(r.refundAmount)}
        </span>
      </div>
    )}

    {/* TAXA LATE CHECKOUT */}
    {r.lateFeeAmount > 0 && (
      <div className="flex justify-between py-1.5 bg-amber-50 -mx-2 px-2 rounded-lg border border-amber-200">
        <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
          <Clock size={12} /> Taxa Late Checkout {!r.lateFeeConfirmed && '⚠️'}
        </span>
        <span className="text-xs font-bold text-amber-700">
          +{formatCurrency(r.lateFeeAmount)}
        </span>
      </div>
    )}

    {/*  TAXA DE CANCELAMENTO */}
    {r.cancellationFee !== null && r.cancellationFee > 0 && (
      <div className="flex justify-between py-1.5 bg-red-50 -mx-2 px-2 rounded-lg border border-red-200">
        <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
          <X size={12} /> Taxa de Cancelamento
        </span>
        <span className="text-xs font-bold text-red-700">
          -{formatCurrency(r.cancellationFee)}
        </span>
      </div>
    )}

    {/*  CARGA EXTRA */}
    {r.extraCharge > 0 && (
      <div className="flex justify-between py-1.5 bg-blue-50 -mx-2 px-2 rounded-lg border border-blue-200">
        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
          <Plus size={12} /> Carga Extra
        </span>
        <span className="text-xs font-bold text-blue-700">
          +{formatCurrency(r.extraCharge)}
        </span>
      </div>
    )}

    {r.paymentProofUrl && (
      <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
          <CheckCircle size={13} /> Comprovativo Anexado
        </span>
        <button onClick={() => setShowProof(true)} className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
          <Eye size={12} /> Ver
        </button>
      </div>
    )}

    {/*  MOTIVO DO CHECK-OUT ANTECIPADO */}
    {r.earlyCheckoutReason && (
      <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">
          Motivo do Check-out Antecipado
        </p>
        <p className="text-xs text-amber-800">{r.earlyCheckoutReason}</p>
      </div>
    )}

    {/*  MOTIVO DO CANCELAMENTO */}
    {r.cancellationReason && (
      <div className="mt-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">
          Motivo do Cancelamento
        </p>
        <p className="text-xs text-red-800">{r.cancellationReason}</p>
      </div>
    )}
  </div>
</section>

            <section>
              <div className="flex items-center gap-1.5 mb-3"><User size={12} className="text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hóspede</p></div>
              <div className="space-y-1">
                {[
                  ['Nome', name],
                  ['Email', r.guest?.email ?? r.user?.email ?? '—'],
                  ['Telefone', r.guest?.phone ?? r.user?.phone ?? '—'],
                  ['Documento', r.guest?.idDocument ?? '—'],
                  ['País', r.guest?.country ?? '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-400">{l}</span><span className="text-xs font-semibold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-1.5 mb-3"><BedDouble size={12} className="text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quarto</p></div>
              <div className="space-y-1">
                {[['Número', `#${r.room?.number}`], ['Tipo', r.room?.type ?? '—'], ['Capacidade', r.room?.capacity ? `${r.room.capacity} hóspedes` : '—']].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-xs text-slate-400">{l}</span><span className="text-xs font-semibold text-slate-700">{v}</span></div>
                ))}
              </div>
            </section>

            {r.notes && (
              <section>
                <div className="flex items-center gap-1.5 mb-3"><StickyNote size={12} className="text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</p></div>
                <p className="text-sm text-slate-600">{r.notes}</p>
              </section>
            )}
          </div>
        </div>

        {(isStaff || clientCanCancel || clientCanReschedule || clientCanUploadProof) && !['COMPLETED','CANCELLED','EXPIRED'].includes(st) && (
          <div className="border-t border-slate-100 px-6 py-4 flex-shrink-0 bg-slate-50/80">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{isStaff ? 'Ações Administrativas' : 'Ações Disponíveis'}</p>
            <div className="flex flex-wrap gap-2">
              {isStaff && st === 'PENDING' && (
                <button onClick={() => setShowPayMethod(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CreditCard size={13} /> Confirmar Pagamento
                </button>
              )}
              {isStaff && st === 'CONFIRMED' && (
                <button onClick={() => canCheckIn ? (onAction(r.id,'checkin'), onClose()) : toast.error(`Check-in disponível a partir de ${formatDate(r.checkIn)}`)}
                  disabled={!canCheckIn}
                  className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold', canCheckIn ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}>
                  <LogIn size={13} /> {canCheckIn ? 'Check-in' : `Check-in em ${formatDate(r.checkIn)}`}
                </button>
              )}
              {isStaff && canCheckOut && (
                <button onClick={() => setShowCheckout(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white">
                  <LogOut size={13} /> Check-out
                </button>
              )}
              {isStaff && canReschedule && (
                <button onClick={() => setShowReschedule(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Edit2 size={13} /> Remarcar
                </button>
              )}
              {isStaff && canCancel && (
                <button onClick={() => setShowCancel(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200">
                  <X size={13} /> Cancelar
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white">
                  <Trash2 size={13} /> Apagar
                </button>
              )}
              {clientCanUploadProof && (
                <button onClick={() => setShowUploadProof(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200">
                  <Upload size={13} /> Enviar Comprovativo
                </button>
              )}
              {clientCanReschedule && (
                <button onClick={() => {
                  toast.custom((t) => (
                    <div className="bg-white rounded-xl shadow-xl p-4 max-w-sm border-l-4 border-indigo-500">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0"><Edit2 size={18} className="text-indigo-600" /></div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-sm">Solicitar Remarcação</h4>
                          <p className="text-xs text-slate-500 mt-1">Para remarcar a sua reserva, abra um ticket de suporte com:</p>
                          <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                            <li>Novas datas desejadas</li>
                            <li>Preferência de quarto (se houver)</li>
                            <li>Motivo da remarcação</li>
                          </ul>
                          <button onClick={() => toast.dismiss(t.id)} className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700">Entendi</button>
                        </div>
                      </div>
                    </div>
                  ), { duration: 6000 })
                }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200">
                  <Edit2 size={13} /> Solicitar Remarcação
                </button>
              )}
              {clientCanCancel && (
                <button onClick={() => {
                  toast.custom((t) => (
                    <div className="bg-white rounded-xl shadow-xl p-4 max-w-sm border-l-4 border-red-500">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><X size={18} className="text-red-600" /></div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-sm">Solicitar Cancelamento</h4>
                          <p className="text-xs text-slate-500 mt-1">Para cancelar a sua reserva, abra um ticket de suporte com:</p>
                          <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                            <li>Motivo do cancelamento</li>
                            <li>Informações de contacto</li>
                          </ul>
                          <button onClick={() => toast.dismiss(t.id)} className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700">Entendi</button>
                        </div>
                      </div>
                    </div>
                  ), { duration: 6000 })
                }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200">
                  <X size={13} /> Solicitar Cancelamento
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showUploadProof && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-serif font-bold text-[#001E3D]">Enviar Comprovativo</h3>
              
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 flex items-center gap-2"><AlertCircle size={14} /> Faça o pagamento e anexe o comprovativo para confirmar a sua reserva.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comprovativo de Pagamento *</label>
                <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 5MB'); return }
                      setSelectedFile(file)
                    }
                  }}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#001E3D] file:text-white hover:file:bg-[#002d5c] cursor-pointer" />
                {selectedFile && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle size={12} /> {selectedFile.name}</p>}
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => { setShowUploadProof(false); setSelectedFile(null) }} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleUploadProof} disabled={uploading || !selectedFile} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {uploading ? 'A enviar...' : <><Upload size={14} /> Enviar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayMethod && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="border-b border-slate-100 px-6 py-4"><h3 className="text-lg font-serif font-bold text-[#001E3D]">Método de Pagamento</h3></div>
            <div className="p-6 space-y-2">
              {[['CASH','Dinheiro à  Mão'],['CARD','Cartão'],['TRANSFER','Transferência']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="radio" name="pm" value={v} checked={payMethod === v} onChange={() => setPayMethod(v)} className="w-4 h-4" />
                  <span className="text-sm font-medium">{l}</span>
                </label>
              ))}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowPayMethod(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancelar</button>
              <button onClick={handlePayConfirm} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showProof && r.paymentProofUrl && <PaymentProofViewer url={r.paymentProofUrl} onClose={() => setShowProof(false)} />}
      {showCheckout && <CheckoutModal reservation={r} onClose={() => setShowCheckout(false)} onSuccess={() => { refetch(); onClose() }} />}
      {showReschedule && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <RescheduleForm reservation={r} isStaff={isStaff} availableRooms={availableRooms}
            onClose={() => setShowReschedule(false)}
            onSuccess={() => { refetch(); setShowReschedule(false); onClose() }} />
        </div>
      )}
      {showCancel && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <CancelForm reservation={r} onClose={() => setShowCancel(false)} onSuccess={() => { refetch(); setShowCancel(false); onClose() }} />
        </div>
      )}
      {showDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <DeleteForm reservation={r} onClose={() => setShowDelete(false)} onSuccess={() => { refetch(); setShowDelete(false); onClose() }} />
        </div>
        
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────
export default function ReservationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const roomIdFromUrl = searchParams.get('roomId')
  const { user: currentUser } = useAuthStore()
  const isStaff = ['ADMIN','MANAGER','RECEPTION'].includes(currentUser?.role ?? '')
  const isAdmin = currentUser?.role === 'ADMIN'
  const isClient = currentUser?.role === 'CLIENT'

  const [tab, setTab] = useState<ReservationStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [currentStep, setCurrentStep] = useState<FormStep>('select-room')
  const [selectedRes, setSelectedRes] = useState<any | null>(null)

  const [guestErrors, setGuestErrors] = useState<Record<string, string | null>>({})

  // --- Availability Check States ---
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [roomAvailable, setRoomAvailable] = useState<boolean | null>(null)
  const [availabilitySuggestion, setAvailabilitySuggestion] = useState<any | null>(null)

  // --- Calendar States ---
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [occupiedDates, setOccupiedDates] = useState<string[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)

  const emptyGuest = () => ({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    phone: '',
    idDocument: '',
    province: '',
    country: 'Angola',
    isForeigner: false,
  })
  const emptyForm = () => ({ roomId:'', checkIn:'', checkOut:'', adults:'1', children:'0', notes:'', userId:'', guest: emptyGuest() })

  const loadCachedForm = () => {
    if (!isClient) return emptyForm()
    try {
      const raw = localStorage.getItem(FORM_CACHE_KEY)
      if (!raw) return emptyForm()
      const parsed = JSON.parse(raw)
      return { ...emptyForm(), ...parsed, guest: { ...emptyGuest(), ...(parsed.guest ?? {}) } }
    } catch { return emptyForm() }
  }

  const [form, setForm] = useState(loadCachedForm)

  useEffect(() => {
    if (isClient && showCreate) {
      try { localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(form)) } catch {}
    }
  }, [form, isClient, showCreate])

  const clearCache = () => { try { localStorage.removeItem(FORM_CACHE_KEY) } catch {} }

  // --- Fetch occupied dates ---
  const fetchOccupiedDates = async (roomId: string, month: number, year: number) => {
    if (!roomId) return
    setLoadingCalendar(true)
    try {
      const response = await reservationsApi.getAvailableDates(roomId, month, year)
      if (response.data.success) {
        const allDates = response.data.data.availableDates
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        const occupied: string[] = []
        const current = new Date(startDate)
        while (current <= endDate) {
          const dateStr = current.toISOString().split('T')[0]
          if (!allDates.includes(dateStr)) {
            occupied.push(dateStr)
          }
          current.setDate(current.getDate() + 1)
        }
        setOccupiedDates(occupied)
      }
    } catch (error) {
      console.error('Erro ao buscar datas ocupadas:', error)
    } finally {
      setLoadingCalendar(false)
    }
  }

  // --- Change month ---
  const changeMonth = (delta: number) => {
    const newDate = new Date(calendarMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCalendarMonth(newDate)
    if (form.roomId) {
      const month = newDate.getMonth() + 1
      const year = newDate.getFullYear()
      fetchOccupiedDates(form.roomId, month, year)
    }
  }

  // --- Check Availability Function ---
  const checkRoomAvailability = async () => {
    if (!form.roomId || !form.checkIn || !form.checkOut) {
      setRoomAvailable(null)
      setAvailabilitySuggestion(null)
      return
    }

    setCheckingAvailability(true)
    setRoomAvailable(null)
    setAvailabilitySuggestion(null)

    try {
      const response = await reservationsApi.checkAvailability(
        form.roomId,
        form.checkIn,
        form.checkOut
      )

      if (response.data.success) {
        const { available, suggestion } = response.data.data
        setRoomAvailable(available)
        setAvailabilitySuggestion(suggestion)

        if (!available && suggestion) {
          toast.custom((t) => (
            <div className="bg-white rounded-xl shadow-xl p-4 max-w-sm border-l-4 border-amber-500">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Quarto indisponível</h4>
                  <p className="text-xs text-slate-500 mt-1">Sugestão: Quarto {suggestion.number} - {formatCurrency(suggestion.pricePerNight)}/noite</p>
                  <button 
                    onClick={() => {
                      setForm(f => ({ ...f, roomId: suggestion.id }))
                      setRoomAvailable(null)
                      setAvailabilitySuggestion(null)
                      toast.dismiss(t.id)
                    }}
                    className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    Selecionar este quarto →
                  </button>
                </div>
              </div>
            </div>
          ), { duration: 10000 })
        }
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error)
    } finally {
      setCheckingAvailability(false)
    }
  }

  // Debounce para verificar disponibilidade
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.roomId && form.checkIn && form.checkOut) {
        checkRoomAvailability()
      } else {
        setRoomAvailable(null)
        setAvailabilitySuggestion(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.roomId, form.checkIn, form.checkOut])

  // Fetch occupied dates when room or month changes
  useEffect(() => {
    if (form.roomId && showCreate) {
      const month = calendarMonth.getMonth() + 1
      const year = calendarMonth.getFullYear()
      fetchOccupiedDates(form.roomId, month, year)
    }
  }, [form.roomId, calendarMonth, showCreate])

  const { data: reservations = [], isLoading, refetch } = useQuery({
    queryKey: ['reservations', currentUser?.id, isClient],
    queryFn: async () => {
      const res = isClient ? await reservationsApi.getMine() : await reservationsApi.list()
      return res.data
    },
    enabled: !!currentUser,
  })

  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: () => roomsApi.list().then(r => r.data) })
  const availableRooms = (rooms as any[]).filter((r: any) => r.state === 'VACANT_CLEAN' || r.status === 'available')
  const selectedRoom = (rooms as any[]).find((r: any) => r.id === form.roomId)
  const nights = (!form.checkIn || !form.checkOut) ? 0 : Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86_400_000)
  const totalPrice = selectedRoom ? selectedRoom.pricePerNight * nights : 0

  const canProceedToGuestData = !!(form.roomId && form.checkIn && form.checkOut && nights > 0 && roomAvailable !== false)

  const validateGuestForm = (): boolean => {
    const errors: Record<string, string | null> = {
      name: validateName(form.guest.name),
      email: validateEmail(form.guest.email),
      phone: validatePhone(form.guest.phone),
      idDocument: validateIdDocument(form.guest.idDocument, form.guest.country),
    }
    setGuestErrors(errors)
    return Object.values(errors).every(e => e === null)
  }

  const canProceedToReview = !!(form.guest.name && form.guest.email && form.guest.phone && form.guest.idDocument)

  const handleGuestBlur = (field: string, value: string) => {
    let err: string | null = null
    if (field === 'name') err = validateName(value)
    if (field === 'email') err = validateEmail(value)
    if (field === 'phone') err = validatePhone(value)
    if (field === 'idDocument') err = validateIdDocument(value, form.guest.country)
    setGuestErrors(prev => ({ ...prev, [field]: err }))
  }

  useEffect(() => {
    if (roomIdFromUrl) {
      setForm(prev => ({ ...prev, roomId: roomIdFromUrl }))
      setShowCreate(true); setCurrentStep('select-room')
      setSearchParams({}, { replace: true })
    }
  }, [roomIdFromUrl, isStaff])

  const handleStartReservation = () => {
    if (isClient) { setShowTerms(true) } else { setShowCreate(true); setCurrentStep('select-room') }
  }

  const createMutation = useMutation({
    mutationFn: () => reservationsApi.create({
      roomId: form.roomId,
      checkIn: new Date(form.checkIn).toISOString(),
      checkOut: new Date(form.checkOut).toISOString(),
      userId: (isStaff && form.userId) ? form.userId : currentUser?.id,
      guest: { ...form.guest, isForeigner: form.guest.country !== 'Angola' },
      adults: parseInt(form.adults),
      children: parseInt(form.children),
      notes: form.notes,
    }),
    onSuccess: () => {
      refetch(); clearCache()
      setShowCreate(false); setForm(emptyForm()); setCurrentStep('select-room')
      setRoomAvailable(null); setAvailabilitySuggestion(null)
      toast.success('Reserva registada!')
    },
    onError: (e: any) => {
      const status = e.response?.status
      if (status === 409) {
        toast.error('Este quarto tem agendamento para esta data. Escolha outro quarto ou outro período.')
      } else {
        toast.error(e.response?.data?.message ?? 'Erro ao criar reserva')
      }
    },
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action, data }: { id: string; action: string; data?: any }) => {
      const map: Record<string, () => any> = {
        pay: () => reservationsApi.pay(id, data?.method ?? 'CASH'),
        checkin: () => reservationsApi.checkIn(id),
        checkout: () => reservationsApi.checkOut(id),
      }
      const fn = map[action]; if (!fn) throw new Error(`Ação desconhecida: ${action}`)
      return fn()
    },
    onSuccess: (_, { action }) => {
      refetch()
      const labels: Record<string, string> = { pay: 'Pagamento confirmado!', checkin: 'Check-in efetuado!', checkout: 'Check-out concluído!' }
      toast.success(labels[action] ?? 'Operação concluída')
    },
    onError: (e: any) => {
      const status = e.response?.status
      if (status === 409) {
        toast.error('Este quarto tem agendamento para esta data.')
      } else {
        toast.error(e.response?.data?.message ?? 'Erro')
      }
    },
  })

  const countByStatus = (reservations as any[]).reduce((acc: Record<string, number>, r: any) => {
    const k = (r.status ?? '').toLowerCase(); acc[k] = (acc[k] ?? 0) + 1; return acc
  }, {})

  const filtered = (reservations as any[]).filter((r: any) => {
    const matchTab = tab === 'all' || (r.status ?? '').toLowerCase() === tab
    const q = search.trim().toLowerCase()
    const matchSearch = !q || r.guest?.name?.toLowerCase().includes(q) || r.room?.number?.toString().includes(q)
    return matchTab && matchSearch
  })

  const stepIndex = STEPS.indexOf(currentStep)
  const avatarColors = ['bg-indigo-100 text-indigo-700','bg-teal-100 text-teal-700','bg-rose-100 text-rose-700','bg-amber-100 text-amber-700']

  const handleDeleteAllExpired = async () => {
    const expired = (reservations as any[]).filter(r => (r.status ?? '').toLowerCase() === 'expired')
    if (!expired.length) { toast.error('Sem reservas expiradas'); return }
    if (!window.confirm(`Apagar ${expired.length} reserva(s) expirada(s)?`)) return
    let ok = 0
    for (const res of expired) { try { await reservationsApi.delete(res.id); ok++ } catch {} }
    toast.success(`${ok} apagada(s)`); refetch()
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <TermsModal isOpen={showTerms} onAccept={() => { setShowTerms(false); setShowCreate(true); setCurrentStep('select-room') }} onCancel={() => setShowTerms(false)} />

      {!showCreate ? (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-1">{isStaff ? 'Painel de Gestão' : 'Área do Hóspede'}</p>
              <h1 className="text-3xl font-serif font-bold text-[#001E3D]">{isStaff ? 'Reservas' : 'Minhas Reservas'}</h1>
              <p className="text-sm text-slate-400 mt-1">{filtered.length} de {(reservations as any[]).length} reserva(s)</p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button onClick={handleDeleteAllExpired} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md">
                  <Trash2 size={15} /> Apagar Expiradas
                </button>
              )}
              <button onClick={handleStartReservation} className="flex items-center gap-2 bg-[#001E3D] hover:bg-[#002d5c] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md">
                <Plus size={15} /> {isStaff ? 'Nova Reserva' : 'Reservar Quarto'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none" placeholder="Pesquisar por hóspede ou quarto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_TABS.map(t => {
                  const count = t.value === 'all' ? (reservations as any[]).length : (countByStatus[t.value] ?? 0)
                  return (
                    <button key={t.value} onClick={() => setTab(t.value)}
                      className={cn('px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                        tab === t.value ? 'bg-[#001E3D] border-[#001E3D] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                      {t.label} {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 ml-1">{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="mx-auto text-slate-300 mb-3" size={36} />
                <h3 className="text-sm font-bold text-slate-700">Nenhuma reserva encontrada</h3>
                <button onClick={handleStartReservation} className="mt-3 px-3 py-1.5 bg-[#001E3D] text-white rounded-lg text-xs font-semibold">Criar Reserva</button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {!isClient && <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Hóspede</th>}
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Quarto</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Check-in</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Check-out</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Total</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Estado</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400">Comprovativo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any, i: number) => (
                    <tr key={r.id} onClick={() => setSelectedRes(r)} className="border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer group">
                      {!isClient && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', avatarColors[i % avatarColors.length])}>
                              {(r.guest?.name || r.user?.name || 'H').charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{r.guest?.name || r.user?.name}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-4 text-sm font-medium text-slate-700">#{r.room?.number}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(r.checkIn)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(r.checkOut)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-800">{formatCurrency(r.totalPrice ?? r.totalAmount ?? 0)}</td>
                      <td className="px-5 py-4"><StatusPill status={r.status} /></td>
                      <td className="px-5 py-4">
                        {r.paymentProofUrl
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={12} /> Anexado</span>
                          : (r.status?.toLowerCase() === 'pending')
                            ? <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertCircle size={12} /> Pendente</span>
                            : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4"><ChevronRight size={15} className="text-slate-300 group-hover:text-[#001E3D]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 bg-[#F8F7F4] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
            <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#001E3D] rounded-xl flex items-center justify-center"><Home size={17} className="text-white" /></div>
                <div>
                  <p className="text-xs font-black text-amber-600 uppercase">Nova Reserva</p>
                  <p className="text-sm font-semibold text-[#001E3D]">{STEP_LABELS[stepIndex]}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className={cn('w-2 h-2 rounded-full transition-all', i === stepIndex ? 'bg-[#001E3D] w-4' : i < stepIndex ? 'bg-emerald-500' : 'bg-slate-200')} />
                ))}
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-5 py-8">
            {currentStep === 'select-room' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <BedDouble size={16} className="text-[#001E3D]" />
                    <h3 className="font-serif font-bold">Escolha o quarto e as datas</h3>
                  </div>

                  {/* Seleção de Quarto */}
                  <Field label="Quarto disponível *">
                    <select className={inputCls(false) + ' pl-3'} value={form.roomId} onChange={e => {
                      setForm(f => ({ ...f, roomId: e.target.value }))
                      setOccupiedDates([])
                    }}>
                      <option value="">Selecione...</option>
                      {availableRooms.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          Quarto {r.number} — {r.type} · {formatCurrency(r.pricePerNight)}/noite
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Calendário de Disponibilidade */}
                  {form.roomId && (
                    <div className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="font-semibold text-slate-700">
                          {format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded">
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      {loadingCalendar ? (
                        <div className="flex justify-center py-8">
                          <Loader2 size={24} className="animate-spin text-[#001E3D]" />
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                              <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {eachDayOfInterval({
                              start: startOfMonth(calendarMonth),
                              end: endOfMonth(calendarMonth)
                            }).map((date) => {
                              const dateStr = format(date, 'yyyy-MM-dd')
                              const isOccupied = occupiedDates.includes(dateStr)
                              const isSelected = dateStr === form.checkIn || dateStr === form.checkOut
                              const isToday = isSameDay(date, new Date())
                              const isPast = date < new Date() && !isToday
                              const isAvailable = !isOccupied && !isPast && form.roomId

                              return (
                                <button
                                  key={dateStr}
                                  onClick={() => {
                                    if (!isAvailable) return
                                    if (!form.checkIn || (form.checkIn && form.checkOut)) {
                                      setForm(f => ({ ...f, checkIn: dateStr, checkOut: '' }))
                                    } else {
                                      const checkInDate = new Date(form.checkIn)
                                      if (date > checkInDate) {
                                        setForm(f => ({ ...f, checkOut: dateStr }))
                                      } else {
                                        toast.error('Check-out deve ser após o check-in')
                                      }
                                    }
                                  }}
                                  disabled={!isAvailable}
                                  className={cn(
                                    'p-2 text-center rounded-lg text-sm transition-all',
                                    isOccupied && 'bg-red-50 text-red-400 cursor-not-allowed opacity-60',
                                    isPast && !isOccupied && 'bg-slate-50 text-slate-300 cursor-not-allowed',
                                    isAvailable && !isSelected && 'hover:bg-teal-50 hover:border-teal-200 cursor-pointer border border-transparent',
                                    isSelected && 'bg-[#001E3D] text-white font-bold',
                                    isToday && !isSelected && !isOccupied && 'border-2 border-[#001E3D]',
                                    isAvailable && 'hover:shadow-sm'
                                  )}
                                >
                                  {format(date, 'd')}
                                  {isOccupied && <span className="block text-[8px] text-red-400">✕</span>}
                                  {isAvailable && !isOccupied && !isSelected && <span className="block text-[8px] text-green-500">●</span>}
                                  {isSelected && <span className="block text-[8px] text-white/70">
                                    {dateStr === form.checkIn ? 'Check-in' : 'Check-out'}
                                  </span>}
                                </button>
                              )
                            })}
                          </div>

                          <div className="mt-3 flex gap-4 text-xs flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 bg-[#001E3D] rounded"></div>
                              <span className="text-slate-600">Selecionado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-slate-600">Disponível</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                              <span className="text-slate-600">Ocupado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 bg-slate-200 rounded"></div>
                              <span className="text-slate-600">Passado</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Resumo da seleção */}
                  {form.checkIn && (
                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-teal-600 font-medium">Check-in</p>
                          <p className="font-bold text-teal-800">{formatDate(form.checkIn)}</p>
                        </div>
                        <ArrowRight size={20} className="text-teal-400" />
                        <div>
                          <p className="text-xs text-teal-600 font-medium">Check-out</p>
                          <p className="font-bold text-teal-800">
                            {form.checkOut ? formatDate(form.checkOut) : 'Selecione a saída'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indicador de Disponibilidade */}
                  {form.roomId && form.checkIn && form.checkOut && (
                    <div className={`p-4 rounded-xl border ${
                      checkingAvailability 
                        ? 'bg-slate-50 border-slate-200' 
                        : roomAvailable === true 
                          ? 'bg-emerald-50 border-emerald-200' 
                          : roomAvailable === false 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-slate-50 border-slate-200'
                    }`}>
                      {checkingAvailability ? (
                        <div className="flex items-center gap-3">
                          <Loader2 size={18} className="animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">Verificando disponibilidade...</span>
                        </div>
                      ) : roomAvailable === true ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle size={18} className="text-emerald-600" />
                          <div>
                            <span className="text-sm font-semibold text-emerald-700">✓ Quarto disponível!</span>
                            <p className="text-xs text-emerald-600">Pode prosseguir com a reserva</p>
                          </div>
                        </div>
                      ) : roomAvailable === false ? (
                        <div className="flex items-start gap-3">
                          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-red-700">✗ Quarto indisponível</span>
                            <p className="text-xs text-red-600">Este quarto tem agendamento para o período selecionado</p>
                            {availabilitySuggestion && (
                              <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-xs font-medium text-amber-700">💡 Sugestão:</p>
                                <p className="text-xs text-amber-700">
                                  Quarto {availabilitySuggestion.number} - {formatCurrency(availabilitySuggestion.pricePerNight)}/noite
                                </p>
                                <button 
                                  onClick={() => {
                                    setForm(f => ({ ...f, roomId: availabilitySuggestion.id }))
                                    setRoomAvailable(null)
                                    setAvailabilitySuggestion(null)
                                    setOccupiedDates([])
                                    setCalendarMonth(new Date())
                                  }}
                                  className="mt-1 text-xs font-semibold text-amber-700 hover:underline"
                                >
                                  Selecionar este quarto
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {nights > 0 && selectedRoom && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Moon size={16} className="text-amber-600" />
                        <span className="text-sm font-medium">{nights} {nights === 1 ? 'noite' : 'noites'}</span>
                      </div>
                      <p className="text-lg font-black text-[#001E3D]">{formatCurrency(totalPrice)}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button 
                    disabled={!canProceedToGuestData} 
                    onClick={() => setCurrentStep('guest-data')}
                    className="flex items-center gap-2 bg-[#001E3D] hover:bg-[#002d5c] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md disabled:opacity-40"
                  >
                    Continuar <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'guest-data' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b"><User size={16} className="text-[#001E3D]" /><h3 className="font-serif font-bold">Dados do hóspede</h3></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome completo *" icon={User} className="sm:col-span-2" error={guestErrors.name}>
                      <input className={inputCls(true, !!guestErrors.name)} placeholder="Nome completo (sem números)" value={form.guest.name} onChange={e => setForm(f => ({ ...f, guest: { ...f.guest, name: e.target.value } }))} onBlur={e => handleGuestBlur('name', e.target.value)} />
                    </Field>
                    <Field label="Email *" icon={Mail} error={guestErrors.email}>
                      <input className={inputCls(true, !!guestErrors.email)} type="email" placeholder="email@exemplo.com" value={form.guest.email} onChange={e => setForm(f => ({ ...f, guest: { ...f.guest, email: e.target.value } }))} onBlur={e => handleGuestBlur('email', e.target.value)} />
                    </Field>
                    <Field label="Telefone *" icon={Phone} error={guestErrors.phone}>
                      <input className={inputCls(true, !!guestErrors.phone)} placeholder="+244 9XX XXX XXX" value={form.guest.phone} onChange={e => setForm(f => ({ ...f, guest: { ...f.guest, phone: e.target.value } }))} onBlur={e => handleGuestBlur('phone', e.target.value)} />
                    </Field>
                    <Field label={form.guest.country === 'Angola' ? 'Bilhete de Identidade * (14 car.)' : 'Passaporte / Documento *'} icon={FileText} error={guestErrors.idDocument}>
                      <input className={inputCls(true, !!guestErrors.idDocument)} placeholder={form.guest.country === 'Angola' ? 'Ex: 003456789LA042' : 'Número do documento'} maxLength={form.guest.country === 'Angola' ? 14 : undefined} value={form.guest.idDocument} onChange={e => {
                        const val = form.guest.country === 'Angola' ? e.target.value.toUpperCase() : e.target.value
                        setForm(f => ({ ...f, guest: { ...f.guest, idDocument: val } }))
                      }} onBlur={e => handleGuestBlur('idDocument', e.target.value)} />
                      {form.guest.country === 'Angola' && (
                        <p className="text-[10px] text-slate-400 mt-1">Formato: 9 dígitos + 2 letras + 3 dígitos (posições 10 e 11 são letras)</p>
                      )}
                    </Field>
                    <Field label="País">
                      <select className={inputCls(false) + ' pl-3'} value={form.guest.country} onChange={e => {
                        setForm(f => ({ ...f, guest: { ...f.guest, country: e.target.value, idDocument: '' } }))
                        setGuestErrors(prev => ({ ...prev, idDocument: null }))
                      }}>
                        <option>Angola</option>
                        <option>Portugal</option>
                        <option>Brasil</option>
                        <option>Outro</option>
                      </select>
                    </Field>
                    <Field label="Adultos">
                      <input type="number" className={inputCls(false) + ' pl-3'} min="1" max="10" value={form.adults} onChange={e => setForm(f => ({ ...f, adults: e.target.value }))} />
                    </Field>
                    <Field label="Crianças">
                      <input type="number" className={inputCls(false) + ' pl-3'} min="0" max="10" value={form.children} onChange={e => setForm(f => ({ ...f, children: e.target.value }))} />
                    </Field>
                    <Field label="Observações" className="sm:col-span-2">
                      <textarea className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none resize-none" rows={2} placeholder="Preferências, pedidos especiais..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </Field>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep('select-room')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                    <ChevronLeft size={15} /> Voltar
                  </button>
                  <button disabled={!canProceedToReview} onClick={() => { if (validateGuestForm()) setCurrentStep('review') }} className="flex items-center gap-2 bg-[#001E3D] hover:bg-[#002d5c] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md disabled:opacity-40">
                    Continuar <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'review' && selectedRoom && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b"><Sparkles size={16} className="text-[#001E3D]" /><h3 className="font-serif font-bold">Confirmar Reserva</h3></div>
                  <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-14 h-14 rounded-lg bg-[#001E3D] flex items-center justify-center flex-shrink-0">
                      <BedDouble size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="font-serif font-bold text-[#001E3D]">Quarto {selectedRoom.number}</p>
                      <p className="text-xs text-slate-400">{selectedRoom.type}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(selectedRoom.pricePerNight)}/noite</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[['Hóspede', form.guest.name], ['Período', `${formatDate(form.checkIn)} → ${formatDate(form.checkOut)}`], ['Noites', `${nights}`]].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">{l}</span><span className="font-medium">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3">
                      <span className="font-bold text-[#001E3D]">Total</span>
                      <span className="text-2xl font-black text-[#001E3D]">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep('guest-data')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                    <ChevronLeft size={15} /> Voltar
                  </button>
                  <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-7 py-2.5 rounded-xl text-sm font-semibold shadow-md">
                    {createMutation.isPending ? 'A processar...' : <><CheckCircle size={15} /> Confirmar Reserva</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRes && (
        <ReservationDetailPanel
          reservation={selectedRes}
          isStaff={isStaff}
          isClient={isClient}
          isAdmin={isAdmin}
          availableRooms={availableRooms}
          onClose={() => setSelectedRes(null)}
          onAction={(id: string, act: string, data?: any) => actionMutation.mutate({ id, action: act, data })}
          refetch={refetch}
        />
      )}
    </div>
  )
}