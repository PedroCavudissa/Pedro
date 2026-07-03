import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();
const staffRoles = ["ADMIN", "MANAGER", "RECEPTION"];

router.get("/", authMiddleware, roleMiddleware(staffRoles), UserController.getAll);
router.get("/guests", authMiddleware, roleMiddleware(staffRoles), UserController.guests);
router.get("/me", authMiddleware, UserController.me);
router.patch("/me", authMiddleware, UserController.updateMe);
router.get("/:id", authMiddleware, roleMiddleware(staffRoles), UserController.getById);
router.delete("/:id", authMiddleware, roleMiddleware(["ADMIN"]), UserController.delete);
router.patch("/me", authMiddleware, roleMiddleware(["CLIENT","RECEPTION"]), UserController.updateMe);
export default router;
