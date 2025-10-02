// src/utils/sendMail.js

// import nodemailer from 'nodemailer';

// console.log('sendMail.js loaded - SMTP_HOST:', process.env.SMTP_HOST);

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });

// // Перевірка з'єднання при ініціалізації
// transporter.verify(function (error, success) {
//   if (error) {
//     console.log('Brevo SMTP connection error:', error);
//   } else {
//     console.log('Brevo SMTP server is ready to take our messages');
//   }
// });

// export const sendMail = async (options) => {
//   return await transporter.sendMail(options);
// };

import nodemailer from 'nodemailer';

console.log('sendMail.js loaded - SMTP_HOST:', process.env.SMTP_HOST);

let transporter = null;

const createTransporter = () => {
  console.log('Creating transporter with:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST is not defined in environment variables');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendMail = async (options) => {
  try {
    if (!transporter) {
      transporter = createTransporter();

      // Перевірка з'єднання
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    }

    console.log('Sending email to:', options.to);

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      ...options,
    });

    console.log('✅ Email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });

    // Скидаємо транспортер при помилці з'єднання
    if (error.code === 'ECONNREFUSED') {
      transporter = null;
      console.error('Connection refused. Please check:');
      console.error('1. SMTP_HOST:', process.env.SMTP_HOST);
      console.error('2. SMTP_PORT:', process.env.SMTP_PORT);
      console.error('3. Firewall settings');
      console.error('4. Brevo SMTP status');
    }

    throw error;
  }
};