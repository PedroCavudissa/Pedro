import { prisma } from "../prisma/client.js";
import bcrypt from "bcrypt";
export async function createDefaultAdmin() {
    const adminEmail = "admin@system.com";
    const recepcaoEmail = "recepcao@system.com";


    const recepcaoExists = await prisma.user.findUnique(
        {
            where: { email: recepcaoEmail },
        });
    if (recepcaoExists) {
        console.log("recepcionista já existe");
        return;
    }
    const hashedPasswordR = await bcrypt.hash("recepcao123", 10);
    await prisma.user.create({
        data: {
            name: "Recepcionista",
            email: recepcaoEmail,
            password: hashedPasswordR,
            role: "RECEPTION",
            emailVerified: true,
        },
    });
    console.log(" Recepcionista Criado com sucesso criado automaticamente");

    const adminExists = await prisma.user.findUnique({
        where: { email: adminEmail },
    });
    if (adminExists) {
        console.log("✔ Admin já existe desde muito tempo");
        return;
    }
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
        data: {
            name: "System Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "ADMIN",
            emailVerified: true,
        },
    });
    console.log(" Admin criado automaticamente");


}
