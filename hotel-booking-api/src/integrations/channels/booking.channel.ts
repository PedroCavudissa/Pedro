export interface ChannelIntegration {
  pushAvailability(): Promise<void>;
  pushReservations(): Promise<void>;
  pullReservations(): Promise<void>;
}