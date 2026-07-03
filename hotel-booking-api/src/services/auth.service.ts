import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../prisma/client.js";
import { generateToken } from "../utils/jwt.js";
import { EmailService } from "./email.service.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Enum local para validar a criação de Staff por Administradores
export enum StaffRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  RECEPTION = "RECEPTION",
}

export class AuthService {

  //Registro de Clientes
  static async register(name: string, email: string, password: string) {

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Este email já está registado");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: false,
        role: "CLIENT",
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    await EmailService.sendVerificationEmail(user.email, token);

    // remover password antes de retornar
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  //Login
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        emailVerified: true,
        isActive: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) throw new Error("Email ou senha inválidos");

    if (!user.password) {
      throw new Error("Esta conta foi criada com a conta Google. Use o login com Google.");
    }

    if (!user.isActive) {
      throw new Error("Esta conta está desativada. Contacte o administrador.");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Email ou senha inválidos");

    if (
      (user.role === "CLIENT" || user.role === "RECEPTION") &&
      !user.emailVerified
    ) {
      throw new Error(
        "Conta não Verificada. Verifique o seu email para ativar a conta."
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    const { password: _, ...safeUser } = user;

    return { user: safeUser, token };
  }

  //Login com conta Google (Google Identity Services - idToken)
  static async loginWithGoogle(idToken: string) {
    if (!idToken) throw new Error("Token do Google em falta");

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new Error("Token do Google invalido ou expirado");
    }

    if (!payload?.email) {
      throw new Error("Não foi possível obter o email da conta Google");
    }

    if (payload.email_verified === false) {
      throw new Error("O email da conta Google não está verificado");
    }

    let user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email.split("@")[0],
          email: payload.email,
          password: null,
          googleId: payload.sub,
          authProvider: "GOOGLE",
          role: "CLIENT",
          emailVerified: true,
        },
      });
    } else {
      if (!user.isActive) {
        throw new Error("Esta conta está desativada. Contacte o administrador.");
      }

      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: payload.sub,
            authProvider: user.authProvider === "LOCAL" && user.password ? user.authProvider : "GOOGLE",
            emailVerified: true,
          },
        });
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    const { password: _, ...safeUser } = user;

    return { user: safeUser, token };
  }


  static async createStaff(name: string, email: string, password: string, role: StaffRole) {
    // Validar se o role enviado é permitido para Staff
    if (!Object.values(StaffRole).includes(role)) {
      throw new Error("Cargo invalido. Escolha entre ADMIN, MANAGER ou RECEPTION");
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error("Este email já está registado");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role,
        emailVerified: true,
      },
    });
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  //Verificação de Email
  static async verifyEmail(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      await prisma.user.update({
        where: { email: decoded.email },
        data: { emailVerified: true },
      });
      return { message: "Email verificado com sucesso" };
    } catch {
      throw new Error("Token inválido ou expirado");
    }
  }

  //Recuperação de Palavra-Passe
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Utilizador não encontrado");
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetExpires: new Date(Date.now() + 1000 * 60 * 15), // 15 minutos
      },
    });

    await EmailService.sendResetPasswordEmail(email, token);
    return { message: "Email de recuperação enviado com sucesso" };
  }


  // Resetar Palavra-Passe

  static async resetPassword(token: string, newPassword: string) {
    if (!token) throw new Error("O token de autenticação deve ser fornecido");

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch {
      throw new Error("Token inválido ou expirado");
    }

    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user || user.resetToken !== token) {
      throw new Error("Token inválido ou já utilizado");
    }

    // Verificar se o token expirou no banco de dados
    if (user.resetExpires && new Date() > user.resetExpires) {
      throw new Error("Token expirado");
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: user.email },
      data: {
        password: hashed,
        resetToken: null,
        resetExpires: null,
      },
    });

    return { message: "Password alterada com sucesso" };
  }

  //Alterar Palavra-Passe(Usuário Logado)
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilizador não encontrado");

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new Error("Password atual incorreta");

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: "Password alterada com sucesso" };
  }

  //Alterar Status do Usuário
  static async setUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilizador não encontrado");

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return { message: `Conta ${isActive ? "ativada" : "desativada"} com sucesso` };
  }

 static async resendVerificationEmail(email: string) {
  // ✅ VERIFICAÇÃO DE SEGURANÇA: Garantir que email é uma string
  // Se email for um objeto, extrair o valor
  let emailString: string;
  
  if (typeof email === 'object' && email !== null) {
    // Se for um objeto com propriedade email
    if ('email' in email) {
      emailString = (email as any).email;
    } else {
      throw new Error("Formato de email inválido");
    }
  } else if (typeof email === 'string') {
    emailString = email;
  } else {
    throw new Error("Email deve ser uma string");
  }

  // Validar se é um email válido
  if (!emailString || !emailString.includes('@')) {
    throw new Error("Email inválido");
  }

  console.log('📧 Buscando usuário com email:', emailString);

  const user = await prisma.user.findUnique({ 
    where: { email: emailString } 
  });

  if (!user) {
    console.log('❌ Usuário não encontrado:', emailString);
    throw new Error("Utilizador não encontrado");
  }

  if (user.emailVerified) {
    throw new Error("Conta já verificada");
  }

  console.log('✅ Usuário encontrado, gerando token...');

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  console.log('📨 Enviando email para:', emailString);

  await EmailService.sendVerificationEmail(emailString, token);

  return { 
    success: true,
    message: "Email de verificação reenviado com sucesso" 
  };
}

  static async resendResetPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) throw new Error("Utilizador não encontrado");

    const token = generateToken({
      id: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetExpires: new Date(Date.now() + 1000 * 60 * 15),
      },
    });

    await EmailService.sendResetPasswordEmail(email, token);

    return { message: "Novo link de reset enviado" };
  }

  static async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    return { message: "Logout realizado com sucesso" };
  }

}
