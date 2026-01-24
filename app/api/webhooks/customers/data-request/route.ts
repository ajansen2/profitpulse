import { NextRequest, NextResponse } from 'next/server';

/**
 * GDPR Customer Data Request Webhook
 * Shopify sends this when a customer requests their data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📋 Customer data request received:', {
      shop_domain: body.shop_domain,
      customer_email: body.customer?.email,
    });

    // In production: Queue a job to compile customer data
    // You have 30 days to respond with the data

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Data request webhook error:', error);
    return NextResponse.json({ success: true }); // Always return 200
  }
}
