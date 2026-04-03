/**
 * Webhook helpers for Slack and Discord notifications
 */

export interface DailyDigestPayload {
  storeName: string;
  date: string;
  orderCount: number;
  revenue: number;
  profit: number;
  margin: number;
  prevOrderCount?: number;
  prevProfit?: number;
  topProducts?: { title: string; profit: number }[];
}

/**
 * Send daily digest to Slack webhook
 */
export async function sendSlackDailyDigest(
  webhookUrl: string,
  data: DailyDigestPayload
): Promise<boolean> {
  try {
    const profitEmoji = data.profit >= 0 ? '💰' : '📉';
    const profitColor = data.profit >= 0 ? '#22c55e' : '#ef4444'; // green or red

    // Calculate comparison
    let profitChangeText = '';
    if (data.prevProfit !== undefined && data.prevProfit !== 0) {
      const change = ((data.profit - data.prevProfit) / Math.abs(data.prevProfit)) * 100;
      profitChangeText = change >= 0 ? ` (↑${change.toFixed(0)}% vs yesterday)` : ` (↓${Math.abs(change).toFixed(0)}% vs yesterday)`;
    }

    // Build top products text
    let topProductsText = '';
    if (data.topProducts && data.topProducts.length > 0) {
      topProductsText = data.topProducts
        .slice(0, 3)
        .map((p, i) => `${i + 1}. ${p.title} ($${p.profit.toFixed(0)})`)
        .join('\n');
    }

    const fields = [
      { title: 'Orders', value: `${data.orderCount}`, short: true },
      { title: 'Revenue', value: `$${data.revenue.toFixed(2)}`, short: true },
      { title: 'Net Profit', value: `$${data.profit.toFixed(2)}${profitChangeText}`, short: true },
      { title: 'Margin', value: `${data.margin.toFixed(1)}%`, short: true },
    ];

    if (topProductsText) {
      fields.push({ title: 'Top Products', value: topProductsText, short: false });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color: profitColor,
          title: `${profitEmoji} Daily Digest - ${data.storeName}`,
          text: data.date,
          fields,
          footer: 'ProfitPulse',
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });

    console.log('💬 Slack daily digest sent for', data.storeName);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Slack daily digest:', error);
    return false;
  }
}

/**
 * Send daily digest to Discord webhook
 */
