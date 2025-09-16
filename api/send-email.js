const nodemailer = require('nodemailer');

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = async (req, res) => {
  // CORS (на случай, если откроете с другого домена)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Имя, email и сообщение обязательны для заполнения',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Некорректный формат email' });
    }

    if (String(message).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Сообщение должно содержать минимум 10 символов' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const recipient = process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"Сайт здорового питания" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: 'Новое сообщение с формы обратной связи',
      text: `Сообщение от ${name} (${email}):\n\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #262626; border-bottom: 2px solid #cbea7b; padding-bottom: 10px;">
            Новое сообщение с формы обратной связи
          </h2>
          <div style="background: #f9fcf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Имя:</strong> ${name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0 0 10px 0;"><strong>Дата:</strong> ${new Date().toLocaleString('ru-RU')}</p>
          </div>
          <div style="background: #fff; padding: 20px; border: 1px solid #eef8d3; border-radius: 8px;">
            <h3 style="color: #262626; margin-top: 0;">Сообщение:</h3>
            <p style="line-height: 1.6; color: #333;">${String(message).replace(/\n/g, '<br>')}</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #eef8d3; border-radius: 8px; font-size: 14px; color: #666;">
            <p style="margin: 0;">Это сообщение отправлено с сайта через форму обратной связи.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Сообщение успешно отправлено' });
  } catch (error) {
    console.error('send-email function error:', error);
    return res.status(500).json({ success: false, message: 'Произошла ошибка при отправке сообщения' });
  }
};