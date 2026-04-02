/**
 * Base email template — pai de todos os templates.
 *
 * @param {object} params
 * @param {string} params.title       - Título da aba (usado no <title>)
 * @param {string} params.preheader   - Texto oculto de pré-visualização do cliente de e-mail
 * @param {string} params.content     - HTML interno que vai dentro do canvas principal
 * @returns {string} HTML completo do e-mail
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Caminho absoluto do logo — use como CID attachment no nodemailer */
export const LOGO_PATH = join(__dirname, "logo.png");
export const LOGO_CID = "colmeia-logo";

export function baseTemplate({ title, preheader = "", content }) {
  return /* html */ `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #fcf9f0;
      font-family: Inter, Arial, sans-serif;
      color: #514532;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 0 !important; }
      .email-canvas  { padding: 24px 16px !important; }
      .card          { padding: 24px !important; }
      .action-card   { padding: 20px !important; }
    }
  </style>
</head>
<body style="background-color:#fcf9f0; margin:0; padding:0;">

  <!-- Preheader oculto -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#fcf9f0;">
    ${escapeHtml(preheader)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Wrapper externo -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#fcf9f0;" class="email-wrapper">
    <tr>
      <td align="center" style="padding: 0 24px;">

        <!-- Container max-width -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:672px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="padding: 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:12px; vertical-align:middle;">
                          <img src="cid:${LOGO_CID}" alt="Colmeia Pro" width="60" height="60"
                               style="display:block;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-family:Inter,Arial,sans-serif; font-weight:700;
                                       font-size:20px; color:#7c5800; letter-spacing:-0.5px;
                                       white-space:nowrap;">
                            Colmeia Pro
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CONTENT SLOT ── -->
          <tr>
            <td class="email-canvas" style="padding: 0 0 48px;">
              ${content}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding: 48px 0 32px; border-top: 1px solid rgba(213,196,171,0.3);">
              <!-- Copyright -->
              <p style="margin-top:16px; font-family:Inter,Arial,sans-serif;
                         font-size:12px; color:#78716c; text-align:center; line-height:1.625;">
                © ${new Date().getFullYear()} Colmeia Pro. Gestão de precisão para apicultores.
              </p>
              <!-- Disclaimer -->
              <p style="margin-top:8px; font-family:Inter,Arial,sans-serif;
                         font-size:12px; color:#a8a29e; text-align:center; line-height:1.5;">
                Você recebeu este e-mail porque está cadastrado na plataforma Colmeia Pro.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/** Escapa caracteres HTML para evitar XSS em variáveis inseridas no template. */
export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

//  <!-- Links -->
//               <table role="presentation" cellpadding="0" cellspacing="0" border="0">
//                 <tr>
//                   <td style="padding: 0 12px;">
//                     <a href="#" style="font-family:Inter,Arial,sans-serif; font-size:12px;
//                                        color:#78716c; text-decoration:none;">
//                       Suporte
//                     </a>
//                   </td>
//                   <td style="padding: 0 12px;">
//                     <a href="#" style="font-family:Inter,Arial,sans-serif; font-size:12px;
//                                        color:#78716c; text-decoration:none;">
//                       Termos de Uso
//                     </a>
//                   </td>
//                   <td style="padding: 0 12px;">
//                     <a href="#" style="font-family:Inter,Arial,sans-serif; font-size:12px;
//                                        color:#78716c; text-decoration:none;">
//                       Privacidade
//                     </a>
//                   </td>
//                 </tr>
//               </table>
