import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();

//  Rotas Públicas de Fluxo Padrão 
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/google", AuthController.googleLogin);
router.post(
  "/logout",
  authMiddleware,
  AuthController.logout
);
router.get("/verify-email", AuthController.verifyEmail);

//  Fluxo de Recuperação de Senha (Sem Estar Logado) 
router.post("/forgot-password", AuthController.forgot); 
router.get("/reset-password/confirm", AuthController.renderResetPage); 
router.post("/reset-password/confirm", AuthController.reset); 

//Rotas de Reenvio Distintas 
router.post("/resend-verification", AuthController.resendVerification);
router.post("/resend-reset-password", AuthController.resendReset);
//Rotas Autenticadas (Qualquer Utilizador Logado)
router.post("/change-password", authMiddleware, AuthController.changePassword);

//Rotas de Administração (Restritas a ADMIN)
router.post(
  "/staff",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  AuthController.createStaff
);

router.patch(
  "/disable/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  AuthController.disable
);

router.patch(
  "/activate/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  AuthController.activate
);

export default router;