import { BookingChannel } from "./channels/airbnb.channel.js";

export class SyncService {
  private channels = [
    new BookingChannel()
  ];

  async syncAll() {
    for (const channel of this.channels) {
      await channel.pushAvailability();
      await channel.pushReservations();
      await channel.pullReservations();
    }
  }
}