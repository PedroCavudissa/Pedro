import { ChannelIntegration } from "./booking.channel.js";

export class BookingChannel implements ChannelIntegration {
  async pushAvailability() {
    // envia quartos disponíveis
  }

  async pushReservations() {
    // envia reservas novas
  }

  async pullReservations() {
    // busca reservas feitas no Booking
  }
}