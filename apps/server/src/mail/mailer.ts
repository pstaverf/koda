import nodemailer from "nodemailer";
import { env } from "../env.js";

const transport = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: { user: env.smtp.user, pass: env.smtp.password }
});

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export const sendMail = async (message: MailMessage): Promise<void> => {
  await transport.sendMail({
    from: env.smtp.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text
  });
};

export const sendMailQuietly = (message: MailMessage): void => {
  void sendMail(message).catch(() => undefined);
};
