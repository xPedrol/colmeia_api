import { baseTemplate, escapeHtml } from "./base.js";

/**
 * Template de e-mail para recuperação de senha.
 *
 * @param {object} params
 * @param {string} params.code       - Código de recuperação de 6 dígitos
 * @param {string} [params.userName] - Nome do usuário para personalizar a saudação (opcional)
 * @returns {string} HTML completo do e-mail
 */
export function passwordResetTemplate({ code, userName }) {
  const greeting = userName
    ? `Olá, <strong>${escapeHtml(userName)}</strong>! Recebemos uma solicitação`
    : "Olá, recebemos uma solicitação";

  const content = /* html */ `
    <!-- ── Card principal ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#ffffff; border-radius:12px;
                  box-shadow:0 1px 2px rgba(0,0,0,0.05); overflow:hidden;"
           class="card">
      <tr>
        <td style="padding:32px; position:relative;">

          <!-- Título -->
          <h2 style="font-family:Inter,Arial,sans-serif; font-weight:700; font-size:24px;
                      color:#7c5800; line-height:1.5; margin-bottom:16px;">
            Recuperar Senha
          </h2>

          <!-- Descrição -->
          <p style="font-family:Inter,Arial,sans-serif; font-size:16px; color:#514532;
                     line-height:1.625; margin-bottom:32px;">
            ${greeting}
            para redefinir sua senha na sua conta da Colmeia Pro.
            Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.
          </p>

          <!-- Action card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background-color:#f6f3eb; border-radius:8px;" class="action-card">
            <tr>
              <td style="padding:24px 24px 32px;">
                <p style="font-family:Inter,Arial,sans-serif; font-size:16px; color:#1c1c17;
                           line-height:1.625; margin-bottom:24px;">
                  Clique no botão abaixo para criar uma nova senha e retomar sua gestão de precisão.
                </p>
                <!-- Código de recuperação -->
                <div style="background-color:#ffffff; border:1px solid rgba(213,196,171,0.5);
                            border-radius:8px; padding:20px 24px; text-align:center;">
                  <p style="font-family:Inter,Arial,sans-serif; font-size:12px; font-weight:500;color:#78716c;
                             letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">
                    Seu código de recuperação
                  </p>
                  <span style="font-family:Inter,Arial,sans-serif; font-weight:700; font-size:36px;
                               color:#7c5800; letter-spacing:8px;">
                    ${escapeHtml(code)}
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    title: "Recuperar Senha — Colmeia Pro",
    preheader: "Redefinição de senha solicitada para sua conta Colmeia Pro.",
    content,
  });
}
