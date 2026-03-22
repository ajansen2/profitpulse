import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GDPR: Customer Data Request
 * Called when a customer requests their data from a store using your app
 *
 * ProfitPulse doesn't store customer PII - we only store:
 * - Order totals and profit calculations
 * - Product costs (COGS)
 *
 * We respond with success since there's no customer data to return.
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
    console.log('GDPR Customer Data Request:', {
      shop_domain: data.shop_domain,
      customer_id: data.customer?.id,
    });

    // ProfitPulse doesn't store customer PII
    // We only store order-level financial data (totals, COGS, profit)
    // No customer emails, names, addresses, or other PII

    return NextResponse.json({
      success: true,
      message: 'No customer PII stored by ProfitPulse'
    });
  } catch (error) {
    console.error('GDPR customer data request error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
