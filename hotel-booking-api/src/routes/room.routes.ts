import { Router } from "express";
import { RoomController } from "../controllers/room.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();
const staffRoles = ["ADMIN", "MANAGER", "RECEPTION"];

// Rotas públicas
router.get("/", RoomController.findAll);

// Rotas protegidas - TODAS devem ter authMiddleware primeiro
router.get("/:id", authMiddleware, roleMiddleware(staffRoles), RoomController.findById);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["ADMIN", "MANAGER"]),
  upload.single("image"),
  RoomController.create
);

router.patch(
  "/:id", 
  authMiddleware,
  roleMiddleware(["ADMIN", "MANAGER"]), 
  RoomController.update
);

router.patch(
  "/:id/status", 
  authMiddleware,
  roleMiddleware(staffRoles), 
  RoomController.changeStatus
);

router.delete(
  "/:id", 
  authMiddleware,
  roleMiddleware(["ADMIN"]), 
  RoomController.delete
);

// Rotas de limpeza e manutenção - ADICIONAR authMiddleware
router.patch(
  "/:id/cleaning/start", 
  authMiddleware, 
  roleMiddleware(staffRoles), 
  RoomController.startCleaning
);

router.patch(
  "/:id/cleaning/finish", 
  authMiddleware,  
  roleMiddleware(staffRoles), 
  RoomController.finishCleaning
);

router.patch(
  "/:id/inspect", 
  authMiddleware, 
  roleMiddleware(staffRoles), 
  RoomController.inspect
);

router.patch(
  "/:id/maintenance/start", 
  authMiddleware,  
  roleMiddleware(staffRoles), 
  RoomController.startMaintenance
);

router.patch(
  "/:id/maintenance/finish", 
  authMiddleware,  
  roleMiddleware(staffRoles), 
  RoomController.finishMaintenance
);

export default router;