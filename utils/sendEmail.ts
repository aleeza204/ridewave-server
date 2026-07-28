import nodemailer from "nodemailer";

export const sendEmail = async (email: string, otp: string) => {
  try {
    // Cast to `any`: the installed @types/nodemailer version's createTransport
    // overloads don't structurally accept a plain SMTP options object here,
    // even though this is nodemailer's standard, documented runtime API.
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // Railway's network can't route outbound IPv6, but Gmail's SMTP host
      // resolves to both A and AAAA records - force IPv4 so it doesn't try
      // (and hang/fail on) the unreachable IPv6 address.
      family: 4,
    } as any);

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