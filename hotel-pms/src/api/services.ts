import api from './client'
import type {
  LoginPayload, RegisterPayload, AuthResponse,
  User, Room, CreateRoomPayload, Amenity,
  Reservation, CreateReservationPayload,
   Policy, OccupancyReport, FinancialReport,
} from '@/types'


export interface AvailabilityResponse {
  available: boolean;
  suggestion: {
    id: string;
    number: string;
    pricePerNight: number;
  } | null;
}

export interface AvailableDatesResponse {
  availableDates: string[];
  month: number;
  year: number;
  totalDays: number;
}
//  Auth (Autenticação)
export const authApi = {
  login:             (d: LoginPayload)            => api.post<AuthResponse>('/auth/login', d),
  register:          (d: RegisterPayload)         => api.post<AuthResponse>('/auth/register', d),
  logout:            ()                           => api.post('/auth/logout'),
  changePassword:    (d: { oldPassword: string; newPassword: string }) => api.post('/auth/change-password', d),
  forgotPassword:    (email: string)              => api.post('/auth/forgot-password', { email }),
  resetPassword:     (d: { token: string; password: string }) => api.post('/auth/reset-password/confirm', d),
  resendVerification:(email: string)              => api.post('/auth/resend-verification', { email }),
  disableUser:       (id: string)                 => api.patch(`/auth/disable/${id}`),
  activateUser:      (id: string)                 => api.patch(`/auth/activate/${id}`),
  googleLogin: (data: { token: string }) => 
  api.post('/auth/google', data),
}

//  Users (Usuários)
export const usersApi = {
  list:    ()                          => api.get<User[]>('/users'),
  me:      ()                          => api.get<User>('/users/me'),
  updateMe:(d: Partial<User>)          => api.patch<User>('/users/me', d),
  getById: (id: string)                => api.get<User>(`/users/${id}`),
  delete:  (id: string)                => api.delete(`/users/${id}`),
}

//  Rooms (Quartos)
export const roomsApi = {
  list: () => api.get<Room[]>('/rooms'),
  
  getById: (id: string) => api.get<Room>(`/rooms/${id}`),
  
  create: (data: any) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (k === 'amenityIds' && Array.isArray(v)) {
          v.forEach((id) => fd.append('amenityIds[]', id))
        } else {
          fd.append(k, v as string | Blob)
        }
      }
    })
    return api.post<Room>('/rooms', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  update: (id: string, data: any) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (k === 'amenityIds' && Array.isArray(v)) {
          v.forEach((id) => fd.append('amenityIds[]', id))
        } else {
          fd.append(k, v as string | Blob)
        }
      }
    })
    return api.patch<Room>(`/rooms/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  delete: (id: string) => api.delete(`/rooms/${id}`),
  
  startCleaning: (id: string) => api.patch(`/rooms/${id}/cleaning/start`),
  
  finishCleaning: (id: string) => api.patch(`/rooms/${id}/cleaning/finish`),
  
  inspect: (id: string) => api.patch(`/rooms/${id}/inspect`),
  
  startMaintenance: (id: string, type: 'OUT_OF_ORDER' | 'OUT_OF_SERVICE') => 
    api.patch(`/rooms/${id}/maintenance/start`, { type }),
  
  finishMaintenance: (id: string) => api.patch(`/rooms/${id}/maintenance/finish`),
  
  changeStatus: (id: string, status: string) => 
    api.patch(`/rooms/${id}/status`, { state: status }),
}

//  Amenities 
export const amenitiesApi = {
  list:   ()                           => api.get<Amenity[]>('/amenities'),
  create: (d: { name: string; icon?: string }) => api.post<Amenity>('/amenities', d),
  update: (id: string, d: Partial<Amenity>)    => api.patch<Amenity>(`/amenities/${id}`, d),
  delete: (id: string)                 => api.delete(`/amenities/${id}`),
}


//  Reservas 
export const reservationsApi = {
  list: () => api.get<Reservation[]>('/reservations'),
  getMine: () => api.get<Reservation[]>('/reservations/mine'),
  create: (d: CreateReservationPayload) => api.post<Reservation>('/reservations', d),
  getById: (id: string) => api.get<Reservation>(`/reservations/${id}`),
  update: (id: string, d: Partial<Reservation>) => api.patch<Reservation>(`/reservations/${id}`, d),
  delete: (id: string) => api.delete(`/reservations/${id}`),
  
  // Cancelar com motivo
  cancel: (id: string, reason: string) => api.patch(`/reservations/${id}/cancel`, { reason }),
  
  // Remarcar reserva
  reschedule: (id: string, data: { checkIn: string; checkOut: string; reason?: string }) => 
    api.patch(`/reservations/${id}/reschedule`, data),
  
  // Pagamento
  pay: (id: string, method: string) => api.patch(`/reservations/${id}/pay`, { method }),
  
  // Check-in/Check-out
  checkIn: (id: string) => api.patch(`/reservations/${id}/checkin`),
checkOut: (id: string, data?: { earlyCheckoutReason: string }) => 
  api.patch(`/reservations/${id}/checkout`, data),
  
  // Upload comprovativo
  uploadPaymentProof: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('proof', file)
    return api.post(`/reservations/${id}/payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  onfirmLateFee: (id: string) => api.patch(`/reservations/${id}/confirm-late-fee`),
  
  // Buscar política de reservas (para mostrar taxas)
  getPolicy: () => api.get<{
    cancellationFeePercent: number;
    minCancellationFee: number;
    cancellationDeadlineHours: number;
    lateCheckoutHourlyFee: number;
    lateCheckoutGraceMinutes: number;
  }>('/reservations/policy'),
  changeRoom:(id:string)=>api.patch(`/reservations/${id}/change-room`),
  

    checkAvailability: (roomId: string, checkIn: string, checkOut: string) => 
    api.get<{ success: boolean; data: AvailabilityResponse }>(
      `/reservations/availability`,
      { params: { roomId, checkIn, checkOut } }
    ),
      getAvailableDates: (roomId: string, month: number, year: number) => 
    api.get<{ success: boolean; data: AvailableDatesResponse }>(
      `/reservations/available-dates`,
      { params: { roomId, month, year } }
    ),
      checkMultipleAvailability: (checkIn: string, checkOut: string, capacity?: number) =>
    api.get<{ success: boolean; data: { availableRooms: any[] } }>(
      `/reservations/availability/multiple`,
      { params: { checkIn, checkOut, capacity } }
    ),
}

