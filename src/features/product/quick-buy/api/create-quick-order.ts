'use server';

import { DEFAULT_COUNTRY_CODE, PRICE_APP_URL, SHOPIFY_STORE_DOMAIN, INTERNAL_API_SECRET } from '@shared/config/shop';
import { prisma } from '@shared/lib/prisma';
import { adminClient } from '@shared/lib/shopify/admin-client';
import { auth } from '@features/auth/lib/auth';
import { checkInventoryLevel } from '@entities/product/api/check-inventory-level';
import { headers } from 'next/headers';
import { captureServerEvent, captureServerError } from '@shared/lib/posthog/posthog-server';

type QuickOrderInput = {
  variantId: string;
  productId: string;
  quantity: number;
  name: string;
  phone: string;
  productTitle: string;
  selectedSize?: string;
  discountPercentage?: number;
  price: string;
  currencyCode: string;
  sku?: string;
  imageUrl?: string;
};

type OrderResult = {
  id: string;
  name: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  lineItems: {
    edges: {
      node: {
        id: string;
        title: string;
        quantity: number;
      };
    }[];
  };
};

const ORDER_CREATE_MUTATION = `
  mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      order {
        id
        name
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createQuickOrder(orderData: QuickOrderInput): Promise<{
  success: boolean;
  orderId?: string;
  orderName?: string;
  errors?: string[];
}> {
  try {
    // Validate stock before creating order. Quick-buy must never sell into
    // negative inventory. Untracked variants are treated as "infinite stock".
    const stock = await checkInventoryLevel(orderData.variantId);
    if (!stock) {
      return { success: false, errors: ['Variant not found'] };
    }
    if (stock.tracked && stock.quantity < orderData.quantity) {
      return {
        success: false,
        errors: ['Товар закінчився / Товар закончился'],
      };
    }

    // Get session (optional for quick order)
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    // Split name into firstName and lastName
    const nameParts = orderData.name.trim().split(' ');
    const firstName = nameParts[0] || orderData.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Calculate price with optional discount
    const originalPrice = parseFloat(orderData.price);
    let finalPrice = originalPrice;
    if (orderData.discountPercentage && orderData.discountPercentage > 0) {
      finalPrice = originalPrice * (1 - orderData.discountPercentage / 100);
    }

    const lineItem: any = {
      variantId: orderData.variantId,
      quantity: orderData.quantity,
      priceSet: {
        shopMoney: {
          amount: finalPrice.toFixed(2),
          currencyCode: orderData.currencyCode,
        },
      },
    };

    // Build order input
    const order: any = {
      lineItems: [lineItem],
      currency: orderData.currencyCode,
      financialStatus: 'PENDING',
      note: `Быстрый заказ: ${orderData.productTitle}${orderData.selectedSize ? ` (Розмір: ${orderData.selectedSize})` : ''}`,
      shippingAddress: {
        firstName: firstName,
        lastName: lastName,
        address1: 'Быстрый заказ',
        city: 'Не указан',
        country: DEFAULT_COUNTRY_CODE,
        phone: orderData.phone,
        zip: '',
      },
      customAttributes: [
        {
          key: '_quick_order',
          value: 'true',
        },
        {
          key: '_customer_name',
          value: orderData.name,
        },
        {
          key: '_customer_phone',
          value: orderData.phone,
        },
      ],
    };

    // Create order in Shopify
    const orderResponse = await adminClient.client.request<
      {
        orderCreate: {
          order: OrderResult | null;
          userErrors: Array<{ field: string; message: string }>;
        };
      },
      {
        order: any;
        options: { sendReceipt: boolean; inventoryBehaviour: string };
      }
    >({
      query: ORDER_CREATE_MUTATION,
      variables: {
        order,
        options: {
          sendReceipt: false,
          inventoryBehaviour: 'DECREMENT_OBEYING_POLICY',
        },
      },
    });

    const { order: createdOrder, userErrors } = orderResponse.orderCreate;

    if (userErrors.length > 0) {
      await captureServerError(new Error('Shopify Order Creation Failed'), {
        service: 'product',
        action: 'create_quick_order_shopify_error',
        userId,
        extra: { userErrors, variantId: orderData.variantId },
      });
      return {
        success: false,
        errors: userErrors.map((error) => error.message),
      };
    }

    if (!createdOrder) {
      await captureServerError(new Error('Shopify Order Creation Failed - No Order'), {
        service: 'product',
        action: 'create_quick_order_no_order',
        userId,
        extra: { variantId: orderData.variantId },
      });
      return {
        success: false,
        errors: ['Failed to create quick order'],
      };
    }
    if (userId) {
      await prisma.order.create({
        data: {
          shopifyOrderId: createdOrder.id,
          orderName: createdOrder.name,
          userId: userId,
          draft: false,
        },
      });
    }

    // Trigger KeyCRM + eSputnik immediately (same pattern as regular checkout)
    try {
      const numericOrderId = createdOrder.id.replace('gid://shopify/Order/', '');
      const numericVariantId = Number(orderData.variantId.replace('gid://shopify/ProductVariant/', '') || 0);
      const numericProductId = Number(orderData.productId.replace('gid://shopify/Product/', '') || 0);

      const webhookPayload = {
        id: Number(numericOrderId),
        name: createdOrder.name,
        email: '',
        phone: orderData.phone,
        created_at: new Date().toISOString(),
        currency: orderData.currencyCode,
        financial_status: 'pending',
        note: `Быстрый заказ: ${orderData.productTitle}${orderData.selectedSize ? ` (Розмір: ${orderData.selectedSize})` : ''}`,
        note_attributes: [
          { name: '_quick_order', value: 'true' },
          { name: '_customer_name', value: orderData.name },
          { name: '_customer_phone', value: orderData.phone },
        ],
        payment_gateway_names: ['manual'],
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: '',
          phone: orderData.phone,
        },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address1: 'Быстрый заказ',
          city: 'Не указан',
          country: DEFAULT_COUNTRY_CODE,
          phone: orderData.phone,
          zip: '',
        },
        line_items: [{
          title: orderData.productTitle,
          variant_title: orderData.selectedSize || '',
          quantity: orderData.quantity,
          price: finalPrice.toFixed(2),
          product_id: numericProductId,
          variant_id: numericVariantId,
          sku: orderData.sku || '',
          ...(orderData.imageUrl ? { image: orderData.imageUrl } : {}),
        }],
        shipping_lines: [],
        applied_discount: null,
      };

      const processHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (INTERNAL_API_SECRET) processHeaders['Authorization'] = `Bearer ${INTERNAL_API_SECRET}`;

      fetch(`${PRICE_APP_URL}/api/internal/process-order`, {
        method: 'POST',
        headers: processHeaders,
        body: JSON.stringify({ payload: webhookPayload, shop: SHOPIFY_STORE_DOMAIN }),
      }).catch((err) => {
        console.error('[createQuickOrder] internal process-order call failed:', err);
      });
    } catch (internalErr) {
      console.error('[createQuickOrder] failed to build process-order payload:', internalErr);
    }

    const distinctId = userId ?? 'anonymous';
    await captureServerEvent(distinctId, 'quick_order_placed', {
      order_id: createdOrder.id,
      order_name: createdOrder.name,
      product_title: orderData.productTitle,
      variant_id: orderData.variantId,
      price: orderData.price,
      currency: orderData.currencyCode,
      amount: createdOrder.totalPriceSet.shopMoney.amount,
    });

    return {
      success: true,
      orderId: createdOrder.id,
      orderName: createdOrder.name,
    };
  } catch (error) {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    await captureServerError(error, {
      service: 'product',
      action: 'create_quick_order',
      userId,
      extra: {
        variantId: orderData.variantId,
        productTitle: orderData.productTitle,
      },
    });
    return {
      success: false,
      errors: [
        error instanceof Error ? error.message : 'Failed to create quick order',
      ],
    };
  }
}
