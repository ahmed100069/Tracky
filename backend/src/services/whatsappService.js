export const sendWhatsappReport = async ({ tenant, report }) => {
  const phone = tenant?.reporting?.whatsappNumber;
  const provider = tenant?.reporting?.provider || "webhook";

  if (!tenant?.reporting?.whatsappEnabled || !phone) {
    return {
      ok: false,
      skipped: true,
      reason: "WhatsApp reporting is not configured"
    };
  }

  if (provider === "twilio") {
    const accountSid = tenant?.reporting?.twilioAccountSid;
    const authToken = tenant?.reporting?.twilioAuthToken;
    const fromNumber = tenant?.reporting?.twilioFromNumber;
    if (!accountSid || !authToken || !fromNumber) {
      return {
        ok: false,
        skipped: true,
        reason: "Twilio WhatsApp settings are incomplete"
      };
    }

    const body = new URLSearchParams({
      To: `whatsapp:${phone}`,
      From: `whatsapp:${fromNumber}`,
      Body: report.text
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Twilio WhatsApp send failed: ${response.status} ${text}`);
    }
  } else {
    const webhookUrl = tenant?.reporting?.whatsappWebhookUrl;
    if (!webhookUrl) {
      return {
        ok: false,
        skipped: true,
        reason: "Webhook WhatsApp settings are incomplete"
      };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone,
        message: report.text,
        meta: {
          date: report.date,
          revenue: report.revenue,
          ordersCount: report.ordersCount
        }
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`WhatsApp webhook failed: ${response.status} ${text}`);
    }
  }

  return {
    ok: true
  };
};
