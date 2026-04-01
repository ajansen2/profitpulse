import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';
import { getProfitAlertEmail } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Orders Webhook (orders/create, orders/updated)
 * Processes orders and calculates profit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const shop = request.headers.get('x-shopify-shop-domain');
    const topic = request.headers.get('x-shopify-topic');

    console.log('📦 Order webhook:', topic, 'from', shop);

    // Validate HMAC
    const secret = process.env.SHOPIFY_API_SECRET!;
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    if (generatedHmac !== hmac) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const order = JSON.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    if (!store) {
      console.error('❌ Store not found:', shop);
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get store settings
    const { data: settings } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', store.id)
      .single();

    const processingRate = settings?.payment_processing_rate || 0.029;
    const processingFixed = settings?.payment_processing_fixed || 0.30;
    const shopifyFeeRate = settings?.shopify_fee_rate || 0.02;
    const defaultCogsPercent = settings?.default_cogs_percentage || 30;

    // Calculate fees
    const totalPrice = parseFloat(order.total_price) || 0;
    const paymentFee = (totalPrice * processingRate) + processingFixed;
    const shopifyFee = totalPrice * shopifyFeeRate;

    // Extract attribution
    let utmSource = null, utmMedium = null, utmCampaign = null, platform = 'direct';

    if (order.landing_site) {
      try {
        const url = new URL(order.landing_site, 'https://example.com');
        utmSource = url.searchParams.get('utm_source');
        utmMedium = url.searchParams.get('utm_medium');
        utmCampaign = url.searchParams.get('utm_campaign');

        if (url.searchParams.get('fbclid')) platform = 'facebook';
        else if (url.searchParams.get('gclid')) platform = 'google';
        else if (url.searchParams.get('ttclid')) platform = 'tiktok';
        else if (utmSource) platform = utmSource.toLowerCase();
      } catch (e) {
        // Invalid URL, use defaults
      }
    }

    // Calculate COGS from line items
    let totalCogs = 0;
    const lineItemsToInsert = [];

    for (const item of order.line_items || []) {
      // Get product COGS from database
      const { data: product } = await supabase
        .from('products')
        .select('cost_per_item')
        .eq('store_id', store.id)
        .eq('shopify_variant_id', item.variant_id?.toString())
        .single();

      const costPerItem = product?.cost_per_item || (parseFloat(item.price) * (defaultCogsPercent / 100));
      const itemTotalCost = costPerItem * item.quantity;
      totalCogs += itemTotalCost;

      lineItemsToInsert.push({
        store_id: store.id,
        shopify_line_item_id: item.id.toString(),
        shopify_product_id: item.product_id?.toString(),
        shopify_variant_id: item.variant_id?.toString(),
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        total_price: parseFloat(item.price) * item.quantity,
        cost_per_item: costPerItem,
        total_cost: itemTotalCost,
        profit: (parseFloat(item.price) * item.quantity) - itemTotalCost,
      });
    }

    // Calculate profits
    const revenue = totalPrice;
    const grossProfit = revenue - totalCogs;
    const netProfit = grossProfit - paymentFee - shopifyFee;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Upsert order
    const { data: savedOrder, error: orderError } = await supabase
      .from('orders')
      .upsert({
        store_id: store.id,
        shopify_order_id: order.id.toString(),
        order_number: order.order_number?.toString() || order.name,
        customer_email: order.email,
        subtotal_price: parseFloat(order.subtotal_price) || 0,
        total_price: totalPrice,
        total_tax: parseFloat(order.total_tax) || 0,
        total_shipping: parseFloat(order.total_shipping_price_set?.shop_money?.amount) || 0,
        total_discounts: parseFloat(order.total_discounts) || 0,
        currency: order.currency,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        total_cogs: totalCogs,
        payment_processing_fee: paymentFee,
        shopify_fee: shopifyFee,
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin: profitMargin,
        attributed_platform: platform,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        order_created_at: order.created_at,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'store_id,shopify_order_id',
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Failed to save order:', orderError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Update line items
    await supabase
      .from('order_line_items')
      .delete()
      .eq('order_id', savedOrder.id);

    if (lineItemsToInsert.length > 0) {
      await supabase
        .from('order_line_items')
        .insert(lineItemsToInsert.map(item => ({ ...item, order_id: savedOrder.id })));
    }

    console.log('✅ Order processed:', order.name, 'Net profit:', netProfit.toFixed(2));

    // Send profit alert if order is unprofitable and alerts are enabled
    const alertThreshold = settings?.email_alert_threshold || 0;
    if (settings?.email_profit_alerts && netProfit < alertThreshold) {
      try {
        // Get store email
        const { data: storeData } = await supabase
          .from('stores')
          .select('email, store_name')
          .eq('id', store.id)
          .single();

        const email = settings.notification_email || storeData?.email;

        if (email) {
          // Determine reason for alert
          let reason = '';
          if (netProfit < 0) {
            const highestCostItem = lineItemsToInsert.reduce((max, item) =>
              (item.total_cost > (max?.total_cost || 0)) ? item : max, lineItemsToInsert[0]);
            reason = `This order resulted in a ${Math.abs(netProfit).toFixed(2)} loss. `;
            if (totalCogs > grossProfit + paymentFee + shopifyFee) {
              reason += `The cost of goods (${totalCogs.toFixed(2)}) exceeds the revenue minus fees.`;
            } else {
              reason += `The combination of COGS, payment fees, and Shopify fees exceeded the order value.`;
            }
          } else {
            reason = `This order has a profit margin of only ${profitMargin.toFixed(1)}%, which is below your alert threshold of ${alertThreshold > 0 ? '$' + alertThreshold : '0% (any unprofitable order)'}.`;
          }

          const mainProduct = lineItemsToInsert[0]?.title || 'Unknown product';

          const { subject, html } = getProfitAlertEmail({
            storeName: storeData?.store_name || shop || 'Your Store',
            orderNumber: order.order_number?.toString() || order.name,
            orderTotal: totalPrice,
            profit: netProfit,
            profitMargin,
            productName: mainProduct,
            reason,
          });

          await resend.emails.send({
            from: 'ProfitPulse <noreply@send.argora.ai>',
            to: email,
            subject,
            html,
          });

          console.log('📧 Profit alert sent for order', order.name);
        }
      } catch (alertError) {
        console.error('❌ Failed to send profit alert:', alertError);
        // Don't fail the webhook - alert is non-critical
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
