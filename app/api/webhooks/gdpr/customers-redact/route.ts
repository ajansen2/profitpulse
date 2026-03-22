import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GDPR: Customer Redact
 * Called when a customer requests their data be deleted from a store using your app
 *
 * ProfitPulse doesn't store customer PII - we only store:
 * - Order totals and profit calculations
 * - Product costs (COGS)
 *
 * We respond with success since there's no customer data to delete.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(body, 'utf8')
      .digest('base64');

    if (hmac !== hash) {
      console.error('GDPR webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    console.log('GDPR Customer Redact:', {
      shop_domain: data.shop_domain,
      customer_id: data.customer?.id,
    });

    // ProfitPulse doesn't store customer PII
    // Order records don't contain customer identifying information
    // Only financial aggregates (totals, COGS, profit margins)

    return NextResponse.json({
      success: true,
      message: 'No customer PII to redact'
    });
  } catch (error) {
    console.error('GDPR customer redact error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
