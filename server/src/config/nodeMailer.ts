interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

const sendEmail = async ({ to, subject, body }: EmailOptions) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        name: "ShowTime",
        email: process.env.SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject,
      htmlContent: body,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email send failed: ${JSON.stringify(error)}`);
  }

  return response.json();
};

export default sendEmail;