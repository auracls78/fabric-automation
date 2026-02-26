const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@fabric-automation.local";
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";

function isMailerConfigured() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);
}

let transporter = null;
if (isMailerConfigured()) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendVerificationCode(email, code) {
  if (!transporter) {
    throw new Error("Mailer is not configured");
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Your Fabric Automation verification code",
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is: <b>${code}</b></p><p>It expires in 10 minutes.</p>`,
  });
}

module.exports = {
  isMailerConfigured,
  sendVerificationCode,
};
