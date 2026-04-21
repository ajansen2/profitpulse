import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreAccess } from '@/lib/verify-session';

/**
 * Hidden Fee Scanner
 * Analyzes orders to find fees eating into profit
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  if (!await verifyStoreAccess(request, storeId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get store settings
    const { data: settings } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', storeId)
      .single();

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    const fees: Array<{
      type: string;
      description: string;
      amount: number;
      potential_savings: number;
      recommendation: string;
    }> = [];

    if (!orders || orders.length === 0) {
      return NextResponse.json({ fees: [], message: 'No orders to analyze' });
    }

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalPaymentFees = orders.reduce((sum, o) => sum + (o.payment_fee || 0), 0);
    const totalShopifyFees = orders.reduce((sum, o) => sum + (o.shopify_fee || 0), 0);
    const orderCount = orders.length;

    // 1. Check payment processing rate
    const currentRate = settings?.payment_processing_rate || 0.029;
    const shopifyPaymentsRate = 0.029; // 2.9% for Shopify Payments

    if (currentRate > shopifyPaymentsRate) {
      const extraFeePerOrder = totalRevenue * (currentRate - shopifyPaymentsRate) / orderCount;
      const monthlyExtra = extraFeePerOrder * orderCount;

      if (monthlyExtra > 10) {
        fees.push({
          type: 'payment_processor',
          description: `Payment processing rate (${(currentRate * 100).toFixed(1)}%) higher than Shopify Payments`,
          amount: monthlyExtra,
          potential_savings: monthlyExtra,
          recommendation: 'Switch to Shopify Payments to get the standard 2.9% + $0.30 rate',
        });
      }
    }

    // 2. Check Shopify plan optimization
    const shopifyPlan = settings?.shopify_plan || 'basic';
    const shopifyFeeRate = settings?.shopify_fee_rate || 0.02;

    // If on Basic (2%) and doing significant volume, suggest upgrade
    if (shopifyPlan === 'basic' && totalRevenue > 10000) {
      const currentFees = totalRevenue * 0.02;
      const upgradedFees = totalRevenue * 0.01; // Shopify plan = 1%
      const savings = currentFees - upgradedFees;
      const planCostDiff = 105 - 39; // Monthly plan cost difference

      if (savings > planCostDiff) {
        fees.push({
          type: 'plan_upgrade',
          description: 'Transaction fee savings available with Shopify plan upgrade',
          amount: currentFees,
          potential_savings: savings - planCostDiff,
          recommendation: `Upgrade to Shopify plan ($105/mo) to reduce transaction fees from 2% to 1%. Net savings: $${(savings - planCostDiff).toFixed(2)}/month`,
        });
      }
    }

    // 3. Check for high-fee orders (potential chargebacks or disputes)
    const highFeeOrders = orders.filter(o => {
      const expectedFee = (o.total_price || 0) * currentRate + 0.30;
      const actualFee = o.payment_fee || 0;
      return actualFee > expectedFee * 1.5; // 50% higher than expected
    });

    if (highFeeOrders.length > 0) {
      const extraFees = highFeeOrders.reduce((sum, o) => {
        const expected = (o.total_price || 0) * currentRate + 0.30;
        return sum + ((o.payment_fee || 0) - expected);
      }, 0);

      if (extraFees > 0) {
        fees.push({
          type: 'chargebacks',
          description: `${highFeeOrders.length} order(s) with higher-than-expected fees (possible chargebacks)`,
          amount: extraFees,
          potential_savings: extraFees,
          recommendation: 'Review flagged orders for chargebacks or disputes. Consider fraud prevention tools.',
        });
      }
    }

    // 4. Check for orders with no COGS set
    const noCOGSOrders = orders.filter(o => !o.total_cogs || o.total_cogs === 0);
    if (noCOGSOrders.length > orderCount * 0.2) { // More than 20% missing COGS
      fees.push({
        type: 'missing_data',
        description: `${noCOGSOrders.length} orders (${Math.round(noCOGSOrders.length / orderCount * 100)}%) missing COGS data`,
        amount: 0,
        potential_savings: 0,
        recommendation: 'Set product costs in the Products tab for accurate profit tracking',
      });
    }

    // 5. Check shipping cost efficiency
    const avgShippingCost = orders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0) / orderCount;
    const avgOrderValue = totalRevenue / orderCount;

    if (avgShippingCost > avgOrderValue * 0.15) { // Shipping > 15% of order value
      fees.push({
        type: 'shipping_efficiency',
        description: `Average shipping cost ($${avgShippingCost.toFixed(2)}) is ${(avgShippingCost / avgOrderValue * 100).toFixed(0)}% of order value`,
        amount: avgShippingCost * orderCount,
        potential_savings: avgShippingCost * orderCount * 0.2, // Assume 20% savings possible
        recommendation: 'Review shipping carriers and consider negotiating rates or using Shopify Shipping discounts',
      });
    }

    // 6. Check for refunds eating into profit
    const refundedOrders = orders.filter(o => o.refund_amount && o.refund_amount > 0);
    if (refundedOrders.length > 0) {
      const totalRefunds = refundedOrders.reduce((sum, o) => sum + (o.refund_amount || 0), 0);
      const refundRate = refundedOrders.length / orderCount * 100;

      if (refundRate > 5) { // More than 5% refund rate
        fees.push({
          type: 'refunds',
          description: `${refundedOrders.length} refunds (${refundRate.toFixed(1)}% rate) totaling $${totalRefunds.toFixed(2)}`,
          amount: totalRefunds,
          potential_savings: totalRefunds * 0.5, // Assume 50% could be prevented
          recommendation: 'High refund rate detected. Review product descriptions, photos, and quality control.',
        });
      }
    }

    return NextResponse.json({
      fees,
      summary: {
        orders_analyzed: orderCount,
        total_revenue: totalRevenue,
        total_payment_fees: totalPaymentFees,
        total_shopify_fees: totalShopifyFees,
        potential_total_savings: fees.reduce((sum, f) => sum + f.potential_savings, 0),
      },
    });

  } catch (error) {
    console.error('Error scanning for hidden fees:', error);
    return NextResponse.json({ error: 'Failed to scan for fees' }, { status: 500 });
  }
}
