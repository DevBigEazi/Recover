export async function sendNotificationEmail(toAddress: string, subject: string, htmlContent: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || "no-reply@recover.id";

  if (!apiKey) {
    console.error("=========================================");
    console.error("❌ RESEND_API_KEY is not set in environment variables!");
    console.error("Email notification could not be sent in real-time.");
    console.error("To address:", toAddress);
    console.error("Subject:", subject);
    console.error("=========================================");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API returned error status ${response.status}:`, errorText);
      return false;
    }

    const data = await response.json();
    console.log(`Email successfully dispatched via Resend. ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error("Failed to dispatch email via Resend:", error);
    return false;
  }
}
