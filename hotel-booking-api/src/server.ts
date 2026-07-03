import app from "./app.js";
import { createDefaultAdmin } from "./bootstrap/admin.bootstrap.js";
import { startReservationCron } from "./cron/reservation.cron.js";

const PORT = 9090;

app.listen(PORT, async () => {
   await createDefaultAdmin();
  console.log(`Server running on http://localhost:${PORT}`);
  startReservationCron();
});