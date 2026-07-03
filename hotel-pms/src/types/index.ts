// ─── Auth ────────────────────────────────────────────────
export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { name: string; email: string; password: string; role?: string }
export interface AuthResponse { token: string; user: User }

// ─── User ────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'RECEPTION' | 'housekeeper' | 'CLIENT'
  isActive: boolean
  isVerified: boolean
  createdAt: string
}

// ─── Room ────────────────────────────────────────────────
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'inspecting' | 'maintenance' | 'out_of_order' | 'out_of_service'
export type RoomType = 'single' | 'double' | 'suite' | 'deluxe' | 'presidential'

export interface Room {
  id: string
  number: string
  type: RoomType
  status: RoomStatus
  floor: number
  pricePerNight: number
  capacity: number
  image?: string
  amenities: Amenity[]
  description?: string
  createdAt: string
}
export interface CreateRoomPayload {
  number: string
  type: RoomType
  floor: number
  pricePerNight: number
  capacity: number
  description?: string
  amenityIds?: string[]
  image?: File
}

// ─── Amenity ─────────────────────────────────────────────
export interface Amenity {
  id: string
  name: string
  icon?: string
}

// ─── Reservation ─────────────────────────────────────────
export type ReservationStatus = 'hold' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export interface Reservation {
  id: string
  roomId: string
  room?: Room
  guestId: string
  guest?: User
  checkIn: string
  checkOut: string
  status: ReservationStatus
  totalAmount: number
  adults: number
  children: number
  notes?: string
  createdAt: string
}

export interface CreateReservationPayload {
  roomId: string
  guestId: string
  checkIn: string
  checkOut: string
  adults: number
  children?: number
  notes?: string
}

// ─── Ticket ──────────────────────────────────────────────
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  roomId?: string
  room?: Room
  createdBy: string
  creator?: User
  assignedTo?: string
  assignee?: User
  createdAt: string
  updatedAt: string
}

// ─── Policy ──────────────────────────────────────────────
export interface Policy {
  id: string
  title: string
  content: string
  category: string
  createdAt: string
}

// Report types
export interface OccupancyReport {
  period: string
  start: string
  end: string
  roomsCount: number
  activeReservations: number
  occupancyRate: number
  reservationsCount: number
  revenue: number
  predictedRevenue: number
}

export interface FinancialReport {
  period: string
  start: string
  end: string
  roomsCount: number
  activeReservations: number
  occupancyRate: number
  reservationsCount: number
  revenue: number
  predictedRevenue: number
}

// Para compatibilidade com o gráfico, vamos criar uma estrutura de série temporal
export interface DailyReportData {
  date: string
  revenue: number
  occupancyRate: number
  reservationsCount: number
}
// ─── Pagination ──────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
