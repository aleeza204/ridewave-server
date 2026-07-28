import nodemailer from "nodemailer";

export const sendEmail = async (email: string, otp: string) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "RideWave OTP",
      text: `Your OTP is ${otp}`,
    });

    console.log("📧 Email sent successfully");
  } catch (error) {
    console.log("❌ Email error:", error);
    throw error;
  }
};