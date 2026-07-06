import { prisma } from "../prisma/client.js";

async function fixImageUrls() {
  const rooms = await prisma.room.findMany({
    where: {
      imageUrl: {
        contains: "10.0.0.4:9090",
      },
    },
  });

  console.log(`Encontrados ${rooms.length} quartos para atualizar.`);

  for (const room of rooms) {
    const novaUrl = room.imageUrl?.replace("localhost:3000", "10.0.0.4:9090");

    await prisma.room.update({
      where: { id: room.id },
      data: { imageUrl: novaUrl },
    });

    console.log(`Atualizado: ${room.id} -> ${novaUrl}`);
  }

  console.log("Concluído!");
}

fixImageUrls()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());