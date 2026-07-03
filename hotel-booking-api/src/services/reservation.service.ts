import { prisma } from "../prisma/client.js";
import { ReservationStatus, PaymentStatus } from "@prisma/client"; // Enums do Prisma protegidos
import { EmailService } from "./email.service.js";

type AuthUser = {
  id: string;
  role: string;
};

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const reservationInclude = {
  room: true,
  guest: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      isActive: true,
      createdAt: true,
    },
  },
} as const;

export class ReservationService {
  private static async getPolicy() {
    return prisma.hotelPolicy.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
  }

  private static parseDate(value: string | Date, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`${field} invalido`, 400);
    }
    return date;
  }

  private static sameCalendarDay(a: Date, b: Date) {
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
  }

  // O check-out é sempre às 12h00 do dia de saída, independentemente da hora
  // que tenha sido enviada na data de checkOut.
  private static normalizeCheckOut(checkOut: Date) {
    const normalized = new Date(checkOut);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }

  private static calculateNights(checkIn: Date, checkOut: Date) {
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (nights <= 0) {
      throw new AppError("Datas da reserva invalidas", 400);
    }

    return nights;
  }

   static async findRoomConflict(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeReservationId?: string
  ) {
    const now = new Date();

    return prisma.reservation.findFirst({
      where: {
        roomId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        OR: [
          { status: ReservationStatus.CONFIRMED },
          { status: ReservationStatus.CHECKED_IN },
          {
            status: ReservationStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            expiresAt: { gt: now },
          },
        ],
      },
    });
  }

   static async suggestRoom(
    checkIn: Date,
    checkOut: Date,
    capacity?: number,
    excludeRoomId?: string
  ) {
    const now = new Date();

    const conflictingReservations = await prisma.reservation.findMany({
      where: {
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        OR: [
          { status: ReservationStatus.CONFIRMED },
          { status: ReservationStatus.CHECKED_IN },
          {
            status: ReservationStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            expiresAt: { gt: now },
          },
        ],
      },
      select: { roomId: true },
    });

    const unavailableRoomIds = conflictingReservations.map((r) => r.roomId);
    if (excludeRoomId) {
      unavailableRoomIds.push(excludeRoomId);
    }

    return prisma.room.findFirst({
      where: {
        id: { notIn: unavailableRoomIds },
        maintenance: "NONE",
        capacity: capacity ? { gte: capacity } : undefined,
      },
      orderBy: [{ pricePerNight: "asc" }, { number: "asc" }],
    });
  }

  private static async assertRoomAvailable(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeReservationId?: string
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) throw new AppError("Quarto nao encontrado", 404);
    if (room.maintenance !== "NONE") {
      throw new AppError("Quarto em manutencao", 409);
    }

    const conflict = await this.findRoomConflict(
      roomId,
      checkIn,
      checkOut,
      excludeReservationId
    );

    if (conflict) {
      const suggestion = await this.suggestRoom(
        checkIn,
        checkOut,
        room.capacity,
        roomId
      );
      const message = suggestion
        ? `Quarto indisponivel. Sugestao: quarto ${suggestion.number}`
        : "Quarto indisponivel para estas datas";

      throw new AppError(message, 409);
    }

    return room;
  }

  private static validateGuestData(data: any, requireName = false) {
    if (requireName && !data?.name) {
      throw new AppError("Nome do hospede e obrigatorio", 400);
    }

    if (!data?.idDocument) {
      throw new AppError("Numero do bilhete ou passaporte e obrigatorio", 400);
    }

    if (!data?.province && !data?.country) {
      throw new AppError("Informe a provincia ou o pais do hospede", 400);
    }
  }

  private static async upsertGuestForUser(userId: string, guestInput: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Utilizador nao encontrado", 404);

    const existingGuest = await prisma.guest.findUnique({ where: { userId } });

    const guestData = {
      name: guestInput?.name || user.name,
      email: guestInput?.email || user.email,
      phone: guestInput?.phone || existingGuest?.phone || user.phone,
      idDocument: guestInput?.idDocument || existingGuest?.idDocument || user.idDocument,
      province: guestInput?.province || existingGuest?.province || user.province,
      country: guestInput?.country || existingGuest?.country || user.country,
      isForeigner: guestInput?.isForeigner !== undefined ? Boolean(guestInput.isForeigner) : (existingGuest?.isForeigner || user.isForeigner || false),
    };

    this.validateGuestData(guestData, false);

    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: guestData.phone,
        idDocument: guestData.idDocument,
        province: guestData.province,
        country: guestData.country,
        isForeigner: guestData.isForeigner,
      },
    });

    return prisma.guest.upsert({
      where: { userId },
      update: guestData,
      create: {
        ...guestData,
        userId,
      },
    });
  }

  private static async createWalkInGuest(data: any, staffId: string) {
    this.validateGuestData(data, true);

    return prisma.guest.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        idDocument: data.idDocument,
        province: data.province || null,
        country: data.country || null,
        isForeigner: Boolean(data.isForeigner),
        verifiedByStaff: true,
        createdById: staffId,
      },
    });
  }

  // 1. CRIAR RESERVA: O Quarto NÃO fica ocupado aqui. Continua VACANT_CLEAN
  static async create(data: any, actor: AuthUser) {
    const checkIn = this.parseDate(data.checkIn, "checkIn");
    const checkOut = this.normalizeCheckOut(this.parseDate(data.checkOut, "checkOut"));
    const nights = this.calculateNights(checkIn, checkOut);
    const room = await this.assertRoomAvailable(data.roomId, checkIn, checkOut);
    const policy = await this.getPolicy();

    const isStaff = ["ADMIN", "MANAGER", "RECEPTION"].includes(actor.role);
    let guest;
    let userId: string | null = null;

    if (data.guest) {
      guest = await this.createWalkInGuest(data.guest, actor.id);
      userId = isStaff && data.userId ? data.userId : null;
    } else {
      const targetUserId = isStaff && data.userId ? data.userId : actor.id;
      guest = await this.upsertGuestForUser(targetUserId, data);
      userId = targetUserId;
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId,
        guestId: guest.id,
        roomId: data.roomId,
        checkIn,
        checkOut,
        totalPrice: room.pricePerNight * nights,
        status: ReservationStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        expiresAt: new Date(Date.now() + policy.paymentHoldMinutes * 60 * 1000),
        createdById: isStaff ? actor.id : undefined,
        externalPlatform: data.externalPlatform,
        externalReservationId: data.externalReservationId,
      },
      include: reservationInclude,
    });

    return reservation;
  }

  static async findAll(filters: any = {}) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.active === "true") {
      where.status = { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] };
    }
    if (filters.history === "true") {
      where.status = { in: [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED, ReservationStatus.EXPIRED] };
    }

    return prisma.reservation.findMany({
      where,
      include: reservationInclude,
      orderBy: { createdAt: "desc" },
    });
  }


  static async myReservations(userId: string, userEmail: string) {
    return prisma.reservation.findMany({
      where: {
        OR: [
          { userId: userId },
          {
            guest: {
              email: {
                equals: userEmail,
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: reservationInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  static async findMine(userId: string, userEmail: string, userPhone?: string, userDocument?: string) {
    return prisma.reservation.findMany({
      where: {
        OR: [
          { userId: userId },
          { guest: { email: { equals: userEmail, mode: 'insensitive' } } },
          ...(userPhone ? [{ guest: { phone: userPhone } }] : []),
          ...(userDocument ? [{ guest: { idDocument: userDocument } }] : [])
        ]
      },
      include: reservationInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) throw new AppError("Reserva nao encontrada", 404);
    return reservation;
  }

  static async reschedule(id: string, data: any) {

    // Apenas force o tipo do array para ser um array do enum do Prisma
    const finishedStatuses = [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED
    ] as ReservationStatus[];
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!reservation) throw new AppError("Reserva nao encontrada", 404);

    if (finishedStatuses.includes(reservation.status)) {
      throw new AppError("Reservas finalizadas não podem ser alteradas", 409);
    }

    const checkIn = data.checkIn
      ? this.parseDate(data.checkIn, "checkIn")
      : reservation.checkIn;
    const checkOut = data.checkOut
      ? this.normalizeCheckOut(this.parseDate(data.checkOut, "checkOut"))
      : reservation.checkOut;

    const roomId = data.roomId ?? reservation.roomId;
    const isChangingRoom = roomId !== reservation.roomId;

    const nights = this.calculateNights(checkIn, checkOut);
    const room = await this.assertRoomAvailable(roomId, checkIn, checkOut, id);
    const policy = await this.getPolicy();

    if (isChangingRoom && reservation.room) {
      const currentGuests = (reservation.adults ?? 0) + (reservation.children ?? 0);
      if (currentGuests > room.capacity) {
        throw new AppError(
          `O novo quarto #${room.number} tem capacidade para ${room.capacity} hóspedes, mas a reserva tem ${currentGuests}.`,
          409
        );
      }
    }

    const newTotalPrice = room.pricePerNight * nights;
    const currentPaid = reservation.amountPaid ?? 0;
    const needsAdditionalPayment = newTotalPrice > currentPaid;

    return prisma.reservation.update({
      where: { id },
      data: {
        roomId,
        checkIn,
        checkOut,
        totalPrice: newTotalPrice,
        status: needsAdditionalPayment ? ReservationStatus.PENDING : reservation.status,
        paymentStatus: needsAdditionalPayment ? PaymentStatus.PENDING : reservation.paymentStatus,
        expiresAt: needsAdditionalPayment
          ? new Date(Date.now() + policy.paymentHoldMinutes * 60 * 1000)
          : reservation.expiresAt,
      },
      include: reservationInclude,
    });
  }

  static async changeRoom(id: string, roomId: string) {
    if (!roomId) throw new AppError("Informe o novo quarto", 400);
    return this.reschedule(id, { roomId });
  }

  static async cancel(id: string, reason: string) {


    const finishedStatuses = [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED
    ] as ReservationStatus[];
    if (!reason?.trim()) {
      throw new AppError("Informe o motivo do cancelamento", 400);
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) throw new AppError("Reserva nao encontrada", 404);
    if (finishedStatuses.includes(reservation.status)) {
      throw new AppError("Reservas finalizadas não podem ser alteradas", 409);
    }

    const policy = await this.getPolicy();
    const paidAmount = reservation.amountPaid ?? 0;

    // Regra das 48h: se o cancelamento ocorrer com 48h ou mais de antecedência
    // em relação à data de check-in agendada, não há taxa de cancelamento.
    // Caso contrário, aplica-se a taxa definida pelo administrador na política do hotel.
    const hoursUntilCheckIn =
      (reservation.checkIn.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    const isWithin48Hours = hoursUntilCheckIn < 48;

    let cancellationFee = 0;
    if (isWithin48Hours && paidAmount > 0) {
      const percentFee = reservation.totalPrice * (policy.cancellationFeePercent / 100);
      cancellationFee = Math.min(paidAmount, Math.max(policy.minCancellationFee, percentFee));
    }

    const refundAmount = Math.max(paidAmount - cancellationFee, 0);

    // Se a reserva for cancelada, garantimos que o quarto fica VACANT_CLEAN
    await prisma.room.update({
      where: { id: reservation.roomId },
      data: {
        state: "VACANT_CLEAN",
        inspection: "INSPECTED"
      },
    });

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
        cancellationReason: reason.trim(),
        cancellationFee,
        refundAmount,
      },
      include: reservationInclude,
    });

    const email = updatedReservation.guest?.email ?? updatedReservation.user?.email;
    if (email) {
      try {
        await EmailService.sendReservationCancellation(email, updatedReservation);
      } catch (err) {
        console.error("Erro ao enviar e-mail de cancelamento:", err);
      }
    }

    return updatedReservation;
  }

  static async delete(id: string) {
    const finishedStatuses = [
      ReservationStatus.COMPLETED,
    ] as ReservationStatus[];
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new AppError("Reserva nao encontrada", 404);
    if (finishedStatuses.includes(reservation.status)) {
      throw new AppError("Reservas finalizadas não podem ser alteradas", 409);
    }

    await prisma.reservation.delete({ where: { id } });
    return { message: "Reserva eliminada com sucesso" };
  }

  // CONFIRMAR PAGAMENTO: Passa a reserva para CONFIRMED. O quarto MANTÉM-SE livre (VACANT_CLEAN)
  static async confirmPayment(id: string, method: string, amountPaid?: number) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) throw new AppError("Reserva nao encontrada", 404);

    if (reservation.status === ReservationStatus.EXPIRED || (reservation.expiresAt && reservation.expiresAt < new Date())) {
      throw new AppError("Reserva expirada. E necessario refazer a reserva", 410);
    }

    const currentPaid = reservation.amountPaid ?? 0;
    const incomingPayment = amountPaid ?? (reservation.totalPrice - currentPaid);
    const finalAmountPaid = currentPaid + incomingPayment;

    const isFullyPaid = finalAmountPaid >= reservation.totalPrice;

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        amountPaid: finalAmountPaid,
        paymentStatus: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        status: isFullyPaid ? ReservationStatus.CONFIRMED : ReservationStatus.PENDING, 
        paymentMethod: method,
        expiresAt: isFullyPaid ? null : reservation.expiresAt,
      },
      include: reservationInclude,
    });

    const email = updated.guest?.email ?? updated.user?.email;
    if (isFullyPaid && email) {
      await EmailService.sendReservationConfirmation(email, updated);
    }

    return updated;
  }

  static async uploadPaymentProof(id: string, paymentProofUrl: string) {
    await this.findById(id);

    return prisma.reservation.update({
      where: { id },
      data: { paymentProofUrl },
      include: reservationInclude,
    });
  }

  static async expireOldReservations() {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
    });

    let count = 0;
    for (const res of expiredReservations) {
      const paid = res.amountPaid ?? 0;
      const refund = paid;

      await prisma.reservation.update({
        where: { id: res.id },
        data: {
          status: ReservationStatus.EXPIRED,
          paymentStatus: PaymentStatus.CANCELLED,
          refundAmount: refund,
          cancellationReason: paid > 0
            ? "Expirou automaticamente por falta de pagamento do valor adicional após reajuste."
            : "Expirou por falta de pagamento do sinal inicial.",
        },
      });

      await prisma.room.update({
        where: { id: res.roomId },
        data: { state: "VACANT_CLEAN" },
      });

      count++;
    }

    return { expiredCount: count };
  }


  // O recepcionista precisa confirmar o pagamento desta taxa (lateFeeConfirmed).
  static async accrueLateFees() {
    const now = new Date();
    const policy = await this.getPolicy();

    const candidates = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CHECKED_IN,
        checkOut: { lt: now },
      },
    });

    let updated = 0;

    for (const res of candidates) {
      const graceEnd = new Date(
        res.checkOut.getTime() + policy.lateCheckoutGraceMinutes * 60 * 1000
      );

      if (now <= graceEnd) continue;

      const periodsElapsed = Math.ceil(
        (now.getTime() - graceEnd.getTime()) / (60 * 60 * 1000)
      );
      const newAmount = periodsElapsed * policy.lateCheckoutHourlyFee;
      const currentAmount = res.lateFeeAmount ?? 0;

      if (newAmount > currentAmount) {
        await prisma.reservation.update({
          where: { id: res.id },
          data: {
            lateFeeAmount: newAmount,
            lateFeeConfirmed: false,
            lastLateFeeAt: now,
          },
        });
        updated++;
      }
    }

    return { updatedCount: updated };
  }

  // O recepcionista confirma que o hóspede pagou a taxa de late checkout acumulada
  static async confirmLateFeePayment(id: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new AppError("Reserva nao encontrada", 404);

    const lateFeeAmount = reservation.lateFeeAmount ?? 0;
    const lateFeePaid = reservation.lateFeePaid ?? 0;

    if (lateFeeAmount <= lateFeePaid) {
      throw new AppError("Nao ha taxa de late checkout pendente de confirmacao", 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: {
        lateFeePaid: lateFeeAmount,
        lateFeeConfirmed: true,
        amountPaid: (reservation.amountPaid ?? 0) + (lateFeeAmount - lateFeePaid),
      },
      include: reservationInclude,
    });
  }

  // FAZER CHECK-IN: Único sítio onde a Reserva passa a CHECKED_IN e o Quarto passa a OCCUPIED!
  static async checkIn(reservationId: string) {
    const now = new Date();

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { room: true },
    });

    if (!reservation) throw new AppError("Reserva nao encontrada", 404);
    if (reservation.paymentStatus !== PaymentStatus.PAID) {
      throw new AppError("Pagamento ainda nao confirmado integralmente", 400);
    }
    if (reservation.expiresAt && reservation.expiresAt < now) {
      throw new AppError("Reserva expirada. E necessario refazer a reserva", 410);
    }
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new AppError("A reserva precisa estar CONFIRMED para fazer o check-in", 409);
    }
    if (reservation.checkInReal) {
      throw new AppError("Check-in ja realizado", 409);
    }
    if (!this.sameCalendarDay(now, reservation.checkIn)) {
      throw new AppError("Check-in permitido apenas no dia agendado", 400);
    }
    if (reservation.room.state !== "VACANT_CLEAN") {
      throw new AppError("Quarto ainda nao esta pronto para entrada (Precisa estar livre e limpo)", 409);
    }

    // Atualiza o QUARTO para OCCUPIED (Ocupado fisicamente)
    await prisma.room.update({
      where: { id: reservation.roomId },
      data: { state: "OCCUPIED" },
    });

    //  Atualiza a RESERVA para CHECKED_IN (Garante a mudança de status na BD)
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        checkInReal: now,
        status: ReservationStatus.CHECKED_IN
      },
      include: reservationInclude,
    });

    // Retorna o registo já atualizado diretamente
    return updatedReservation;
  }

  //  FAZER CHECK-OUT: Passa a reserva para COMPLETED e liberta o quarto como VACANT_DIRTY (Para limpeza)
  static async checkOut(reservationId: string, earlyCheckoutReason?: string) {
    const finishedStatuses = [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED
    ] as ReservationStatus[];
    const reservation = await prisma.reservation.findUnique({

      where: { id: reservationId },
      include: { room: true },
    });

    if (!reservation) throw new AppError("Reserva nao encontrada", 404);

    // Proteção: Garante que reservas já finalizadas, canceladas ou expiradas não sofrem novo check-out
    if (finishedStatuses.includes(reservation.status)) {
      throw new AppError("Reservas finalizadas não podem ser alteradas", 409);
    }

    const now = new Date();
    const policy = await this.getPolicy();
    let refundAmount = 0;
    let extraCharge = 0;

    // Se o hóspede nunca chegou a fazer check-in real, consideramos um check-out forçado/no-show
    const isForcedCheckout = !reservation.checkInReal;

    if (!isForcedCheckout && reservation.checkInReal) {


      // Se o cliente está a sair antes da data de check-out agendada e a política prevê reembolso
      if (now < reservation.checkOut && policy.earlyCheckoutRefundPercent > 0) {
        if (!earlyCheckoutReason?.trim()) {
          throw new AppError("Informe o motivo da saida antecipada", 400);
        }

        // Calcula o total de horas contratadas vs horas não utilizadas
        const totalHours =
          (reservation.checkOut.getTime() - reservation.checkIn.getTime()) /
          (1000 * 60 * 60);
        const unusedHours =
          (reservation.checkOut.getTime() - now.getTime()) / (1000 * 60 * 60);
        const unusedValue = (reservation.totalPrice / totalHours) * unusedHours;

        // Aplica a percentagem de reembolso configurada na política do hotel
        refundAmount = unusedValue * (policy.earlyCheckoutRefundPercent / 100);
      }


      // Adiciona o tempo de tolerância (grace minutes) à hora de check-out prevista
      const graceEnd = new Date(
        reservation.checkOut.getTime() + policy.lateCheckoutGraceMinutes * 60 * 1000
      );

      // Se o cliente passou da tolerância, cobramos a taxa horária da política
      if (now > graceEnd) {
        const extraHours = Math.ceil(
          (now.getTime() - graceEnd.getTime()) / (1000 * 60 * 60)
        );
        extraCharge = extraHours * policy.lateCheckoutHourlyFee;
      }

  
      // (a cada x minutos após as 12h00) que ainda não foram pagas/confirmadas
      const alreadyAccrued = reservation.lateFeeAmount ?? 0;
      const alreadyPaid = reservation.lateFeePaid ?? 0;
      if (alreadyAccrued > extraCharge) {
        extraCharge = alreadyAccrued;
      }
      extraCharge = Math.max(extraCharge - alreadyPaid, 0) + alreadyPaid;
    }

    await prisma.room.update({
      where: { id: reservation.roomId },
      data: {
        state: "VACANT_DIRTY",
        inspection: "NOT_INSPECTED",
      },
    });

    //  Guarda os cálculos e encerra a reserva como COMPLETED
    const completedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.COMPLETED,
        checkOutReal: now,
        refundAmount: refundAmount > 0 ? refundAmount : null,
        extraCharge: extraCharge > 0 ? extraCharge : null,
        earlyCheckoutReason: isForcedCheckout
          ? "Check-out forçado pelo sistema/staff (Hóspede não compareceu ou regularização)."
          : earlyCheckoutReason,
        lateFeeAmount: extraCharge > 0 ? extraCharge : 0,
        lateFeePaid: extraCharge > 0 ? extraCharge : 0,
        lateFeeConfirmed: true,
        lastLateFeeAt: null,
      },
      include: reservationInclude,
    });

    // Envia o e-mail final para o hóspede com os detalhes e o extrato da estadia
    const email = completedReservation.guest?.email ?? completedReservation.user?.email;
    if (email) {
      try {
        await EmailService.reservationFinished(email, completedReservation);
      } catch (err) {
        console.error("Erro ao enviar e-mail de encerramento:", err);
      }
    }

    return completedReservation;
  }

  static async update(id: string, data: any) {
    const reservation = await this.findById(id);

    // Apenas force o tipo do array para ser um array do enum do Prisma
    const finishedStatuses = [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED
    ] as ReservationStatus[];

    if (finishedStatuses.includes(reservation.status)) {
      throw new AppError("Reservas finalizadas não podem ser alteradas", 409);
    }

    // Atualiza apenas campos permitidos
    const updateData: any = {};

    if (data.notes) updateData.notes = data.notes;
    if (data.adults) updateData.adults = data.adults;
    if (data.children) updateData.children = data.children;

    return prisma.reservation.update({
      where: { id },
      data: updateData,
      include: reservationInclude,
    });
  }
}