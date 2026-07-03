import { Router } from "express";
import { TicketService } from "../services/ticket.service.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();

const requireUser = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Usuário não autenticado" });
  }
  next();
};

// Middleware para travar clientes nas rotas de staff
const requireStaff = roleMiddleware(["ADMIN", "MANAGER", "RECEPTION"]);



// GET /admin/stats - Estatísticas
router.get("/admin/stats", authMiddleware, requireUser, requireStaff, async (req, res) => {
  try {
    const stats = await TicketService.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /admin - Listar todos os tickets (ADMIN)
router.get("/admin", authMiddleware, requireUser, requireStaff, async (req, res) => {
  try {
    const tickets = await TicketService.findAll(req.query);
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /admin/{id} - Atualizar ticket (ADMIN)
router.patch("/admin/:id", authMiddleware, requireUser, requireStaff, async (req, res) => {
  try {
    const ticket = await TicketService.update(req.params.id, req.body, req.user!);
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2º ROTAS GERAIS E DINÂMICAS DO CLIENTE (Devem vir ABAIXO)
// ─────────────────────────────────────────────────────────────

// GET / - Listar meus tickets
router.get("/", authMiddleware, requireUser, async (req, res) => {
  try {
    const tickets = await TicketService.findMine(req.user!.id, req.query);
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST / - Abrir ticket
router.post("/", authMiddleware, requireUser, async (req, res) => {
  try {
    const ticket = await TicketService.create(req.body, req.user!);
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /{id} - Obter ticket (Colocado abaixo de /admin para não capturar a palavra "admin")
router.get("/:id", authMiddleware, requireUser, async (req, res) => {
  try {
    const isAdmin = ["ADMIN", "MANAGER", "RECEPTION"].includes(req.user!.role);
    const ticketId = String(req.params.id);
    const ticket = await TicketService.findById(ticketId, req.user!.id, isAdmin);
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /{id}/mensagens - Listar mensagens
router.get("/:id/mensagens", authMiddleware, requireUser, async (req, res) => {
  try {
    const isAdmin = ["ADMIN", "MANAGER", "RECEPTION"].includes(req.user!.role);
    const ticketId = String(req.params.id);
    const messages = await TicketService.getMessages(ticketId, req.user!.id, isAdmin);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /{id}/mensagens - Responder ticket
router.post("/:id/mensagens", authMiddleware, requireUser, async (req, res) => {
  try {
    const { message } = req.body;
    const ticketId = String(req.params.id);
    const result = await TicketService.addMessage(ticketId, message, req.user!);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;