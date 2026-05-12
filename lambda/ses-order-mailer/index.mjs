import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({ region: process.env.AWS_REGION || "ap-south-1" });

function renderTemplate(template, data = {}) {
  if (template === "order-confirmation") {
    return `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
        <h2 style="color:#4f46e5">Order Confirmed 🎉</h2>
        <p>Thanks for shopping with Glowzy.</p>
        <p><strong>Order ID:</strong> #${data.shortOrderId || ""}</p>
        <p><strong>Total:</strong> ₹${data.totalPrice || 0}</p>
        <p><strong>Payment Method:</strong> ${(data.paymentMethod || "").toUpperCase()}</p>
        ${data.invoiceHtml || ""}
      </div>
    `;
  }

  if (template === "password-reset") {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2>Reset your password</h2>
        <p>Click below to reset your password:</p>
        <a href="${data.resetUrl}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a>
      </div>
    `;
  }

  if (template === "order-status") {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2>Order update</h2>
        <p>Your order <strong>#${data.shortOrderId || ""}</strong> is now <strong>${data.status || ""}</strong>.</p>
        ${data.trackingNumber ? `<p>Tracking: <strong>${data.trackingNumber}</strong></p>` : ""}
      </div>
    `;
  }

  return "";
}

function unauthorized() {
  return {
    statusCode: 401,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ success: false, message: "Unauthorized" }),
  };
}

export const handler = async (event) => {
  try {
    const configuredApiKey = process.env.SES_LAMBDA_API_KEY || "";
    const providedApiKey =
      event?.headers?.["x-api-key"] || event?.headers?.["X-Api-Key"] || "";

    if (configuredApiKey && configuredApiKey !== providedApiKey) {
      return unauthorized();
    }

    const rawBody = typeof event.body === "string" ? event.body : JSON.stringify(event.body || {});
    const payload = JSON.parse(rawBody || "{}");
    const { to, subject, html, template, data, from } = payload;

    if (!to || !subject) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ success: false, message: "`to` and `subject` are required" }),
      };
    }

    const bodyHtml = html || renderTemplate(template, data);
    if (!bodyHtml) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ success: false, message: "Email HTML is empty" }),
      };
    }

    const command = new SendEmailCommand({
      FromEmailAddress: from || process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: bodyHtml, Charset: "UTF-8" } },
        },
      },
    });

    const response = await ses.send(command);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        success: true,
        messageId: response.MessageId,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: error?.message || "Unexpected Lambda error",
      }),
    };
  }
};
