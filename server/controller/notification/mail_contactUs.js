import nodemailer from "nodemailer";
import { asyncHandler } from "../../utils/asyncHandler.js";
import fs from "fs";
import path from "path";


export const sendContactUsEmail = asyncHandler(async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Enter a valid email address." });
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // If email credentials are not configured, persist the message locally and return success
  if (!emailUser || !emailPass) {
    try {
      const outDir = path.resolve(process.cwd(), "uploads", "contact_messages");
      await fs.promises.mkdir(outDir, { recursive: true });
      const filename = path.join(outDir, `${Date.now()}.json`);
      const payload = { name, email, subject, message, receivedAt: new Date().toISOString() };
      await fs.promises.writeFile(filename, JSON.stringify(payload, null, 2), "utf8");
      console.warn("EMAIL_USER/EMAIL_PASS not configured. Contact message saved to:", filename);
      return res.status(200).json({ success: true, message: "Message received (email not configured)." });
    } catch (err) {
      console.error("Failed to persist contact message:", err);
      return res.status(500).json({ success: false, message: "Failed to save message locally." });
    }
  }

  // Configure nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  // Define email content
  const mailOptions = {
    from: emailUser,
    to: "support@infantcarecompass.live",
    subject: `Contact Us Query: ${subject}`,
    text: `You have received a new message from the Contact Us form:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    replyTo: email,
  };

    try {
      const info = await transporter.sendMail(mailOptions);
      // If using a real SMTP, sendMail returns info; return success
      return res.status(200).json({ success: true, message: "Message sent successfully!", info });
    } catch (err) {
      console.error("Error sending contact email with configured SMTP:", err);

      // Try to use Ethereal (test account) as a developer fallback so you can preview the message
      try {
        console.warn("Attempting Nodemailer Ethereal fallback (development)");
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        const info = await testTransporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info);

        // Persist the message as well (optional) so it's available on disk
        try {
          const outDir = path.resolve(process.cwd(), "uploads", "contact_messages");
          await fs.promises.mkdir(outDir, { recursive: true });
          const filename = path.join(outDir, `${Date.now()}-ethereal.json`);
          const payload = { name, email, subject, message, ethereal: true, previewUrl, receivedAt: new Date().toISOString() };
          await fs.promises.writeFile(filename, JSON.stringify(payload, null, 2), "utf8");
        } catch (persistErr) {
          console.error("Failed to persist ethereal contact message:", persistErr);
        }

        return res.status(200).json({ success: true, message: "Message sent via Ethereal (dev).", previewUrl });
      } catch (ethErr) {
        console.error("Ethereal fallback also failed:", ethErr);

        // Persist message locally as last-resort fallback
        try {
          const outDir = path.resolve(process.cwd(), "uploads", "contact_messages");
          await fs.promises.mkdir(outDir, { recursive: true });
          const filename = path.join(outDir, `${Date.now()}-failed.json`);
          const payload = { name, email, subject, message, error: String(err), receivedAt: new Date().toISOString() };
          await fs.promises.writeFile(filename, JSON.stringify(payload, null, 2), "utf8");
          console.warn("Contact message saved to:", filename);
        } catch (persistErr) {
          console.error("Failed to persist failed contact message:", persistErr);
        }

        return res.status(500).json({ success: false, message: "Failed to send email. Message saved on server." });
      }
    }
});

export default sendContactUsEmail;
