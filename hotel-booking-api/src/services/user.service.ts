import { prisma } from "../prisma/client.js";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  address: true,
  idDocument: true,
  province: true,
  country: true,
  isForeigner: true,
  emailVerified: true,
  isActive: true,
  createdAt: true,
} as const;

export class UserService {
  static async getAllUsers(currentRole?: string, filters: any = {}) {
    const where: any = {};

    if (currentRole === "RECEPTION") {
      where.role = "CLIENT";
    } else if (filters.role) {
      where.role = filters.role;
    }

    return prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  static async getGuests(filters: any = {}) {
    const where: any = {};
    if (filters.verified === "true") where.verifiedByStaff = true;

    return prisma.guest.findMany({
      where,
      include: {
        user: { select: safeUserSelect },
        reservations: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { room: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...safeUserSelect,
        guestProfile: true,
      },
    });

    if (!user) throw new Error("Utilizador nao encontrado");
    return user;
  }

  static async updateMe(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilizador nao encontrado");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        idDocument: data.idDocument,
        province: data.province,
        country: data.country,
        isForeigner: data.isForeigner,
      },
      select: safeUserSelect,
    });

    await prisma.guest.upsert({
      where: { userId },
      update: {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        idDocument: updated.idDocument,
        province: updated.province,
        country: updated.country,
        isForeigner: Boolean(updated.isForeigner),
      },
      create: {
        userId,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        idDocument: updated.idDocument,
        province: updated.province,
        country: updated.country,
        isForeigner: Boolean(updated.isForeigner),
      },
    });

    return updated;
  }

  static async getById(id: string, currentRole?: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });

    if (!user) throw new Error("Utilizador nao encontrado");
    if (currentRole === "RECEPTION" && user.role !== "CLIENT") {
      throw new Error("Sem permissao para ver este utilizador");
    }

    return user;
  }

  static async delete(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { reservations: true },
    });

    if (!user) throw new Error("Utilizador nao encontrado");
    if (user.reservations.some((item) => ["PENDING", "CONFIRMED"].includes(item.status))) {
      throw new Error("Utilizador com reservas ativas nao pode ser eliminado");
    }

    await prisma.user.delete({ where: { id } });

    return { message: "Utilizador eliminado com sucesso" };
  }
}
