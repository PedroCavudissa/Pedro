import { Router } from "express";
import { PolicyController } from "../controllers/policy.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware(["ADMIN", "RECEPTION","CLIENT"]), PolicyController.get);
router.patch("/", authMiddleware, roleMiddleware(["ADMIN"]), PolicyController.update);
router.post("/", authMiddleware, roleMiddleware(["ADMIN"]), PolicyController.createNew);
export default router;