export async function sendDiscordDailyDigest(
  webhookUrl: string,
  data: DailyDigestPayload
): Promise<boolean> {
  try {
    const profitEmoji = data.profit >= 0 ? '💰' : '📉';
    const profitColor = data.profit >= 0 ? 0x22c55e : 0xef4444; // green or red

    // Calculate comparison
    let profitChangeText = '';
    if (data.prevProfit !== undefined && data.prevProfit !== 0) {
      const change = ((data.profit - data.prevProfit) / Math.abs(data.prevProfit)) * 100;
      profitChangeText = change >= 0 ? ` (↑${change.toFixed(0)}%)` : ` (↓${Math.abs(change).toFixed(0)}%)`;
    }

    // Build top products text
    let topProductsText = 'No sales';
    if (data.topProducts && data.topProducts.length > 0) {
      topProductsText = data.topProducts
        .slice(0, 3)
        .map((p, i) => `${i + 1}. ${p.title} ($${p.profit.toFixed(0)})`)
        .join('\n');
    }

    const fields = [
      { name: 'Orders', value: `${data.orderCount}`, inline: true },
      { name: 'Revenue', value: `$${data.revenue.toFixed(2)}`, inline: true },
      { name: 'Net Profit', value: `$${data.profit.toFixed(2)}${profitChangeText}`, inline: true },
      { name: 'Margin', value: `${data.margin.toFixed(1)}%`, inline: true },
      { name: 'Top Products', value: topProductsText, inline: false },
    ];

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${profitEmoji} Daily Digest - ${data.storeName}`,
          description: data.date,
          color: profitColor,
          fields,
          footer: { text: 'ProfitPulse' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    console.log('💬 Discord daily digest sent for', data.storeName);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Discord daily digest:', error);
    return false;
  }
}

export interface WeeklyDigestPayload {
  storeName: string;
  weekRange: string;
  orderCount: number;
  revenue: number;
  profit: number;
  margin: number;
  prevOrderCount?: number;
  prevProfit?: number;
  topProducts?: { title: string; profit: number }[];
  bestDay?: { date: string; profit: number };
}

/**
 * Send weekly digest to Slack webhook
 */
export async function sendSlackWeeklyDigest(
  webhookUrl: string,
  data: WeeklyDigestPayload
): Promise<boolean> {
  try {
    const profitEmoji = data.profit >= 0 ? '📈' : '📉';
    const profitColor = data.profit >= 0 ? '#22c55e' : '#ef4444';

    let profitChangeText = '';
    if (data.prevProfit !== undefined && data.prevProfit !== 0) {
      const change = ((data.profit - data.prevProfit) / Math.abs(data.prevProfit)) * 100;
      profitChangeText = change >= 0 ? ` (↑${change.toFixed(0)}% vs last week)` : ` (↓${Math.abs(change).toFixed(0)}% vs last week)`;
    }

    let topProductsText = '';
    if (data.topProducts && data.topProducts.length > 0) {
      topProductsText = data.topProducts
        .slice(0, 5)
        .map((p, i) => `${i + 1}. ${p.title} ($${p.profit.toFixed(0)})`)
        .join('\n');
    }

    const fields = [
      { title: 'Orders', value: `${data.orderCount}`, short: true },
      { title: 'Revenue', value: `$${data.revenue.toFixed(2)}`, short: true },
      { title: 'Net Profit', value: `$${data.profit.toFixed(2)}${profitChangeText}`, short: true },
      { title: 'Avg Margin', value: `${data.margin.toFixed(1)}%`, short: true },
    ];

    if (data.bestDay) {
      fields.push({ title: 'Best Day', value: `${data.bestDay.date} ($${data.bestDay.profit.toFixed(0)})`, short: true });
    }

    if (topProductsText) {
      fields.push({ title: 'Top Products', value: topProductsText, short: false });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color: profitColor,
          title: `${profitEmoji} Weekly Summary - ${data.storeName}`,
          text: data.weekRange,
          fields,
          footer: 'ProfitPulse',
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });

    console.log('💬 Slack weekly digest sent for', data.storeName);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Slack weekly digest:', error);
    return false;
  }
}

/**
 * Send weekly digest to Discord webhook
 */
export async function sendDiscordWeeklyDigest(
  webhookUrl: string,
  data: WeeklyDigestPayload
): Promise<boolean> {
  try {
    const profitEmoji = data.profit >= 0 ? '📈' : '📉';
    const profitColor = data.profit >= 0 ? 0x22c55e : 0xef4444;

    let profitChangeText = '';
    if (data.prevProfit !== undefined && data.prevProfit !== 0) {
      const change = ((data.profit - data.prevProfit) / Math.abs(data.prevProfit)) * 100;
      profitChangeText = change >= 0 ? ` (↑${change.toFixed(0)}%)` : ` (↓${Math.abs(change).toFixed(0)}%)`;
    }

    let topProductsText = 'No sales';
    if (data.topProducts && data.topProducts.length > 0) {
      topProductsText = data.topProducts
        .slice(0, 5)
        .map((p, i) => `${i + 1}. ${p.title} ($${p.profit.toFixed(0)})`)
        .join('\n');
    }

    const fields = [
      { name: 'Orders', value: `${data.orderCount}`, inline: true },
      { name: 'Revenue', value: `$${data.revenue.toFixed(2)}`, inline: true },
      { name: 'Net Profit', value: `$${data.profit.toFixed(2)}${profitChangeText}`, inline: true },
      { name: 'Avg Margin', value: `${data.margin.toFixed(1)}%`, inline: true },
    ];

    if (data.bestDay) {
      fields.push({ name: 'Best Day', value: `${data.bestDay.date} ($${data.bestDay.profit.toFixed(0)})`, inline: true });
    }

    fields.push({ name: 'Top Products', value: topProductsText, inline: false });

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${profitEmoji} Weekly Summary - ${data.storeName}`,
          description: data.weekRange,
          color: profitColor,
          fields,
          footer: { text: 'ProfitPulse' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    console.log('💬 Discord weekly digest sent for', data.storeName);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Discord weekly digest:', error);
    return false;
  }
}
