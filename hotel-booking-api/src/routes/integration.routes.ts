import { Router } from "express";
import { IntegrationController } from "../controllers/integration.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();

router.use(authMiddleware, roleMiddleware(["ADMIN", "MANAGER"]));

router.post("/:platform/sync-availability", IntegrationController.syncAvailability);
router.post("/:platform/fetch-reservations", IntegrationController.fetchReservations);
router.post("/:platform/push-reservation", IntegrationController.pushReservation);
router.post("/:platform/cancel-reservation", IntegrationController.cancelReservation);
router.get("/logs", IntegrationController.logs);

export default router;
