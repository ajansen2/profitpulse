import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { store_id, summary, topProducts } = await request.json();

    // Build context for Claude
    const context = `
You are a profit optimization expert analyzing an e-commerce store's performance data.

STORE METRICS (Last 30 days):
- Total Revenue: $${summary.totalRevenue?.toFixed(2) || 0}
- Total Net Profit: $${summary.totalProfit?.toFixed(2) || 0}
- Average Profit Margin: ${summary.avgProfitMargin?.toFixed(1) || 0}%
- Total Orders: ${summary.totalOrders || 0}
- Average Order Value: $${summary.totalOrders > 0 ? (summary.totalRevenue / summary.totalOrders).toFixed(2) : 0}
- Average Profit per Order: $${summary.totalOrders > 0 ? (summary.totalProfit / summary.totalOrders).toFixed(2) : 0}

TOP PRODUCTS BY PROFIT:
${topProducts?.slice(0, 10).map((p: any, i: number) =>
  `${i + 1}. "${p.title}" - $${p.profit?.toFixed(2)} profit, ${p.margin?.toFixed(1)}% margin, ${p.quantity} sold`
).join('\n') || 'No product data'}

Based on this data, provide 3-5 actionable insights. Each insight should:
1. Identify a specific issue, opportunity, or trend
2. Explain why it matters
3. Give a concrete action to take

Focus on:
- Products with concerning margins (below 15%)
- Opportunities to increase profit (high performers to double down on)
- Pricing or cost optimization suggestions
- Bundle/upsell opportunities
- Warning signs to address

Respond in JSON format:
{
  "insights": [
    {
      "type": "warning" | "opportunity" | "tip" | "trend",
      "title": "Short headline",
      "content": "Main explanation (2-3 sentences)",
      "impact": "Potential impact if addressed",
      "action": "Specific action to take"
    }
  ]
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: context
        }
      ],
    });

    // Parse the response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Extract JSON from the response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add IDs to insights
    const insights = parsed.insights.map((insight: any, index: number) => ({
      ...insight,
      id: `ai-${Date.now()}-${index}`
    }));

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('AI insights error:', error);

    // Return fallback insights if AI fails
    return NextResponse.json({
      insights: [],
      error: 'AI analysis temporarily unavailable'
    });
  }
}
