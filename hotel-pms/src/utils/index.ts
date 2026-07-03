import { clsx, type ClassValue } from 'clsx'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export const formatDate = (d: any) => {
  if (!d) return 'Data não disponível';
  
  // Converte para Date independente do tipo
  const data = d instanceof Date ? d : new Date(d);
  
  // Verifica se a data é válida
  if (isNaN(data.getTime())) return 'Data inválida';
  
  return format(data, 'dd MMM yyyy', { locale: pt });
};

export const formatDateTime = (d: string) =>
  format(parseISO(d), 'dd MMM yyyy, HH:mm', { locale: pt })

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v)

export const roomStatusColor: Record<string, string> = {
  available:    'bg-emerald-100 text-emerald-700',
  occupied:     'bg-blue-100 text-blue-700',
  cleaning:     'bg-amber-100 text-amber-700',
  inspecting:   'bg-purple-100 text-purple-700',
  maintenance:  'bg-orange-100 text-orange-700',
  out_of_order: 'bg-red-100 text-red-700',
  out_of_service:'bg-stone-100 text-stone-600',
}

export const reservationStatusColor: Record<string, string> = {
  hold:        'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-blue-100 text-blue-700',
  checked_in:  'bg-emerald-100 text-emerald-700',
  checked_out: 'bg-stone-100 text-stone-600',
  cancelled:   'bg-red-100 text-red-700',
}

export const ticketPriorityColor: Record<string, string> = {
  low:    'bg-stone-100 text-stone-600',
  medium: 'bg-blue-100 text-blue-700',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export const roomStatusLabel: Record<string, string> = {
  available:     'Disponível',
  occupied:      'Ocupado',
  cleaning:      'Limpeza',
  inspecting:    'Inspeção',
  maintenance:   'Manutenção',
  out_of_order:  'Fora de Serviço',
  out_of_service:'Indisponível',
}

export const reservationStatusLabel: Record<string, string> = {
  hold:        'Reservado (Hold)',
  confirmed:   'Confirmado',
  checked_in:  'Check-in',
  checked_out: 'Check-out',
  cancelled:   'Cancelado',
}
