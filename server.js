// server.js - Express server with Nodemailer email endpoint

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Middlewares
app.use(cors());
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (serve the website)
// app.use(express.static(__dirname)); // Moved below after API routes to avoid 405 on POST

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

// Helper: validate incoming payload
function validatePayload({ name, email, message }) {
  const errors = [];
  if (!name || String(name).trim().length < 2) errors.push('Имя должно быть не короче 2 символов');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(String(email))) errors.push('Укажите корректный email');
  if (!message || String(message).trim().length < 5) errors.push('Сообщение должно быть не короче 5 символов');
  return errors;
}

// Determine mail mode
// smtp -> send via Gmail SMTP using env GMAIL_USER/GMAIL_PASS
// file -> save raw .eml files locally (no internet/credentials required)
const hasSmtpCreds = Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASS);
const MAIL_MODE = (process.env.MAIL_MODE || (hasSmtpCreds ? 'smtp' : 'file')).toLowerCase();
const DEV_MAIL_DIR = process.env.DEV_MAIL_DIR || path.join(__dirname, 'dev-mails');

// Create transporter based on mode
function createTransport() {
  if (MAIL_MODE === 'smtp') {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
  }
  // Fallback to file mode for local testing
  return nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  });
}

// Ensure dev-mails directory if in file mode
async function ensureDevDirIfNeeded() {
  if (MAIL_MODE !== 'file') return;
  try {
    await fsp.mkdir(DEV_MAIL_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    const errors = validatePayload({ name, email, message });
    if (errors.length) {
      return res.status(400).json({ ok: false, errors });
    }

    const transporter = createTransport();

    const toEmail = process.env.CONTACT_TO || 'Lapkaann@gmail.com';
    const fromEmail = process.env.GMAIL_USER || 'no-reply@localhost';

    const html = `
      <h2>Новое сообщение с формы обратной связи</h2>
      <p><strong>Имя:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Сообщение:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
      <hr/>
      <small>Отправлено с сайта Healthy Eating</small>
    `;

    const mailOptions = {
      from: `Healthy Eating Website <${fromEmail}>`,
      to: toEmail,
      subject: `Сообщение с сайта от ${name}`,
      text: `Имя: ${name}\nEmail: ${email}\n\nСообщение:\n${message}`,
      html,
    };

    await ensureDevDirIfNeeded();

    // Пытаемся отправить письмо. Если включён SMTP и сеть недоступна, делаем fallback в файл
    try {
      const info = await transporter.sendMail(mailOptions);
  
      if (MAIL_MODE === 'file') {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `mail-${stamp}.eml`;
        const filePath = path.join(DEV_MAIL_DIR, fileName);
        const raw = info.message || info.messageId || '';
        const data = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw));
        await fsp.writeFile(filePath, data);
        return res.json({ ok: true, mode: 'file', savedTo: path.relative(__dirname, filePath) });
      }
  
      return res.json({ ok: true, mode: 'smtp', messageId: info.messageId });
    } catch (err) {
      console.error('Mail send error:', err?.message || err);
  
      // Если включён SMTP и ошибка похожа на сетевую — записываем письмо локально как fallback
      const netErrCodes = new Set(['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'EHOSTUNREACH', 'ENOTFOUND']);
      if (MAIL_MODE === 'smtp' && (netErrCodes.has(err?.code) || /timeout|connect|socket|tls/i.test(String(err?.message || '')))) {
        try {
          await fsp.mkdir(DEV_MAIL_DIR, { recursive: true });
          const fallbackTransport = nodemailer.createTransport({
            streamTransport: true,
            buffer: true,
            newline: 'unix',
          });
          const info2 = await fallbackTransport.sendMail(mailOptions);
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `mail-${stamp}.eml`;
          const filePath = path.join(DEV_MAIL_DIR, fileName);
          const raw = info2.message || info2.messageId || '';
          const data = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw));
          await fsp.writeFile(filePath, data);
          return res.json({ ok: true, mode: 'file', fallbackFrom: 'smtp', savedTo: path.relative(__dirname, filePath) });
        } catch (fallbackErr) {
          console.error('Fallback file save error:', fallbackErr?.message || fallbackErr);
        }
      }
  
      return res.status(500).json({ ok: false, error: 'Не удалось отправить сообщение. Попробуйте ещё раз позже.' });
    }
  } catch (err) {
      console.error('Contact endpoint error:', err?.message || err);
      return res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера. Попробуйте позже.' });
  }
});

// Basic HTML escaping
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start server with auto port fallback
function startServer(port, attempt = 0) {
  const MAX_ATTEMPTS = 30; // больше попыток, чем раньше
  const server = app.listen(port, () => {
    const actualPort = server.address().port;
    console.log(`Server is running on http://localhost:${actualPort}`);
    console.log(`Mail mode: ${MAIL_MODE}${MAIL_MODE === 'smtp' ? ' (Gmail SMTP)' : ' (local .eml files)'}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      // Если заняты много портов подряд — пробуем 0 (любой свободный порт)
      const nextPort = attempt < (MAX_ATTEMPTS - 1) ? (port + 1) : 0;
      const hint = nextPort === 0 ? 'random free port' : String(nextPort);
      console.warn(`Port ${port} is in use, retrying on ${hint}...`);
      setTimeout(() => startServer(nextPort, attempt + 1), 200);
      return;
    }
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

startServer(PORT);

// Place static after API routes so that POST /api/contact is not intercepted
app.use(express.static(__dirname));