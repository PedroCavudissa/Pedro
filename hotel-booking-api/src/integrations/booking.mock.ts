import { ReservationPlatformIntegration } from "./integration.interface.js";

export class BookingMockIntegration implements ReservationPlatformIntegration {
  async syncAvailability() {
    // Simula envio de disponibilidade para Booking.com
    console.log('Disponibilidade sincronizada com Booking.com (mock)');
  }
  async fetchReservations() {
    // Simula busca de reservas feitas no Booking.com
    console.log('Reservas buscadas do Booking.com (mock)');
  }
  async pushReservation(reservation: any) {
    // Simula envio de nova reserva para Booking.com
    console.log('Reserva enviada ao Booking.com (mock)', reservation);
  }
  async cancelReservation(reservationId: string, reason?: string) {
    // Simula cancelamento de reserva no Booking.com
    console.log(`Reserva ${reservationId} cancelada no Booking.com (mock). Motivo: ${reason}`);
  }
}
