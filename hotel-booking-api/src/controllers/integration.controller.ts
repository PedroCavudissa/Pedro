import { Request, Response } from "express";
import { IntegrationService } from "../services/integration.service.js";

export class IntegrationController {
  static async syncAvailability(req: Request, res: Response) {
    try {
      const result = await IntegrationService.syncAvailability(req.params.platform);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async fetchReservations(req: Request, res: Response) {
    try {
      const result = await IntegrationService.fetchReservations(req.params.platform);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async pushReservation(req: Request, res: Response) {
    try {
      const result = await IntegrationService.pushReservation(
        req.params.platform,
        req.body.reservationId
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async cancelReservation(req: Request, res: Response) {
    try {
      const result = await IntegrationService.cancelReservation(
        req.params.platform,
        req.body.reservationId,
        req.body.reason
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async logs(req: Request, res: Response) {
    try {
      const result = await IntegrationService.logs();
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
