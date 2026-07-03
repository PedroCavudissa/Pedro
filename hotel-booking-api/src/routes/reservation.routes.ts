import { Router } from "express";
import { ReservationController } from "../controllers/reservation.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const reservationRoutes = Router();
const staffRoles = ["ADMIN", "MANAGER", "RECEPTION"];
const clientRoles = ["CLIENT", "ADMIN", "MANAGER", "RECEPTION"];

reservationRoutes.post("/", authMiddleware, ReservationController.create);
reservationRoutes.get("/mine", authMiddleware, ReservationController.myReservations);
reservationRoutes.get('/availability', ReservationController.checkAvailability);
reservationRoutes.get('/available-dates', ReservationController.getAvailableDates);



reservationRoutes.get(
  "/",
  authMiddleware,
  roleMiddleware(staffRoles),
  ReservationController.findAll
);

reservationRoutes.get(
  "/:id",
  authMiddleware,
  roleMiddleware(staffRoles),
  ReservationController.findById
);

reservationRoutes.put(
  "/:id",
  authMiddleware,
  ReservationController.update
);

reservationRoutes.patch(
  "/:id/reschedule",
  authMiddleware,
  roleMiddleware(clientRoles),
  ReservationController.reschedule
);

reservationRoutes.patch(
  "/:id/change-room",
  authMiddleware,
  roleMiddleware(clientRoles),
  ReservationController.changeRoom
);

reservationRoutes.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware(clientRoles),
  ReservationController.cancel
);

reservationRoutes.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  ReservationController.delete
);

reservationRoutes.patch(
  "/:id/checkin",
  authMiddleware,
  roleMiddleware(staffRoles),
  ReservationController.checkIn
);

reservationRoutes.patch(
  "/:id/checkout",
  authMiddleware,
  roleMiddleware(staffRoles),
  ReservationController.checkOut
);

reservationRoutes.patch(
  "/:id/pay",
  authMiddleware,
  roleMiddleware(staffRoles),
  ReservationController.confirmPayment
);

reservationRoutes.patch(
  "/:id/confirm-late-fee",
  authMiddleware,
  roleMiddleware(staffRoles),
  ReservationController.confirmLateFee
);

reservationRoutes.post(
  "/:id/payment-proof",
  authMiddleware,
  upload.single("proof"),
  ReservationController.uploadPaymentProof
);

export default reservationRoutes;
