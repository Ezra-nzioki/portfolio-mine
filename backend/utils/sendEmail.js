const brevoEndpoint = 'https://api.brevo.com/v3/smtp/email';

function getEmailProvider() {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() || 'brevo';
}

export function isEmailDeliveryConfigured() {
  return getEmailProvider() === 'brevo'
    && Boolean(process.env.BREVO_API_KEY?.trim())
    && Boolean(process.env.EMAIL_FROM?.trim());
}

export async function sendEmail({ to, subject, text, html }) {
  const provider = getEmailProvider();
  if (!isEmailDeliveryConfigured()) {
    const error = new Error('Brevo email delivery is not configured.');
    error.responseCode = 503;
    error.provider = provider;
    throw error;
  }

  let response;
  try {
    response = await fetch(brevoEndpoint, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY.trim(),
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Ezra Devs', email: process.env.EMAIL_FROM.trim() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (cause) {
    const error = new Error('Could not connect to the Brevo API.', { cause });
    error.provider = provider;
    error.code = cause.code || cause.cause?.code;
    throw error;
  }

  const responseText = await response.text();
  let responseBody;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const brevoError = responseBody?.message || responseBody;
    console.error('Brevo email API request failed:', brevoError || `HTTP ${response.status}`);
    const error = new Error(
      typeof brevoError === 'string' ? brevoError : 'Brevo rejected the email request.',
    );
    error.provider = provider;
    error.responseCode = response.status;
    error.code = responseBody?.code || 'BREVO_API_ERROR';
    throw error;
  }

  return responseBody;
}
