import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // app password or OAuth2 token
  },
});

export const sendContactEmail = async (req, res, next) => {
  try {
    const { to, subject, text, fromName, fromEmail } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const mailOptions = {
      from: `${fromName || 'Website User'} <${fromEmail || process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Email sent', info });
  } catch (error) {
    next(error);
  }
};

export default { sendContactEmail };
