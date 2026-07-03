import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";

export class UserController {
  static async getAll(req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers((req as any).user.role, req.query);
      return res.json(users);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async guests(req: Request, res: Response) {
    try {
      const guests = await UserService.getGuests(req.query);
      return res.json(guests);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const user = await UserService.getMe((req as any).user.id);
      return res.json(user);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  static async updateMe(req: Request, res: Response) {
    try {
      const user = await UserService.updateMe((req as any).user.id, req.body);
      return res.json(user);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const user = await UserService.getById(
        req.params.id as string,
        (req as any).user.role
      );
      return res.json(user);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const result = await UserService.delete(req.params.id as string);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
