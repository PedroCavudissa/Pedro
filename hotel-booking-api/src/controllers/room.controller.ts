import { Request, Response } from "express";
import { RoomService } from "../services/room.service.js";
import { prisma } from "../prisma/client.js";

export class RoomController {

static async create(req: Request, res: Response) {

  try {

    const imageUrl = req.file
      ? `http://10.0.0.4:9090/uploads/${req.file.filename}`
      : null;

    const room = await RoomService.create({
      ...req.body,
      imageUrl,
    });

    return res.status(201).json(room);

  } catch (error: any) {

    return res.status(400).json({
      error: error.message,
    });
  }
}

static async findAll(req: Request, res: Response) {
  try {
    const rooms = await RoomService.findAll(req.query);
    return res.json(rooms);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

  static async findById(req: Request, res: Response) {

    try {

      const room = await RoomService.findById(req.params.id as string);

      return res.json(room);

    } catch (error: any) {

      return res.status(404).json({
        error: error.message,
      });
    }
  }

  static async update(req: Request, res: Response) {

    try {

      const room = await RoomService.update(
        req.params.id as string,
        req.body
      );

      return res.json(room);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }

  static async delete(req: Request, res: Response) {

    try {

      const result = await RoomService.delete(
         req.params.id as string,
      );

      return res.json(result);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }

  static async changeStatus(req: Request, res: Response) {

    try {

      const state = req.body.state ?? req.body.status;

      const room = await RoomService.changeStatus(
        req.params.id as string,
        state
      );

      return res.json(room);

    } catch (error: any) {

      return res.status(400).json({
        error: error.message,
      });
    }
  }
  

   static async startCleaning(req: Request, res: Response) {
    try {
      const room = await RoomService.startCleaning(req.params.id as string);
      return res.json(room);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async finishCleaning(req: Request, res: Response) {
    try {
      const room = await RoomService.finishCleaning(req.params.id as string);
      return res.json(room);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

static async inspect(req: Request, res: Response) {
  try {
    const { id } = req.params;
const roomId = Array.isArray(id) ? id[0] : id;
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: "Quarto não encontrado" });
    }

    // ❌ só pode inspecionar se estiver limpo
    if (room.state !== "VACANT_CLEAN") {
      return res.status(400).json({
        error: "Só quartos limpos podem ser inspecionados"
      });
    }

    const updated = await prisma.room.update({
      where: { id : roomId },
      data: {
        inspection: "INSPECTED"
      }
    });

    return res.json(updated);

  } catch (err) {
    return res.status(500).json({ error: "Erro ao inspecionar quarto" });
  }
}
    static async startMaintenance(req: Request, res: Response) {
    try {
      const result = await RoomService.startMaintenance(
        req.params.id as string,
        req.body.type
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async finishMaintenance(req: Request, res: Response) {
    try {
      const result = await RoomService.finishMaintenance(req.params.id as string);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
