import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured');
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Send an SMS message
 */
export async function sendSMS(to: string, body: string): Promise<boolean> {
  const client = getClient();
  if (!client || !fromNumber) {
    console.warn('Twilio not configured, skipping SMS');
    return false;
  }

  try {
    // Ensure phone number has country code
    const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

    await client.messages.create({
      body,
      from: fromNumber,
      to: formattedTo,
    });

    console.log('📱 SMS sent to', formattedTo);
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return false;
  }
}

/**
 * Format a profit alert SMS
 */
export function formatProfitAlertSMS(data: {
  storeName: string;
  orderNumber: string;
  orderTotal: number;
  profit: number;
  profitMargin: number;
  productName: string;
}): string {
  const profitStr = data.profit >= 0 ? `$${data.profit.toFixed(2)}` : `-$${Math.abs(data.profit).toFixed(2)}`;
  const emoji = data.profit < 0 ? '🚨' : '⚠️';

  return `${emoji} ProfitPulse Alert

Order #${data.orderNumber}
Total: $${data.orderTotal.toFixed(2)}
Profit: ${profitStr} (${data.profitMargin.toFixed(1)}%)
Product: ${data.productName}

${data.profit < 0 ? 'This order lost money!' : 'Low margin alert.'}`;
}

/**
 * Format a daily digest SMS
 */
export function formatDailyDigestSMS(data: {
  storeName: string;
  date: string;
  orderCount: number;
  revenue: number;
  profit: number;
  margin: number;
}): string {
  if (data.orderCount === 0) {
    return `📊 ${data.storeName}
${data.date}

No orders yesterday.
Check back tomorrow!`;
  }

  const profitEmoji = data.profit >= 0 ? '💰' : '📉';
  const profitStr = data.profit >= 0 ? `$${data.profit.toFixed(2)}` : `-$${Math.abs(data.profit).toFixed(2)}`;

  return `📊 ${data.storeName}
${data.date}

Orders: ${data.orderCount}
Revenue: $${data.revenue.toFixed(2)}
${profitEmoji} Profit: ${profitStr}
Margin: ${data.margin.toFixed(1)}%`;
}

/**
 * Check if SMS is properly configured
 */
export function isSMSConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}
