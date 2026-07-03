import { Request, Response } from "express";
import { PolicyService } from "../services/policy.service.js";

export class PolicyController {
  static async get(req: Request, res: Response) {
    try {
      const policy = await PolicyService.get();
      return res.json(policy);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const policy = await PolicyService.update(req.body);
      return res.json(policy);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
  static async createNew(req: Request, res: Response) {
    try {
      const policy = await PolicyService.createNew(req.body);
      return res.status(201).json(policy);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
