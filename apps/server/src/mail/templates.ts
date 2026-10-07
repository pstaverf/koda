import { CODE_TTL_SECONDS } from "@koda/shared/constants";

export type MailContent = {
  subject: string;
  html: string;
  text: string;
};

const fontFamily = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',Inter,sans-serif";
const codeTtlMinutes = Math.round(CODE_TTL_SECONDS / 60);

const layout = (heading: string, content: string, footer: string): string => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>Koda</title>
<style>
@media (max-width:480px){.koda-card{padding:24px 20px !important;}.koda-code{font-size:28px !important;letter-spacing:6px !important;}}
</style>
</head>
<body style="margin:0;padding:0;background:#070707;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070707;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding:0 0 20px;">
<span style="font-family:${fontFamily};font-size:20px;font-weight:600;letter-spacing:0.5px;color:#ffffff;">Koda</span>
</td></tr>
<tr><td class="koda-card" style="background:#101010;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
<h1 style="margin:0 0 16px;font-family:${fontFamily};font-size:22px;font-weight:600;line-height:30px;color:#ffffff;">${heading}</h1>
${content}
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${fontFamily};font-size:13px;line-height:20px;color:rgba(255,255,255,0.45);">${footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const paragraph = (text: string): string =>
  `<p style="margin:0 0 20px;font-family:${fontFamily};font-size:15px;line-height:24px;color:rgba(255,255,255,0.72);">${text}</p>`;

const codeBlock = (code: string): string =>
  `<div class="koda-code" style="margin:0 0 20px;padding:16px 20px;background:#070707;border:1px solid rgba(255,255,255,0.10);border-radius:16px;font-family:${fontFamily};font-size:34px;font-weight:600;letter-spacing:10px;text-align:center;color:#ffffff;">${code}</div>`;

const codeFooter = (): string =>
  `Код действует ${codeTtlMinutes} минут. Если вы не запрашивали письмо, просто проигнорируйте его — ничего не произойдёт.`;

const codeMail = (subject: string, heading: string, lead: string, code: string): MailContent => ({
  subject,
  html: layout(heading, `${paragraph(lead)}${codeBlock(code)}`, codeFooter()),
  text: `${heading}\n\n${lead}\n\nКод: ${code}\n\nКод действует ${codeTtlMinutes} минут. Если вы не запрашивали письмо, просто проигнорируйте его.`
});

export const registrationCodeMail = (code: string): MailContent =>
  codeMail("Код подтверждения · Koda", "Подтвердите почту", "Введите этот код, чтобы завершить регистрацию в Koda.", code);

export const passwordResetCodeMail = (code: string): MailContent =>
  codeMail("Сброс пароля · Koda", "Сброс пароля", "Введите этот код, чтобы задать новый пароль Koda.", code);

export const emailChangeCodeMail = (code: string): MailContent =>
  codeMail("Новая почта · Koda", "Подтвердите новую почту", "Введите этот код, чтобы привязать новую почту к аккаунту Koda.", code);

export const occupiedEmailMail = (): MailContent => ({
  subject: "Попытка регистрации · Koda",
  html: layout(
    "Кто-то пытался зарегистрироваться",
    paragraph("Кто-то пытался создать аккаунт Koda с этой почтой, но аккаунт уже существует.") +
      paragraph("Если это были вы, войдите в приложение или восстановите пароль. Если нет — письмо можно проигнорировать."),
    "Это автоматическое письмо, отвечать на него не нужно."
  ),
  text: "Кто-то пытался зарегистрироваться\n\nКто-то пытался создать аккаунт Koda с этой почтой, но аккаунт уже существует.\n\nЕсли это были вы, войдите в приложение или восстановите пароль. Если нет — письмо можно проигнорировать."
});
