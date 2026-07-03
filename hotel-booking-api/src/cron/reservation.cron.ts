import { ReservationService } from "../services/reservation.service.js";

export function startReservationCron() {
  setInterval(async () => {
    await ReservationService.expireOldReservations();
  }, 60 * 1000); // a cada 1 minuto

  // A cada 60 minutos, acresce a taxa de late checkout (definida pelo admin
  // na política do hotel) às reservas ainda CHECKED_IN após as 12h00 + tolerância
  setInterval(async () => {
    await ReservationService.accrueLateFees();
  }, 60 * 60 * 1000); // a cada 60 minutos
}