//Amenidades
import { prisma } from "../prisma/client.js";

export class AmenityService {

  static async create(data: any) {

    const exists = await prisma.amenity.findUnique({
      where: {
        name: data.name,
      },
    });

    if (exists) {
      throw new Error("Amenidade já existe");
    }

    return prisma.amenity.create({
      data,
    });
  }

  static async findAll() {

    return prisma.amenity.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async update(id: string, data: any) {

    return prisma.amenity.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {

    await prisma.amenity.delete({
      where: { id },
    });

    return {
      message: "Amenidade removida",
    };
  }
}