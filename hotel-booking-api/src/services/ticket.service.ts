import { PrismaClient } from "@prisma/client";

// Certifica-se de que a variável se chama exatamente 'prisma' e tem o 'export'
export const prisma = new PrismaClient();
type AuthUser = {
  id: string;
  role: string;
};

export class TicketService {
  // POST /public/tickets - Criar ticket
  static async create(data: any, actor: AuthUser) {
    if (!data.subject || !data.message) {
      throw new Error("Assunto e mensagem são obrigatórios");
    }

    const reservation = data.reservationId
      ? await prisma.reservation.findUnique({
          where: { id: data.reservationId },
        })
      : null;

    if (reservation && actor.role === "CLIENT" && reservation.userId !== actor.id) {
      throw new Error("Sem permissão para esta reserva");
    }

    return prisma.ticket.create({
      data: {
        type: data.type ?? "COMPLAINT",
        subject: data.subject,
        message: data.message,
        userId: actor.role === "CLIENT" ? actor.id : data.userId,
        guestId: data.guestId,
        reservationId: data.reservationId,
        requestedCheckIn: data.requestedCheckIn ? new Date(data.requestedCheckIn) : undefined,
        requestedCheckOut: data.requestedCheckOut ? new Date(data.requestedCheckOut) : undefined,
        requestedRoomId: data.requestedRoomId,
      },
      include: {
        reservation: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  // GET /public/tickets - Listar os meus tickets (Cliente)
  static async findMine(userId: string, filters: any = {}) {
    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return prisma.ticket.findMany({
      where,
      include: {
        reservation: { include: { room: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // GET /public/tickets/admin - Listar todos (Admin/Staff)
  static async findAll(filters: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return prisma.ticket.findMany({
      where,
      include: {
        reservation: { include: { room: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // GET /public/tickets/:id - Obter ticket por ID com validação de escopo
  static async findById(id: string, actorId: string, isAdmin: boolean) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        reservation: { include: { room: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });

    if (!ticket) throw new Error("Ticket não encontrado");

    // Se não for admin/staff, só pode ver se for o dono do ticket
    if (!isAdmin && ticket.userId !== actorId) {
      throw new Error("Acesso negado a este ticket");
    }

    return ticket;
  }

  // PATCH /public/tickets/admin/:id - Atualizar ticket e aplicar automações
  static async update(id: string, data: any, actor: AuthUser) {
    if (actor.role === "CLIENT") {
      throw new Error("Clientes não podem alterar propriedades administrativas do ticket");
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new Error("Ticket não encontrado");

    // Automação: Se for aprovação (RESOLVED) de uma alteração de reserva
    if (ticket.type === "ALTERATION" && data.status === "RESOLVED" && ticket.reservationId) {
      const updateData: any = {};
      if (ticket.requestedCheckIn) updateData.checkIn = ticket.requestedCheckIn;
      if (ticket.requestedCheckOut) updateData.checkOut = ticket.requestedCheckOut;
      if (ticket.requestedRoomId) updateData.roomId = ticket.requestedRoomId;

      return prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: ticket.reservationId! },
          data: updateData,
        });

        return tx.ticket.update({
          where: { id },
          data: {
            status: "RESOLVED",
            response: data.response ?? "Alteração aplicada com sucesso.",
            assignedToId: actor.id,
          },
        });
      });
    }

    return prisma.ticket.update({
      where: { id },
      data: {
        status: data.status ?? ticket.status,
        response: data.response,
        assignedToId: data.assignedToId ?? actor.id,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SISTEMA DE CHAT/MENSAGENS INTERNAS
  // ─────────────────────────────────────────────────────────────

  // GET /public/tickets/:id/mensagens
  static async getMessages(ticketId: string, actorId: string, isAdmin: boolean) {
    // Verificar se o ticket existe e se o usuário tem acesso
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket não encontrado");
    if (!isAdmin && ticket.userId !== actorId) throw new Error("Acesso negado");

    return prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" }, // Histórico em ordem cronológica
    });
  }
// POST /public/tickets/:id/mensagens
static async addMessage(ticketId: string, text: string, actor: AuthUser) {
  if (!text || text.trim() === "") throw new Error("A mensagem não pode estar vazia");

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket não encontrado");

  // Validação de acesso para escrita
  const isAdmin = ["ADMIN", "MANAGER", "RECEPTION"].includes(actor.role);
  if (!isAdmin && ticket.userId !== actor.id) {
    throw new Error("Sem permissão para interagir neste ticket");
  }

  // Criar a mensagem
  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: ticketId,
      userId: actor.id,  // ← Usar userId, não senderId
      message: text,
      isStaff: !isAdmin && actor.role !== "CLIENT" // Se não é admin e não é cliente, então é staff
    },
    include: {
      user: {  // ← Usar "user" em vez de "sender"
        select: { id: true, name: true, role: true }
      },
      ticket: {
        select: { id: true, status: true, type: true }
      }
    },
  });

  // Se o cliente responder, altera o status para 'OPEN' para alertar a recepção
  if (actor.role === "CLIENT" && ticket.status === "RESOLVED") {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "OPEN" },
    });
  }

  return message;
}

// GET /public/tickets/:id/mensagens
static async getMessages(ticketId: string, actorId: string, isAdmin: boolean) {
  // Verificar se o ticket existe e se o usuário tem acesso
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket não encontrado");
  if (!isAdmin && ticket.userId !== actorId) throw new Error("Acesso negado");

  return prisma.ticketMessage.findMany({
    where: { ticketId },
    include: {
      user: {  // ← Usar "user" em vez de "sender"
        select: { id: true, name: true, role: true }
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

  // GET /public/tickets/admin/stats
  static async getStats() {
    const countsByStatus = await prisma.ticket.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return countsByStatus.reduce(
      (acc: any, curr) => ({ ...acc, [curr.status]: curr._count.id }),
      {}
    );
  }
}