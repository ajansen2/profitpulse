import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');

    console.log(`Compliance webhook received: ${topic} from ${shop}`);

    switch (topic) {
      case 'customers/data_request':
        // Customer requested their data
        // In a real app, you'd email them their data
        console.log('Customer data request:', body);
        break;

      case 'customers/redact':
        // Customer requested data deletion
        // Delete customer data from orders
        if (body.customer?.email) {
          await supabase
            .from('orders')
            .update({ customer_email: null })
            .eq('customer_email', body.customer.email);
        }
        console.log('Customer data redacted');
        break;

      case 'shop/redact':
        // Shop uninstalled and data should be deleted
        // Delete all store data
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('shop_domain', shop)
          .single();

        if (store) {
          // Cascade delete will handle related tables
          await supabase.from('stores').delete().eq('id', store.id);
        }
        console.log('Shop data redacted');
        break;

      default:
        console.log('Unknown compliance topic:', topic);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Compliance webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
