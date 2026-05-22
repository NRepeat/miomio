'use client';

import React from 'react';
import { DISCOUNT_METAFIELD_KEY, DEFAULT_CURRENCY_CODE } from '@shared/config/shop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@shared/ui/dialog';
import { Button } from '@shared/ui/button';
import { Product as ShopifyProduct } from '@shared/lib/shopify/types/storefront.types';
import { useState, useEffect, useTransition, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@shared/lib/utils';
import { CrossedLine } from '@shared/ui/crossed-line';
import { compareSizes } from '@shared/lib/sort-sizes';
import { VariantInventory } from '@entities/product/api/getInventoryLevels';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createQuickOrder } from '../api/create-quick-order';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
export const isValidPhone = (phone: string) => {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone);
    return phoneNumber?.isValid() || false;
  } catch {
    return false;
  }
};

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, {
      message: t('nameValidation'),
    }),
    phone: z.string().refine(isValidPhone, {
      message: t('phoneValidation'),
    }),
  });

interface QuickBuyModalProps {
  product: ShopifyProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeOptions: string[] | undefined;
  inventoryLevels: VariantInventory[];
}

export const QuickBuyModal = ({
  product,
  open,
  onOpenChange,
  sizeOptions,
  inventoryLevels,
}: QuickBuyModalProps) => {
  const t = useTranslations('ProductPage');
  const formSchema = createFormSchema(t);

  const hasSizes = sizeOptions && sizeOptions.length > 0;

  const [step, setStep] = useState(hasSizes ? 1 : 2);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<z.infer<ReturnType<typeof createFormSchema>>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      phone: '+380',
    },
  });

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setStep(hasSizes ? 1 : 2);
      setSelectedSize(null);
      setIsSuccess(false);
      form.reset({ name: '', phone: '+380' });
    }
  }, [open, hasSizes, form]);

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size.toLowerCase());
  };

  const handleNextStep = () => {
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const onSubmit = async (
    values: z.infer<ReturnType<typeof createFormSchema>>,
  ) => {
    // Find the selected variant
    let variantId: string;

    if (hasSizes && selectedSize) {
      const variant = product.variants.edges.find((edge) =>
        edge.node.selectedOptions.some(
          (option) =>
            ['розмір', 'размер', 'size'].includes(option.name.toLowerCase()) &&
            option.value.toLowerCase() === selectedSize.toLowerCase(),
        ),
      )?.node;

      if (!variant) {
        toast.error(t('sizeNotFound'));
        return;
      }
      variantId = variant.id;
    } else {
      // No sizes — use first variant, but verify it's actually buyable.
      const variant = product.variants.edges[0]?.node;
      if (!variant) {
        toast.error(t('productUnavailable'));
        return;
      }
      const qty = variant.quantityAvailable ?? -1;
      if (!variant.availableForSale || qty === 0) {
        toast.error(t('productUnavailable'));
        return;
      }
      variantId = variant.id;
    }

    // Get discount percentage
    const discountPercentage =
      Number(
        product.metafields.find((m) => m?.key === DISCOUNT_METAFIELD_KEY)?.value || '0',
      ) || 0;

    // Get the variant to extract price
    const selectedVariant =
      hasSizes && selectedSize
        ? product.variants.edges.find((edge) =>
            edge.node.selectedOptions.some(
              (option) =>
                ['розмір', 'размер', 'size'].includes(
                  option.name.toLowerCase(),
                ) && option.value.toLowerCase() === selectedSize.toLowerCase(),
            ),
          )?.node
        : product.variants.edges[0]?.node;

    const variantPrice = selectedVariant?.price?.amount || '0';
    const variantCurrency = selectedVariant?.price?.currencyCode || DEFAULT_CURRENCY_CODE;

    const sku = selectedVariant?.sku || undefined;
    const productImage = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url || undefined;

    startTransition(async () => {
      const result = await createQuickOrder({
        variantId,
        productId: product.id,
        quantity: 1,
        name: values.name,
        phone: values.phone,
        productTitle: product.title,
        selectedSize: selectedSize ?? undefined,
        discountPercentage:
          discountPercentage > 0 ? discountPercentage : undefined,
        price: variantPrice,
        currencyCode: variantCurrency,
        sku,
        imageUrl: productImage,
      });

      if (result.success) {
        setIsSuccess(true);
        toast.success(t('orderSuccess', { orderName: result.orderName || '' }));
        closeTimerRef.current = setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        toast.error(result.errors?.[0] || t('orderError'));
      }
    });
  };

  const sortedSizeOptions = sizeOptions?.slice().sort(compareSizes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product.title}</DialogTitle>
          <DialogDescription>{t('quickOrderDescription')}</DialogDescription>
        </DialogHeader>

        {isSuccess && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-center text-lg font-medium">
              {t('orderSuccessTitle')}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {t('orderSuccessMessage')}
            </p>
          </div>
        )}

        {!isSuccess && step === 1 && hasSizes && (
          <div className="py-4">
            <h3 className="mb-4 font-semibold">{t('selectSize')}</h3>
            <div className="flex flex-wrap gap-2">
              {sortedSizeOptions?.map((s) => {
                const variant = product.variants.edges.find((edge) =>
                  edge.node.selectedOptions.some(
                    (option) =>
                      ['розмір', 'размер', 'size'].includes(
                        option.name.toLowerCase(),
                      ) && option.value.toLowerCase() === s.toLowerCase(),
                  ),
                )?.node;
                const availableForSale = variant?.availableForSale ?? false;
                const qty = variant?.quantityAvailable ?? -1;
                const isZeroQty = qty === 0;
                const variantAtFitting =
                  variant?.currentlyNotInStock === false && isZeroQty;
                const isUnavailable = !availableForSale && !isZeroQty;
                const inventoryLevel = variant
                  ? inventoryLevels.find((inv) => inv.variantId === variant.id)
                  : undefined;
                const committed = inventoryLevel?.committed ?? 0;
                const hasCommitted = committed > 0;
                const showCrossed =
                  isUnavailable ||
                  (isZeroQty && !variantAtFitting && !hasCommitted);
                const showMuted = (isUnavailable || isZeroQty) && !hasCommitted;
                // Quick-buy must never accept an order for stock the user
                // can't actually receive right now. ANY of these blocks the
                // size: storefront flag is false, qty is exactly zero
                // (regardless of fitting-room status), or every unit is
                // already in a committed reserve.
                // qty === -1 means quantityAvailable was not provided
                // (untracked variant) — allow optimistically, server
                // validates via checkInventoryLevel.
                const isNotBuyable =
                  !availableForSale || qty === 0 || hasCommitted;
                const btn = (
                  <Button
                    variant={
                      selectedSize === s.toLowerCase() ? 'default' : 'outline'
                    }
                    className={cn(
                      'rounded min-w-[50px] relative border-primary border',
                      {
                        'bg-primary text-white ring-2 ring-offset-1 ring-primary':
                          selectedSize === s.toLowerCase(),
                        'opacity-40':
                          showMuted && selectedSize !== s.toLowerCase(),
                      },
                    )}
                    onClick={() => handleSizeSelect(s)}
                    disabled={isNotBuyable}
                  >
                    {s}
                    {showCrossed && <CrossedLine />}
                    {hasCommitted && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white leading-none">
                        !
                      </span>
                    )}
                  </Button>
                );
                if (!hasCommitted)
                  return <React.Fragment key={s}>{btn}</React.Fragment>;
                return (
                  <Popover key={s}>
                    <PopoverTrigger asChild>{btn}</PopoverTrigger>
                    <PopoverContent className="w-56 text-sm p-3" side="top">
                      <p className="font-medium">Розмір в резерві</p>
                      <p className="text-muted-foreground mt-1">
                        Придбання товару можливо після зняття резерву 5-7 днів.
                      </p>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        )}

        {!isSuccess && step === 2 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('namePlaceholder')}
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phoneLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={t('phonePlaceholder')}
                        autoComplete="tel"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {!isSuccess && (
          <DialogFooter className="mt-4">
            {step === 1 && (
              <Button
                onClick={handleNextStep}
                disabled={!selectedSize || isPending}
                className="w-full sm:w-auto"
              >
                {t('next')}
              </Button>
            )}
            {step === 2 && (
              <div className="flex w-full gap-2">
                {hasSizes && (
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {t('back')}
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={!form.formState.isValid || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('submitting')}
                    </>
                  ) : (
                    t('submitOrder')
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
