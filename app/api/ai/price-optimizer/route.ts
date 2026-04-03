import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * AI Price Optimizer
 * Analyzes product performance and suggests optimal pricing
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');
  const productId = request.nextUrl.searchParams.get('product_id'); // Optional: specific product

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get last 60 days of data for analysis
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);

  // Get products with sales data
  const { data: lineItems } = await supabase
    .from('order_line_items')
    .select(`
      shopify_product_id,
      title,
      price,
      quantity,
      profit,
      total_price,
      orders!inner(order_created_at, store_id)
    `)
    .eq('orders.store_id', storeId)
    .gte('orders.order_created_at', startDate.toISOString());

  // Aggregate by product
  const productStats: {
    [key: string]: {
      title: string;
      currentPrice: number;
      totalSold: number;
      totalRevenue: number;
      totalProfit: number;
      avgMargin: number;
      salesVelocity: number; // units per day
    };
  } = {};

  const daysInPeriod = 60;

  for (const item of lineItems || []) {
    const key = item.shopify_product_id || item.title;
    if (!productStats[key]) {
      productStats[key] = {
        title: item.title,
        currentPrice: item.price,
        totalSold: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgMargin: 0,
        salesVelocity: 0,
      };
    }
    productStats[key].totalSold += item.quantity || 0;
    productStats[key].totalRevenue += item.total_price || 0;
    productStats[key].totalProfit += item.profit || 0;
    productStats[key].currentPrice = item.price; // Use latest price
  }

  // Calculate metrics
  const products = Object.entries(productStats)
    .map(([id, stats]) => ({
      id,
      ...stats,
      avgMargin: stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0,
      salesVelocity: stats.totalSold / daysInPeriod,
    }))
    .filter(p => p.totalSold > 0) // Only products with sales
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  if (products.length === 0) {
    return NextResponse.json({
      suggestions: [],
      message: 'Not enough sales data to make pricing recommendations. Need at least some product sales.',
    });
  }

  // Select products for analysis (top sellers + low margin products)
  const topSellers = products.slice(0, 5);
  const lowMarginProducts = products
    .filter(p => p.avgMargin < 30 && p.avgMargin > 0)
    .slice(0, 3);

  const productsToAnalyze = [...new Map([...topSellers, ...lowMarginProducts].map(p => [p.id, p])).values()];

  // Use AI to generate pricing suggestions
  const prompt = `You are a pricing optimization expert for ecommerce. Analyze these products and suggest price changes.

Products to analyze:
${productsToAnalyze.map(p => `
- ${p.title}
  Current Price: $${p.currentPrice.toFixed(2)}
  Units Sold (60d): ${p.totalSold}
  Revenue: $${p.totalRevenue.toFixed(2)}
  Profit: $${p.totalProfit.toFixed(2)}
  Margin: ${p.avgMargin.toFixed(1)}%
  Sales Velocity: ${p.salesVelocity.toFixed(2)} units/day
`).join('\n')}

For each product, provide:
1. Suggested new price (be specific)
2. Reasoning (1-2 sentences)
3. Expected impact on profit (estimate)
4. Confidence level (high/medium/low)

Consider:
- High velocity + low margin = room to raise price
- Low velocity + high margin = maybe lower price to increase volume
- Very high margin = competitor pressure, might need to lower
- Industry standard margins are 30-50%

Respond in JSON format:
{
  "suggestions": [
    {
      "productId": "id",
      "productTitle": "name",
      "currentPrice": 0.00,
      "suggestedPrice": 0.00,
      "priceChange": "+10%",
      "reasoning": "explanation",
      "expectedProfitImpact": "+$X/month",
      "confidence": "high|medium|low"
    }
  ],
  "overallInsight": "1-2 sentence summary of pricing strategy"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      suggestions: aiResponse.suggestions || [],
      overallInsight: aiResponse.overallInsight || '',
      analyzedProducts: productsToAnalyze.length,
      totalProducts: products.length,
    });

  } catch (error) {
    console.error('AI Price Optimizer error:', error);

    // Fallback: Simple rule-based suggestions
    const fallbackSuggestions = productsToAnalyze
      .filter(p => p.avgMargin < 25 || p.avgMargin > 60)
      .map(p => {
        const isLowMargin = p.avgMargin < 25;
        const suggestedChange = isLowMargin ? 0.10 : -0.05; // +10% or -5%
        const suggestedPrice = p.currentPrice * (1 + suggestedChange);

        return {
          productId: p.id,
          productTitle: p.title,
          currentPrice: p.currentPrice,
          suggestedPrice: Math.round(suggestedPrice * 100) / 100,
          priceChange: isLowMargin ? '+10%' : '-5%',
          reasoning: isLowMargin
            ? `Low margin (${p.avgMargin.toFixed(0)}%) with steady sales suggests room to increase price.`
            : `High margin (${p.avgMargin.toFixed(0)}%) - consider small reduction to boost volume.`,
          expectedProfitImpact: isLowMargin ? '+$' + Math.round(p.totalProfit * 0.1) + '/mo' : 'Volume increase potential',
          confidence: 'medium' as const,
        };
      });

    return NextResponse.json({
      suggestions: fallbackSuggestions,
      overallInsight: 'Based on margin analysis. AI suggestions temporarily unavailable.',
      analyzedProducts: productsToAnalyze.length,
      totalProducts: products.length,
    });
  }
}
