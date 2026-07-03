import { prisma } from "../prisma/client.js";

function rangeFromPeriod(period: string) {
  const now = new Date();
  const start = new Date(now);

  if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

export class ReportService {
 static async occupancyAndRevenue(period = "weekly") {
  const { start, end } = rangeFromPeriod(period);

  // Buscar todos os quartos
  const roomsCount = await prisma.room.count();

  // CORREÇÃO: Buscar reservas que ESTÃO ATIVAS durante o período
  // (checkIn <= end E checkOut >= start)
  const activeReservationsInPeriod = await prisma.reservation.findMany({
    where: {
      status: { in: ["CONFIRMED", "CHECKED_IN"] }, // Incluir CHECKED_IN também
      OR: [
        // Reservas que começam antes do fim do período e terminam depois do início
        {
          checkIn: { lte: end },
          checkOut: { gte: start },
        },
        // Reservas que começam dentro do período
        {
          checkIn: { gte: start, lte: end },
        },
        // Reservas que terminam dentro do período
        {
          checkOut: { gte: start, lte: end },
        },
      ],
    },
    select: {
      id: true,
      roomId: true,
      checkIn: true,
      checkOut: true,
    },
  });

  // Buscar reservas CRIADAS no período (para receita)
  const reservationsInPeriod = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
  });

  // Calcular quartos ocupados (distintos)
  const uniqueOccupiedRoomIds = new Set(
    activeReservationsInPeriod
      .map(r => r.roomId)
      .filter((id): id is string => id !== null)
  );
  
  const occupiedRoomsCount = uniqueOccupiedRoomIds.size;
  
  // Taxa de ocupação
  const occupancyRate = roomsCount 
    ? Number(((occupiedRoomsCount / roomsCount) * 100).toFixed(2))
    : 0;

  // Receita
  const revenue = reservationsInPeriod.reduce(
    (sum, reservation) =>
      sum +
      (reservation.amountPaid ?? reservation.totalPrice ?? 0) +
      (reservation.extraCharge ?? 0) -
      (reservation.refundAmount ?? 0),
    0
  );

  // Receita prevista
  const predictedRevenueAgg = await prisma.reservation.aggregate({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      checkIn: { gte: end },
    },
    _sum: { totalPrice: true },
  });

 

  return {
    period,
    start,
    end,
    roomsCount,
    occupiedRoomsCount,        
    activeReservations: activeReservationsInPeriod.length,
    occupancyRate,
    reservationsCount: reservationsInPeriod.length,
    revenue,
    predictedRevenue: predictedRevenueAgg._sum.totalPrice ?? 0,
  };
}

  
}
