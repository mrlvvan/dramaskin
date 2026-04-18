import { Resend } from "resend";
import { env } from "../config/env.js";
import { serviceUnavailable } from "../utils/httpError.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

function renderAuthCodeTemplate(code) {
  const subject = "Код для входа в DRAMMA";
  const text = [
    "Ваш одноразовый код для входа:",
    code,
    "",
    "Код действует 10 минут.",
    "Если вы не запрашивали вход, просто проигнорируйте это письмо.",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">DRAMMA SK!N</h2>
      <p style="margin: 0 0 8px;">Ваш код для входа:</p>
      <p style="margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
      <p style="margin: 0 0 8px;">Код действует 10 минут.</p>
      <p style="margin: 0; color: #666;">Если это были не вы, просто проигнорируйте письмо.</p>
    </div>
  `;
  return { subject, text, html };
}

export async function sendAuthCodeEmail({ to, code }) {
  const recipient = String(to || "").trim().toLowerCase();
  const oneTimeCode = String(code || "").trim();
  if (!recipient || !oneTimeCode) {
    throw new Error("sendAuthCodeEmail requires recipient and code");
  }

  const { subject, text, html } = renderAuthCodeTemplate(oneTimeCode);

  if (!resend) {
    const preview = [
      "=== DRAMMA AUTH EMAIL (DEV STUB) ===",
      `From: ${env.emailFrom}`,
      `To: ${recipient}`,
      `Subject: ${subject}`,
      "",
      text,
      "====================================",
    ].join("\n");
    console.log(preview);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to: recipient,
      subject,
      text,
      html,
    });

    if (error) {
      console.error("[email] Resend API error:", error);
      throw serviceUnavailable(
        "Не удалось отправить письмо с кодом. Проверьте RESEND_API_KEY и домен в EMAIL_FROM в настройках сервера.",
      );
    }
  } catch (err) {
    if (err?.status === 503) throw err;
    console.error("[email] Resend send threw:", err);
    throw serviceUnavailable(
      "Не удалось отправить письмо с кодом. Проверьте ключ Resend и что домен в «from» верифицирован в панели Resend.",
    );
  }
}
