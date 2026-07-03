import { Request, Response } from "express";
import { ReservationService } from "../services/reservation.service.js";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "../prisma/client.js";

function sendError(res: Response, err: any) {
  return res.status(err.statusCode || 400).json({
    error: err.message || "Pedido invalido",
  });
}

export class ReservationController {
  static async create(req: Request, res: Response) {
    try {
      const result = await ReservationService.create(req.body, (req as any).user);
      return res.status(201).json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async findAll(req: Request, res: Response) {
    try {
      const data = await ReservationService.findAll(req.query);
      return res.json(data);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  // CORRIGIDO: getMine - buscar reservas do usuário logado
  static async getMine(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;
      
      if (!userId && !userEmail) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const reservations = await ReservationService.findMine(userId, userEmail);
      return res.json(reservations);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await ReservationService.findById(id);
      return res.json(data);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await ReservationService.update(id, req.body);
      return res.json(data);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async reschedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { checkIn, checkOut, reason } = req.body;
      
      const reservation = await ReservationService.reschedule(id as string, { checkIn, checkOut, reason });
      return res.json(reservation);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async changeRoom(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await ReservationService.changeRoom(id, req.body.roomId);
      return res.json(data);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Motivo do cancelamento é obrigatório" });
      }
      
      const reservation = await ReservationService.cancel(id as string, reason);
      return res.json(reservation);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await ReservationService.delete(id);
      return res.json(data);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async confirmPayment(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.confirmPayment(
        id,
        req.body.method,
        req.body.amountPaid ? Number(req.body.amountPaid) : undefined
      );
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  // Recepcionista confirma o pagamento da taxa de late checkout acumulada
  static async confirmLateFee(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.confirmLateFeePayment(id);
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  }


  static async uploadPaymentProof(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo nao enviado" });
      }

      const fileUrl = `http://10.10.0.4:9090/uploads/${req.file.filename}`;
      const id = req.params.id as string;
      const result = await ReservationService.uploadPaymentProof(id, fileUrl);
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async checkIn(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await ReservationService.checkIn(id);
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  static async checkOut(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { earlyCheckoutReason } = req.body || {};

      const result = await ReservationService.checkOut(id, earlyCheckoutReason);
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  //  buscar reservas do usuário
  static async myReservations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;
      
      if (!userId && !userEmail) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const data = await ReservationService.myReservations(userId, userEmail);
      return res.json(data);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

    // Método para verificar disponibilidade de uma data específica
  static async checkAvailability(req: Request, res: Response) {
    try {
      const { roomId, checkIn, checkOut } = req.query;
      
      // Validar parâmetros
      if (!roomId || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros obrigatórios: roomId, checkIn, checkOut'
        });
      }

      const checkInDate = new Date(checkIn as string);
      const checkOutDate = new Date(checkOut as string);

      // Usar o método existente para verificar conflito
      const conflict = await ReservationService.findRoomConflict(
        roomId as string,
        checkInDate,
        checkOutDate
      );

      const isAvailable = !conflict;

      // Se não estiver disponível, sugerir um quarto alternativo
      let suggestion = null;
      if (!isAvailable) {
        const room = await prisma.room.findUnique({ where: { id: roomId as string } });
        if (room) {
          suggestion = await ReservationService.suggestRoom(
            checkInDate,
            checkOutDate,
            room.capacity,
            roomId as string
          );
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          available: isAvailable,
          suggestion: suggestion ? {
            id: suggestion.id,
            number: suggestion.number,
            pricePerNight: suggestion.pricePerNight
          } : null
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar disponibilidade',
        error: error.message
      });
    }
  }

  // Método para buscar todas as datas disponíveis do mês
  static async getAvailableDates(req: Request, res: Response) {
    try {
      const { roomId, month, year } = req.query;
      
      if (!roomId || !month || !year) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros obrigatórios: roomId, month, year'
        });
      }

      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0);

      // Buscar todas as reservas do quarto no mês
      const reservations = await prisma.reservation.findMany({
        where: {
          roomId: roomId as string,
          checkOut: { gt: startDate },
          checkIn: { lt: endDate },
          OR: [
            { status: ReservationStatus.CONFIRMED },
            { status: ReservationStatus.CHECKED_IN },
            {
              status: ReservationStatus.PENDING,
              paymentStatus: PaymentStatus.PENDING,
              expiresAt: { gt: new Date() },
            },
          ],
        },
      });

      // Gerar array de datas disponíveis
      const availableDates: string[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const isOccupied = reservations.some(res => {
          const checkIn = res.checkIn.toISOString().split('T')[0];
          const checkOut = res.checkOut.toISOString().split('T')[0];
          return dateStr >= checkIn && dateStr < checkOut;
        });

        if (!isOccupied) {
          availableDates.push(dateStr);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.status(200).json({
        success: true,
        data: {
          availableDates,
          month: Number(month),
          year: Number(year),
          totalDays: availableDates.length
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar datas disponíveis',
        error: error.message
      });
    }
  }
}