import { Request, Response } from "express";
import { TicketService } from "../services/ticket.service.js";

export class TicketController {
  static async create(req: Request, res: Response) {
    try {
      const ticket = await TicketService.create(req.body, (req as any).user);
      return res.status(201).json(ticket);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async findAll(req: Request, res: Response) {
    try {
      const tickets = await TicketService.findAll(req.query, (req as any).user);
      return res.json(tickets);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const ticket = await TicketService.update(
        req.params.id as string,
        req.body,
        (req as any).user
      );
      return res.json(ticket);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
