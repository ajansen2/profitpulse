/**
 * Email Templates for ProfitPulse
 */

export interface DailyDigestData {
  storeName: string;
  date: string;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  profitMargin: number;
  topProducts: { title: string; profit: number }[];
  comparisonRevenue: number;
  comparisonProfit: number;
}

export interface WeeklySummaryData {
  storeName: string;
  weekStart: string;
  weekEnd: string;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  avgOrderValue: number;
  profitMargin: number;
  revenueChange: number;
  profitChange: number;
  topProducts: { title: string; profit: number; quantity: number }[];
  dailyBreakdown: { date: string; revenue: number; profit: number }[];
}

export interface ProfitAlertData {
  storeName: string;
  orderNumber: string;
  orderTotal: number;
  profit: number;
  profitMargin: number;
  productName: string;
  reason: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export function getDailyDigestEmail(data: DailyDigestData) {
  const subject = `${data.storeName}: ${formatCurrency(data.totalProfit)} profit yesterday`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #10b981; margin: 0; font-size: 28px;">ProfitPulse</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0;">Daily Profit Digest</p>
    </div>

    <!-- Main Card -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
      <h2 style="color: #f1f5f9; margin: 0 0 8px 0; font-size: 20px;">${data.storeName}</h2>
      <p style="color: #64748b; margin: 0 0 24px 0;">${data.date}</p>

      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="color: #10b981; margin: 0; font-size: 28px; font-weight: bold;">${formatCurrency(data.totalProfit)}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Net Profit</p>
        </div>
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: bold;">${formatCurrency(data.totalRevenue)}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Revenue</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #f1f5f9; margin: 0; font-size: 24px; font-weight: bold;">${data.totalOrders}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Orders</p>
        </div>
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #f1f5f9; margin: 0; font-size: 24px; font-weight: bold;">${data.profitMargin.toFixed(1)}%</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Margin</p>
        </div>
      </div>
    </div>

    <!-- Top Products -->
    ${data.topProducts.length > 0 ? `
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #f1f5f9; margin: 0 0 16px 0; font-size: 16px;">Top Profit Makers</h3>
      ${data.topProducts.slice(0, 5).map((product, i) => `
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
          <span style="color: #94a3b8;">${i + 1}. ${product.title.substring(0, 30)}${product.title.length > 30 ? '...' : ''}</span>
          <span style="color: #10b981; font-weight: bold;">${formatCurrency(product.profit)}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align: center;">
      <a href="https://profitpulse-woad.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">View Full Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">You're receiving this because you enabled Daily Profit Digest.</p>
      <p style="color: #64748b; margin: 8px 0 0 0; font-size: 12px;">Manage notifications in your ProfitPulse settings.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

export function getWeeklySummaryEmail(data: WeeklySummaryData) {
  const subject = `${data.storeName}: Weekly Summary - ${formatCurrency(data.totalProfit)} profit`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #10b981; margin: 0; font-size: 28px;">ProfitPulse</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0;">Weekly Summary</p>
    </div>

    <!-- Main Card -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
      <h2 style="color: #f1f5f9; margin: 0 0 8px 0; font-size: 20px;">${data.storeName}</h2>
      <p style="color: #64748b; margin: 0 0 24px 0;">${data.weekStart} - ${data.weekEnd}</p>

      <!-- Main Stats -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px;">
          <p style="color: #10b981; margin: 0; font-size: 28px; font-weight: bold;">${formatCurrency(data.totalProfit)}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Net Profit <span style="color: ${data.profitChange >= 0 ? '#10b981' : '#ef4444'}">${formatPercent(data.profitChange)}</span></p>
        </div>
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 20px;">
          <p style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: bold;">${formatCurrency(data.totalRevenue)}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Revenue <span style="color: ${data.revenueChange >= 0 ? '#10b981' : '#ef4444'}">${formatPercent(data.revenueChange)}</span></p>
        </div>
      </div>

      <!-- Secondary Stats -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #f1f5f9; margin: 0; font-size: 20px; font-weight: bold;">${data.totalOrders}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Orders</p>
        </div>
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #f1f5f9; margin: 0; font-size: 20px; font-weight: bold;">${formatCurrency(data.avgOrderValue)}</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Avg Order</p>
        </div>
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #f1f5f9; margin: 0; font-size: 20px; font-weight: bold;">${data.profitMargin.toFixed(1)}%</p>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Margin</p>
        </div>
      </div>
    </div>

    <!-- Top Products -->
    ${data.topProducts.length > 0 ? `
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #f1f5f9; margin: 0 0 16px 0; font-size: 16px;">Top Products This Week</h3>
      ${data.topProducts.slice(0, 5).map((product, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #334155;">
          <div>
            <span style="color: #f1f5f9;">${i + 1}. ${product.title.substring(0, 25)}${product.title.length > 25 ? '...' : ''}</span>
            <span style="color: #64748b; font-size: 12px; margin-left: 8px;">(${product.quantity} sold)</span>
          </div>
          <span style="color: #10b981; font-weight: bold;">${formatCurrency(product.profit)}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align: center;">
      <a href="https://profitpulse-woad.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">View Full Report</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">You're receiving this because you enabled Weekly Summary.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

export function getProfitAlertEmail(data: ProfitAlertData) {
  const isNegative = data.profit < 0;
  const subject = isNegative
    ? `Alert: Unprofitable Order #${data.orderNumber} (-${formatCurrency(Math.abs(data.profit))})`
    : `Low Margin Alert: Order #${data.orderNumber} (${data.profitMargin.toFixed(1)}%)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #10b981; margin: 0; font-size: 28px;">ProfitPulse</h1>
      <p style="color: #ef4444; margin: 8px 0 0 0; font-weight: 600;">Profit Alert</p>
    </div>

    <!-- Alert Card -->
    <div style="background: linear-gradient(135deg, #450a0a 0%, #1e293b 100%); border: 1px solid #dc2626; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="color: #fca5a5; margin: 0; font-size: 14px;">Order #${data.orderNumber}</p>
        <p style="color: ${isNegative ? '#ef4444' : '#fbbf24'}; margin: 8px 0 0 0; font-size: 36px; font-weight: bold;">${isNegative ? '-' : ''}${formatCurrency(Math.abs(data.profit))}</p>
        <p style="color: #94a3b8; margin: 4px 0 0 0;">${isNegative ? 'Loss' : 'Profit'} on ${formatCurrency(data.orderTotal)} order</p>
      </div>

      <div style="background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 20px;">
        <p style="color: #f1f5f9; margin: 0 0 12px 0; font-weight: 600;">What happened:</p>
        <p style="color: #94a3b8; margin: 0;">${data.reason}</p>
      </div>
    </div>

    <!-- Product Info -->
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #f1f5f9; margin: 0 0 16px 0; font-size: 16px;">Order Details</h3>
      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
        <span style="color: #94a3b8;">Product</span>
        <span style="color: #f1f5f9;">${data.productName}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155;">
        <span style="color: #94a3b8;">Order Total</span>
        <span style="color: #f1f5f9;">${formatCurrency(data.orderTotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 12px 0;">
        <span style="color: #94a3b8;">Profit Margin</span>
        <span style="color: ${data.profitMargin < 0 ? '#ef4444' : data.profitMargin < 10 ? '#fbbf24' : '#10b981'};">${data.profitMargin.toFixed(1)}%</span>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center;">
      <a href="https://profitpulse-woad.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Review in Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">You're receiving this because you enabled Profit Alerts.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}
