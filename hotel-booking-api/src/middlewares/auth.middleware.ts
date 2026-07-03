import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client.js";

interface JwtPayload {
  id: string;
  email?: string;
  role?: string;
  tokenVersion?: number;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não enviado" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({ message: "Token mal formatado" });
  }

  const [, token] = parts;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "Utilizador não encontrado" });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Sessão inválida (logout)" });
    }

    (req as any).user = decoded;

    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}