//  Tickets 
export const ticketsApi = {
  // Cliente
  listMine: (params?: { status?: string; type?: string }) => 
    api.get<Ticket[]>('/public/tickets', { params }),
  
  getById: (id: string) => 
    api.get<Ticket>(`/public/tickets/${id}`),
  
  create: (data: { 
    subject: string; 
    message: string; 
    type?: string; 
    priority?: string; 
    reservationId?: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    requestedRoomId?: string;
  }) => api.post<Ticket>('/public/tickets', data),
  
  getMessages: (id: string) => 
    api.get<TicketMessage[]>(`/public/tickets/${id}/mensagens`),
  
  sendMessage: (id: string, message: string) => 
    api.post<TicketMessage>(`/public/tickets/${id}/mensagens`, { message }),
  
  // Admin
  listAll: (params?: { status?: string; type?: string; priority?: string; search?: string }) => 
    api.get<Ticket[]>('/public/tickets/admin', { params }),
  
  update: (id: string, data: { status?: string; priority?: string; assignedToId?: string; response?: string }) => 
    api.patch<Ticket>(`/public/tickets/admin/${id}`, data),
  
  getStats: () => 
    api.get('/public/tickets/admin/stats'),
}

// Tipos
export interface Ticket {
  id: string;
  code: string;
  subject: string;
  message?: string;
  type: 'SUPPORT' | 'COMPLAINT' | 'REQUEST' | 'INFO' | 'RESCHEDULE' | 'CANCELLATION';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
  reservation?: { id: string; room?: { number: string } };
  user?: { id: string; name: string; email: string };
}

export interface TicketMessage {
  id: string;
  message: string;
  userId: string;
  user: { id: string; name: string; role: string };
  isStaff: boolean;
  createdAt: string;
}

//  Policies (Políticas do Hotel)
export const policiesApi = {
  list:   () => api.get<Policy[]>('/policies'),
  create: (d: { title: string; content: string; category: string }) => api.post<Policy>('/policies', d),
}

//  Reports (Relatórios)

export const reportsApi = {
  getOccupancyReport: () => 
    api.get<OccupancyReport>('/reports/occupancy'),
    
  getFinancialReport: () => 
    api.get<FinancialReport>('/reports/financial'),
}
