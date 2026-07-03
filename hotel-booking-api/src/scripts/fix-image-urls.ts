import { prisma } from "../prisma/client.js";

async function fixImageUrls() {
  const rooms = await prisma.room.findMany({
    where: {
      imageUrl: {
        contains: "localhost:9090",
      },
    },
  });

  console.log(`Encontrados ${rooms.length} quartos para atualizar.`);

  for (const room of rooms) {
    const novaUrl = room.imageUrl?.replace("localhost:3000", "localhost:9090");

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