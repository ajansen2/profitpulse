import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Simple linear regression for trend analysis
 */
function linearRegression(data: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const point of data) {
    const predicted = slope * point.x + intercept;
    ssRes += (point.y - predicted) ** 2;
    ssTot += (point.y - meanY) ** 2;
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
}

/**
 * AI Profit Forecasting API
 * Predicts next 7-30 days profit using trend analysis + Claude AI narrative
 */
export async function POST(request: NextRequest) {
  try {
    const { store_id, days = 7 } = await request.json();

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get last 30 days of orders for analysis
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_created_at, total_price, net_profit')
      .eq('store_id', store_id)
      .gte('order_created_at', startDate.toISOString())
      .order('order_created_at', { ascending: true });

    if (error) {
      console.error('Forecast DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Aggregate by day
    const dailyData: Record<string, { revenue: number; profit: number; orders: number }> = {};

    for (const order of orders || []) {
      const date = order.order_created_at?.split('T')[0];
      if (date) {
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, profit: 0, orders: 0 };
        }
        dailyData[date].revenue += order.total_price || 0;
        dailyData[date].profit += order.net_profit || 0;
        dailyData[date].orders += 1;
      }
    }

    const sortedDates = Object.keys(dailyData).sort();
    const historical = sortedDates.map(date => ({
      date,
      ...dailyData[date],
    }));

    // Need at least 7 days of data for meaningful forecast
    if (historical.length < 7) {
      return NextResponse.json({
        error: 'Insufficient data',
        message: 'Need at least 7 days of order history for forecasting',
        historical,
      }, { status: 400 });
    }

    // Linear regression on profit data
    const profitData = historical.map((d, i) => ({ x: i, y: d.profit }));
    const regression = linearRegression(profitData);

    // Determine trend direction
    const avgProfit = historical.reduce((sum, d) => sum + d.profit, 0) / historical.length;
    const dailyTrend = regression.slope;
    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(dailyTrend) < avgProfit * 0.02) {
      trend = 'stable';
    } else {
      trend = dailyTrend > 0 ? 'up' : 'down';
    }

    // Generate predictions for next N days
    const predictions: { date: string; predictedProfit: number; confidence: { low: number; high: number } }[] = [];
    const today = new Date();

    // Calculate standard deviation for confidence intervals
    let sumSquaredError = 0;
    for (let i = 0; i < historical.length; i++) {
      const predicted = regression.slope * i + regression.intercept;
      sumSquaredError += (historical[i].profit - predicted) ** 2;
    }
    const stdDev = Math.sqrt(sumSquaredError / historical.length);

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];

      const x = historical.length - 1 + i;
      const predictedProfit = regression.slope * x + regression.intercept;

      // Confidence interval (95% = ~2 standard deviations)
      const confidenceMargin = stdDev * 2;
      predictions.push({
        date: dateStr,
        predictedProfit: Math.round(predictedProfit * 100) / 100,
        confidence: {
          low: Math.round((predictedProfit - confidenceMargin) * 100) / 100,
          high: Math.round((predictedProfit + confidenceMargin) * 100) / 100,
        },
      });
    }

    // Calculate 7-day forecast total
    const sevenDayForecast = predictions.slice(0, 7).reduce((sum, p) => sum + p.predictedProfit, 0);

    // Calculate confidence percentage (based on R-squared)
    const confidence = Math.round(regression.rSquared * 100);

    // Generate AI narrative using Claude Haiku
    let narrative = '';
    try {
      const lastWeekProfit = historical.slice(-7).reduce((sum, d) => sum + d.profit, 0);
      const avgDailyProfit = historical.reduce((sum, d) => sum + d.profit, 0) / historical.length;
      const avgDailyOrders = historical.reduce((sum, d) => sum + d.orders, 0) / historical.length;

      const context = `You are a profit analyst for an e-commerce store. Provide a brief 2-3 sentence insight about their profit forecast.

DATA:
- Last 7 days profit: $${lastWeekProfit.toFixed(2)}
- Average daily profit: $${avgDailyProfit.toFixed(2)}
- Average daily orders: ${avgDailyOrders.toFixed(1)}
- Trend: ${trend === 'up' ? 'Upward' : trend === 'down' ? 'Downward' : 'Stable'}
- Daily trend change: $${dailyTrend.toFixed(2)}/day
- Next 7 days predicted profit: $${sevenDayForecast.toFixed(2)}
- Forecast confidence: ${confidence}%

Write a short, encouraging insight. Be specific about the numbers. If profit is trending down, suggest checking COGS or running a promotion. If up, congratulate them. Keep it under 50 words.`;

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{ role: 'user', content: context }],
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        narrative = textContent.text.trim();
      }
    } catch (aiError) {
      console.error('AI narrative error:', aiError);
      // Fallback narrative
      if (trend === 'up') {
        narrative = `Great news! Your profit is trending upward at $${dailyTrend.toFixed(2)}/day. Keep up the momentum!`;
      } else if (trend === 'down') {
        narrative = `Your profit is declining at $${Math.abs(dailyTrend).toFixed(2)}/day. Consider reviewing your COGS or running a promotion.`;
      } else {
        narrative = `Your profit is stable. The 7-day forecast shows $${sevenDayForecast.toFixed(2)} in expected profit.`;
      }
    }

    return NextResponse.json({
      historical,
      predictions,
      trend,
      dailyTrend: Math.round(dailyTrend * 100) / 100,
      sevenDayForecast: Math.round(sevenDayForecast * 100) / 100,
      confidence,
      narrative,
      regression: {
        slope: Math.round(regression.slope * 100) / 100,
        intercept: Math.round(regression.intercept * 100) / 100,
        rSquared: Math.round(regression.rSquared * 1000) / 1000,
      },
    });
  } catch (error) {
    console.error('Forecast error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
