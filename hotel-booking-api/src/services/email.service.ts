// services/email.service.ts

import nodemailer from "nodemailer";

export class EmailService {
  private static transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  static async sendVerificationEmail(email: string, token: string) {
    // ✅ URL APONTA DIRETAMENTE PARA O BACKEND
    const baseUrls = process.env.API_URL || 'http://10.10.0.4:9090';
    const verificationUrl = `${baseUrls}/auth/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: `"PEDRO HOTEL" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifique sua conta - PEDRO HOTEL",
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FAF9F6; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: #001E3D; padding: 30px 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">PEDRO HOTEL</h1>
            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Luxo & Conforto</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #001E3D; margin-top: 0;">Verifique sua conta ✅</h2>
            <p style="color: #475569; line-height: 1.6;">
              Olá,<br />
              Obrigado por se registrar no <strong>PEDRO HOTEL</strong>.
              Para ativar sua conta e começar a fazer reservas, clique no botão abaixo:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #D4AF37; color: #001E3D; padding: 14px 36px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block; font-size: 16px; transition: transform 0.2s;">
                Verificar Email →
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all; font-size: 12px; color: #3b82f6;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            
            <p style="color: #ef4444; font-size: 12px; text-align: center;">
              ⚠️ Este link expira em <strong>24 horas</strong> por segurança.<br />
              Se não foi você que criou esta conta, ignore este email.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">PEDRO HOTEL - Luxo & Conforto</p>
            <p style="margin: 4px 0 0;">© ${new Date().getFullYear()} Todos os direitos reservados.</p>
          </div>
        </div>
      `,
    });
  }
  // 2. Enviar link para Recuperação de Senha (Forgot Password)
  static async sendResetPasswordEmail(email: string, token: string) {
    const baseUrl =  'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: `"PEDRO HOTEL" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Recuperação de Password - PEDRO HOTEL",
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FAF9F6; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: #001E3D; padding: 30px 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">PEDRO HOTEL</h1>
            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Luxo & Conforto</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #001E3D; margin-top: 0;">Recuperação de Password 🔑</h2>
            <p style="color: #475569; line-height: 1.6;">Recebemos um pedido para redefinir a sua password. Clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #D4AF37; color: #001E3D; padding: 12px 32px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block; font-size: 16px;">
                Redefinir Password →
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all; font-size: 12px; color: #3b82f6;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            
            <p style="color: #ef4444; font-size: 12px; text-align: center;">
              ⚠️ Este link expira em <strong>15 minutos</strong> por segurança.<br />
              Se não foi você que pediu a recuperação, ignore este email.
            </p>
          </div>
        </div>
      `,
    });
  }

  // 3. Enviar confirmação de reserva
  static async sendReservationConfirmation(email: string, reservation: any) {
    await this.transporter.sendMail({
      from: `"PEDRO HOTEL" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reserva Confirmada - PEDRO HOTEL",
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FAF9F6; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: #001E3D; padding: 30px 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">PEDRO HOTEL</h1>
            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Luxo & Conforto</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #001E3D; margin-top: 0;">Reserva Confirmada! ✅</h2>
            <p style="color: #475569; line-height: 1.6;">A sua reserva foi confirmada com sucesso. Seguem os detalhes:</p>
            
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Quarto:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${reservation.room?.number ?? reservation.roomNumber ?? "N/D"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Tipo:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${reservation.room?.type ?? reservation.roomType ?? "Standard"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Check-in:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${new Date(reservation.checkIn).toLocaleDateString("pt-AO")} a partir das 14h00</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Check-out:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${new Date(reservation.checkOut).toLocaleDateString("pt-AO")} às 12h00</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Hóspedes:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${reservation.guests || 1} pessoa(s)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Total:</td>
                  <td style="padding: 8px 0; color: #D4AF37; font-weight: bold; font-size: 18px;">
                    ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(reservation.totalPrice)}
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/reservas" 
                 style="background: #001E3D; color: white; padding: 12px 32px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block; font-size: 16px;">
                Ver Minhas Reservas →
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Em caso de dúvidas, contacte a nossa recepção 24h.<br />
              Obrigado por escolher o PEDRO HOTEL! 🏨
            </p>
          </div>
        </div>
      `,
    });
  }

  // 4. Enviar email de reserva finalizada (checkout)
  static async reservationFinished(email: string, reservation: any) {
    await this.transporter.sendMail({
      from: `"PEDRO HOTEL" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Obrigado pela sua estadia - PEDRO HOTEL",
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FAF9F6; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: #001E3D; padding: 30px 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">PEDRO HOTEL</h1>
            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Luxo & Conforto</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #001E3D; margin-top: 0;">Obrigado pela sua estadia! 🌟</h2>

            <p style="color: #475569; line-height: 1.6;">
              Esperamos que tenha tido uma experiência maravilhosa no PEDRO HOTEL.
              A sua reserva foi finalizada com sucesso. Seguem os detalhes da sua estadia:
            </p>

            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Quarto:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${reservation.room?.number ?? reservation.roomNumber ?? "N/D"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Tipo:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${reservation.room?.type ?? reservation.roomType ?? "Standard"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Check-in:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${new Date(reservation.checkIn).toLocaleDateString("pt-AO")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Check-out:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${new Date(reservation.checkOut).toLocaleDateString("pt-AO")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Hóspedes:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${reservation.guests || 1} pessoa(s)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Valor Pago:</td>
                  <td style="padding: 8px 0; color: #D4AF37; font-weight: bold; font-size: 18px;">
                    ${new Intl.NumberFormat("pt-AO", {
                      style: "currency",
                      currency: "AOA",
                    }).format(reservation.amountPaid ?? reservation.totalPrice ?? 0)}
                  </td>
                </tr>
              </table>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 16px; margin: 25px 0;">
              <p style="margin: 0; color: #065f46; text-align: center; font-weight: bold;">
                Esperamos recebê-lo novamente em breve! 💚
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" 
                 style="background: #001E3D; color: white; padding: 12px 32px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block; font-size: 16px;">
                Visitar o Nosso Site →
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />

            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Obrigado por escolher o PEDRO HOTEL.<br />
              Foi um prazer recebê-lo! 🏨
            </p>
          </div>
        </div>
      `,
    });
  }

  // 5. Enviar email de cancelamento de reserva
  static async sendReservationCancellation(email: string, reservation: any) {
    const formatCurrency = (val: number) => 
      new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);

    await this.transporter.sendMail({
      from: `"PEDRO HOTEL" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Cancelamento de Reserva Confirmado - Quarto #${reservation.room?.number}`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FAF9F6; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: #001E3D; padding: 30px 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">PEDRO HOTEL</h1>
            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Luxo & Conforto</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px; line-height: 1.6;">
            <h2 style="color: #001E3D; margin-top: 0;">Reserva Cancelada ❌</h2>
            <p style="color: #475569;">Olá, <strong>${reservation.guest?.name || 'Hóspede'}</strong>,</p>
            <p style="color: #475569;">Confirmamos que a tua reserva para o quarto <strong>#${reservation.room?.number}</strong> foi cancelada com sucesso.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #001E3D; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Resumo Financeiro do Cancelamento</h3>
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Valor Total Pago:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatCurrency(reservation.amountPaid || 0)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Taxa de Cancelamento Aplicada:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #dc2626;">- ${formatCurrency(reservation.cancellationFee || 0)}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 12px 0 0 0; font-weight: bold; color: #001E3D;">Valor a Reembolsar:</td>
                  <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; color: #16a34a; font-size: 16px;">${formatCurrency(reservation.refundAmount || 0)}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #64748b;"><strong>Motivo do cancelamento:</strong> ${reservation.cancellationReason || 'Não informado'}</p>
            
            <p style="color: #475569;">Se tiveres alguma dúvida sobre o método de processamento do teu reembolso, entra em contacto com a nossa receção.</p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} PEDRO HOTEL. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `
    });
  }
}