// Sends via Resend's HTTP API instead of raw SMTP. Railway's network has no
// outbound IPv6 route, and nodemailer/Gmail SMTP kept resolving to an
// unreachable IPv6 address (ENETUNREACH) regardless of port/TLS mode or
// IPv4-forcing options. An HTTPS API call sidesteps that entirely.
export const sendEmail = async (email: string, otp: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RideWave <onboarding@resend.dev>",
      to: [email],
      subject: "RideWave OTP",
      text: `Your OTP is ${otp}`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.log("❌ Email error:", response.status, errorBody);
    throw new Error(`Failed to send email: ${response.status} ${errorBody}`);
  }

  console.log("📧 Email sent successfully");
};
