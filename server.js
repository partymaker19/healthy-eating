const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware to log all incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Настройка транспорта для отправки email
const transporter = nodemailer.createTransport({
    service: 'gmail', // Можно изменить на другой сервис
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Ваш email
        pass: process.env.EMAIL_PASS || 'your-app-password'      // Пароль приложения
    }
});

// Email получателя (куда будут приходить сообщения)
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'recipient@example.com';

// Функция валидации email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Обработка preflight запросов для /send-email
app.options('/send-email', (req, res) => {
    res.sendStatus(204);
});
app.options('/api/send-email', (req, res) => {
    res.sendStatus(204);
});

// Роут для отправки email
app.post('/send-email', async (req, res) => {
    console.log('Получен POST запрос на /send-email');
    console.log('Данные запроса:', req.body);
    
    try {
        const { name, email, message } = req.body;
        
        // Валидация данных
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Имя, email и сообщение обязательны для заполнения'
            });
        }
        
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Некорректный формат email'
            });
        }
        
        if (message.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Сообщение должно содержать минимум 10 символов'
            });
        }
        
        // Настройки письма
        const mailOptions = {
            from: `"Сайт здорового питания" <${process.env.EMAIL_USER}>`,
            to: RECIPIENT_EMAIL,
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
                        <p style="line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background: #eef8d3; border-radius: 8px; font-size: 14px; color: #666;">
                        <p style="margin: 0;">Это сообщение отправлено с сайта через форму обратной связи.</p>
                    </div>
                </div>
            `
        };
        
        // Отправка email
        await transporter.sendMail(mailOptions);
        
        console.log(`Сообщение отправлено от ${email}`);
        
        res.json({
            success: true,
            message: 'Сообщение успешно отправлено'
        });
        
    } catch (error) {
        console.error('Ошибка отправки email:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при отправке сообщения'
        });
    }
});

// Дополнительный роут для совместимости с фронтендом (/api/send-email)
app.post('/api/send-email', async (req, res) => {
  console.log('Получен POST запрос на /api/send-email');
  // Переиспользуем ту же логику, что и для /send-email
  req.url = '/send-email';
  return app._router.handle(req, res, () => {});
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте http://localhost:${PORT} в браузере`);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});