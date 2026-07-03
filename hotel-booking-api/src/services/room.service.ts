import { prisma } from "../prisma/client.js";

export class RoomService {

  static async create(data: any) {

    const exists = await prisma.room.findUnique({
      where: { number: data.number },
    });

    if (exists) {
      throw new Error("Já existe um quarto com este número");
    }

    const room = await prisma.room.create({
      data: {
        number: data.number,
        type: data.type,
        title: data.title,
        description: data.description,

        pricePerNight: Number(data.pricePerNight),
        capacity: Number(data.capacity),
        floor: data.floor ? Number(data.floor) : undefined,
        imageUrl: data.imageUrl,

        amenities: data.amenities?.length
          ? {
            connect: data.amenities.map((id: string) => ({ id })),
          }
          : undefined,
      },

      include: {
        amenities: true,
      },
    });

    return room;
  }

  static async findAll(filters?: any) {
    const { type, state, availability, checkIn, checkOut } = filters || {};
    const now = new Date();
    const where: any = {};

    if (type && type !== "all") where.type = type;
    if (state && state !== "all") where.state = state;

    // Reservas que "ocupam" o quarto: CONFIRMED/CHECKED_IN sempre,
    // ou PENDING enquanto a reserva não tiver expirado (expiresAt no futuro)
    const blockingReservationStatus = {
      OR: [
        { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        {
          status: "PENDING",
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ],
    };

    if (availability === "free") {
      where.maintenance = "NONE";

      if (checkIn && checkOut) {
        // Disponibilidade para um intervalo específico de datas
        const start = new Date(checkIn);
        const end = new Date(checkOut);

        where.reservations = {
          none: {
            ...blockingReservationStatus,
            checkIn: { lt: end },
            checkOut: { gt: start },
          },
        };
      } else {
        // Disponibilidade "neste momento"
        where.state = "VACANT_CLEAN";
        where.reservations = {
          none: {
            ...blockingReservationStatus,
            checkIn: { lt: now },
            checkOut: { gt: now },
          },
        };
      }
    }

    if (availability === "occupied") where.state = "OCCUPIED";
    if (availability === "reserved") {
      where.reservations = {
        some: {
          ...blockingReservationStatus,
          checkOut: { gt: now },
        },
      };
    }

    return prisma.room.findMany({
      where,

      include: {
        amenities: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async findById(id: string) {

    const room = await prisma.room.findUnique({
      where: { id },

      include: {
        amenities: true,
        reservations: true,
      },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    return room;
  }

  static async update(id: string, data: any) {

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    return prisma.room.update({
      where: { id },

      data: {
        number: data.number,
        type: data.type,
        title: data.title,
        description: data.description,
        pricePerNight: data.pricePerNight,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        floor: data.floor ? Number(data.floor) : undefined,
        imageUrl: data.imageUrl,

        amenities: {
          set: data.amenityIds?.map((id: string) => ({
            id,
          })),
        },
      },

      include: {
        amenities: true,
      },
    });
  }

  static async delete(id: string) {

    const room = await prisma.room.findUnique({
      where: { id },
      include: { reservations: true },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    const hasActiveReservation = room.reservations.some((reservation) =>
      ["PENDING", "CONFIRMED"].includes(reservation.status)
    );

    if (room.state === "OCCUPIED" || hasActiveReservation) {
      throw new Error("Quartos ocupados ou com reservas ativas nao podem ser eliminados");
    }

    await prisma.room.delete({
      where: { id },
    });

    return {
      message: "Quarto removido com sucesso",
    };
  }

  static async changeStatus(id: string, state: any) {

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    return prisma.room.update({
      where: { id },

      data: {
        state,
      },
    });
  }

  // INICIAR LIMPEZA
  static async startCleaning(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    if (room.state !== "VACANT_DIRTY") {
      throw new Error("Só quartos sujos podem iniciar limpeza");
    }

    return prisma.room.update({
      where: { id: roomId },
      data: {
        state: "CLEANING",
        inspection: "NOT_INSPECTED",
      },
    });
  }

  // FINALIZAR LIMPEZA
  static async finishCleaning(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    if (room.state !== "CLEANING") {
      throw new Error("O quarto não está em limpeza");
    }

    return prisma.room.update({
      where: { id: roomId },
      data: {
        state: "VACANT_CLEAN",
      },
    });
  }

  // Inspecionar Quarto (Marcar como INSPECTED para permitir reservas)
  static async inspect(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error("Quarto não encontrado");
    }

    if (room.state !== "VACANT_CLEAN") {
      throw new Error("Só quartos limpos podem ser inspecionados");
    }

    return prisma.room.update({
      where: { id: roomId },
      data: {
        inspection: "INSPECTED",
      },
    });
  }


  // Iniciar Manutenção (OUT_OF_ORDER ou OUT_OF_SERVICE)
  static async startMaintenance(
    roomId: string,
    type: "OUT_OF_ORDER" | "OUT_OF_SERVICE"
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) throw new Error("Quarto não encontrado");

    return prisma.room.update({
      where: { id: roomId },
      data: {
        maintenance: type,
        state: "MAINTENANCE",
      },
    });
  }

  // Finalizar Manutenção (Voltar para VACANT_DIRTY)
  static async finishMaintenance(roomId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) throw new Error("Quarto não encontrado");

    return prisma.room.update({
      where: { id: roomId },
      data: {
        maintenance: "NONE",
        state: "VACANT_DIRTY",
      },
    });
  }
}
