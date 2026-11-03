import "server-only";
import { Resend } from "resend";
import { SITE_NAME, siteUrl } from "@/lib/utils";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout({ title, intro, ctaLabel, ctaUrl, footer }: { title: string; intro: string; ctaLabel: string; ctaUrl: string; footer?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#0c1b2c;padding:24px 32px;color:#fff;font-size:20px;font-weight:bold">${escapeHtml(SITE_NAME)}</td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151">${intro}</div>
        <p style="margin:28px 0"><a href="${ctaUrl}" style="background:#0c1b2c;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold;display:inline-block">${ctaLabel}</a></p>
        <p style="font-size:12px;color:#6b7280;line-height:1.5">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${ctaUrl}" style="color:#12263c;word-break:break-all">${ctaUrl}</a></p>
        ${footer ? `<p style="font-size:12px;color:#6b7280">${footer}</p>` : ""}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY ausente. E-mail para ${to} não enviado: "${subject}"`);
    return { skipped: true };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || `${SITE_NAME} <onboarding@resend.dev>`,
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] erro no Resend", error);
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }
  return { skipped: false };
}

/** Colaborador convidado: link para criar a senha. */
export function sendWelcomeEmail(to: string, name: string | null, link: string) {
  return send(
    to,
    `Seu acesso à ${SITE_NAME}`,
    layout({
      title: `Bem-vindo(a)${name ? `, ${escapeHtml(name.split(" ")[0]!)}` : ""}! 🎓`,
      intro: `Você foi convidado(a) para a ${escapeHtml(SITE_NAME)}, nossa plataforma de desenvolvimento.<br><br>Lá você encontra a trilha da sua função, cursos, avaliações, certificados, a agenda de eventos e a comunidade da empresa.<br><br>Clique no botão abaixo para criar sua senha.`,
      ctaLabel: "Criar minha senha",
      ctaUrl: link,
      footer: `O link expira em algumas horas. Se expirar, use "Esqueci minha senha" em ${siteUrl("/login")}.`,
    }),
  );
}

/** Aviso genérico (curso atribuído, novo PDI etc.). */
export function sendNotificationEmail(to: string, subject: string, title: string, bodyHtml: string, path: string, cta = "Abrir") {
  return send(to, subject, layout({ title: escapeHtml(title), intro: bodyHtml, ctaLabel: cta, ctaUrl: siteUrl(path) }));
}

export function sendPasswordResetEmail(to: string, link: string) {
  return send(
    to,
    `Redefinir sua senha — ${SITE_NAME}`,
    layout({
      title: "Redefinição de senha",
      intro: "Recebemos um pedido para redefinir sua senha. Se não foi você, ignore este e-mail.",
      ctaLabel: "Criar nova senha",
      ctaUrl: link,
    }),
  );
}
