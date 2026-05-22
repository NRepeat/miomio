'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_CURRENCY_CODE } from '@shared/config/shop';
import { useForm, SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from '@shared/i18n/navigation';
import { PaymentInfo, getPaymentSchema } from '../schema/paymentSchema';
import { savePaymentInfo } from '../api/savePaymentInfo';
import { Button } from '@shared/ui/button';
import { Form } from '@shared/ui/form';
import PaymentMethodSelection from './PaymentMethodSelection';
import PaymentProviderSelection from './PaymentProviderSelection';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentMethods, paymentProviders } from '../lib/constants';
import { CheckoutData } from '@features/checkout/schema/checkoutDataSchema';
import resetCartSession from '@features/cart/api/resetCartSession';
import { useBonusStore } from '@shared/store/use-bonus-store';
import { createOrder } from '@features/order/api/create';
import { PayPartsModal } from '@features/product/ui/PayPartsModal';
import { Coins } from 'lucide-react';
import { Checkbox } from '@shared/ui/checkbox';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import clsx from 'clsx';

interface PaymentFormProps {
  defaultValues?: PaymentInfo | null;
  amount: number;
  currency?: string;
  locale: string;
  liqpayPublicKey?: string;
  liqpayPrivateKey?: string;
  completeCheckoutData: Omit<CheckoutData, 'paymentInfo'> | null;
  bonusBalance?: number;
  eligibleAmount?: number;
  showBonusCard?: boolean;
}

export default function IPaymentForm({
  defaultValues,
  amount,
  currency = DEFAULT_CURRENCY_CODE,
  locale,
  completeCheckoutData,
  bonusBalance = 0,
  eligibleAmount = 0,
  showBonusCard = true,
}: PaymentFormProps) {
  const router = useRouter();
  const t = useTranslations('PaymentForm');
  const bonusSpend = useBonusStore((state) => state.bonusSpend);
  const setBonusSpend = useBonusStore((state) => state.setBonusSpend);
  const [isBonusApplied, setIsBonusApplied] = useState(false);

  // Reset bonus spend when unmounting
  useEffect(() => {
    return () => setBonusSpend(0);
  }, [setBonusSpend]);

  const bonusLimitFromBalance = Math.floor(bonusBalance * 0.5);
  const maxBonusAllowed = Math.floor(
    Math.min(bonusLimitFromBalance, eligibleAmount),
  );

  const finalAmount = isBonusApplied
    ? Math.max(0, amount - bonusSpend)
    : amount;

  const paymentSchema = getPaymentSchema(t);
  const form = useForm<PaymentInfo>({
    //@ts-ignore
    resolver: zodResolver(paymentSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldFocusError: false,
    shouldUnregister: false,
    defaultValues: {
      paymentMethod: defaultValues?.paymentMethod || 'pay-now',

      amount: finalAmount,
      currency: currency || defaultValues?.currency,
      description: defaultValues?.description || 'Order payment',
    },
  });

  // Update form amount when bonusSpend or isBonusApplied changes
  useEffect(() => {
    form.setValue('amount', finalAmount);
  }, [finalAmount, form]);

  const selectedPaymentMethodValue = form.watch('paymentMethod');
  const selectedPaymentProviderValue = form.watch('paymentProvider');
  const [isLoading, setIsLoading] = useState(false);
  const [partsCount, setPartsCount] = useState(3);
  const [liqpayParams, setLiqpayParams] = useState<{
    data: string;
    signature: string;
  } | null>(null);
  const liqpaySubmitRef = useRef<HTMLButtonElement>(null);

  // Try to auto-click the LiqPay submit button once it's rendered.
  // On non-Safari browsers this succeeds; on Safari the user sees the button
  // and can click it manually as a fallback.
  useEffect(() => {
    if (liqpayParams && liqpaySubmitRef.current) {
      console.log('[PaymentForm] LiqPay: auto-clicking submit button');
      liqpaySubmitRef.current.click();
    }
  }, [liqpayParams]);

  const onSubmit: SubmitHandler<PaymentInfo> = async (data) => {
    setIsLoading(true);
    const appliedBonus = isBonusApplied ? bonusSpend : 0;
    try {
      // 4a. LiqPay: use a regular API fetch instead of server actions.
      // Server actions trigger RSC refresh which races against the form POST to
      // liqpay.ua → Next.js "Falling back to browser navigation" overrides it.
      if (
        data.paymentMethod === 'pay-now' &&
        data.paymentProvider === 'liqpay'
      ) {
        console.log('[PaymentForm] LiqPay: calling API route');
        const res = await fetch('/api/checkout/liqpay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            amount: finalAmount,
            currency,
            bonusSpend: appliedBonus,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('[PaymentForm] LiqPay API error:', err);
          toast.error(err.error || t('errorSavingPaymentInformation'));
          setIsLoading(false);
          return;
        }
        const params = await res.json();
        console.log('[PaymentForm] LiqPay: rendering form');
        setLiqpayParams(params);
        return;
      }

      // 4a-1b. PayParts (PrivatBank installments): create order + payment, redirect to PrivatBank
      if (
        data.paymentMethod === 'pay-now' &&
        data.paymentProvider === 'liqpay-payparts'
      ) {
        console.log('[PaymentForm] PayParts: calling API route');
        const res = await fetch('/api/checkout/payparts-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            amount: finalAmount,
            currency,
            partsCount,
            bonusSpend: appliedBonus,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('[PaymentForm] PayParts API error:', err);
          toast.error(err.error || t('errorSavingPaymentInformation'));
          setIsLoading(false);
          return;
        }
        const { paymentUrl } = await res.json();
        console.log('[PaymentForm] PayParts: redirecting to', paymentUrl);
        window.location.href = paymentUrl;
        return;
      }

      // 4a-2. NovaPay: create order + session, then redirect to NovaPay payment page.
      if (
        data.paymentMethod === 'pay-now' &&
        data.paymentProvider === 'novapay'
      ) {
        console.log('[PaymentForm] NovaPay: calling API route');
        const res = await fetch('/api/checkout/novapay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            amount: finalAmount,
            currency,
            bonusSpend: appliedBonus,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('[PaymentForm] NovaPay API error:', err);
          toast.error(err.error || t('errorSavingPaymentInformation'));
          setIsLoading(false);
          return;
        }
        const { paymentUrl } = await res.json();
        console.log('[PaymentForm] NovaPay: redirecting to', paymentUrl);
        window.location.href = paymentUrl;
        return;
      }

      // 4b. All other methods: create order via server action
      const orderResult = await createOrder(
        completeCheckoutData,
        locale,
        false,
        data.paymentMethod,
        { bonusSpend: appliedBonus },
      );

      if (!orderResult.success || !orderResult.order) {
        console.error('[PaymentForm] createOrder failed:', orderResult.errors);
        toast.error(
          orderResult.errors?.[0] || t('errorSavingPaymentInformation'),
        );
        setIsLoading(false);
        return;
      }

      const createdOrder = orderResult.order;
      console.log('[PaymentForm] order created:', createdOrder.id);
      const orderName = (
        createdOrder.name ||
        createdOrder.id.split('/').pop() ||
        ''
      ).replace('#', '');

      await savePaymentInfo({ ...data, amount: finalAmount }, createdOrder.id);

      // 4b. All other methods: reset cart, then redirect to success page.
      // Safe to reset here because we're navigating away immediately after.
      try {
        await resetCartSession();
        console.log(
          '[PaymentForm] cart reset after non-liqpay order',
          createdOrder.id,
        );
      } catch (resetError) {
        console.error(
          '[PaymentForm] resetCartSession failed (non-blocking):',
          resetError,
        );
      }

      toast.success(t('paymentInformationSaved'));
      router.push(`/checkout/success/${encodeURIComponent(orderName)}`);
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error(t('errorSavingPaymentInformation'));
      setIsLoading(false);
    }
  };

  // After order is created, show the LiqPay payment form.
  // The useEffect above tries to auto-click the submit button.
  // If Safari blocks it, the user sees a visible "Pay" button as fallback.
  if (liqpayParams) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-12 gap-6">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-green-800 rounded-full animate-spin" />
          <span>{t('processingPayment')}</span>
        </div>
        <form
          method="POST"
          action="https://www.liqpay.ua/api/3/checkout"
          acceptCharset="utf-8"
          className="flex flex-col items-center gap-3"
        >
          <input type="hidden" name="data" value={liqpayParams.data} />
          <input
            type="hidden"
            name="signature"
            value={liqpayParams.signature}
          />
          <button
            ref={liqpaySubmitRef}
            type="submit"
            className="px-6 py-3 bg-green-800 text-white font-semibold rounded hover:bg-green-700 transition-colors"
          >
            {t('completePayment')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Form {...form}>
        {form.formState.isSubmitted &&
          Object.keys(form.formState.errors).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h4 className="text-red-800 font-medium text-sm mb-2">
                {t('pleaseFixErrors')}
              </h4>
              <ul className="text-red-700 text-sm space-y-1">
                {Object.entries(form.formState.errors).map(([field, error]) => (
                  <li key={field} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
                    {error?.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

        <PaymentMethodSelection
          paymentMethods={paymentMethods}
          onSelectPaymentMethod={(method: string) => {
            form.setValue(
              'paymentMethod',
              method as PaymentInfo['paymentMethod'],
            );
            // If After Delivered is selected, automatically set the provider
            if (method === 'after-delivered') {
              form.setValue('paymentProvider', 'after-delivered');
            } else {
              // Reset provider when switching back to Pay Now to force manual selection
              // @ts-ignore
              form.setValue('paymentProvider', undefined);
            }
          }}
        />

        {selectedPaymentMethodValue === 'pay-now' && (
          <PaymentProviderSelection
            paymentProviders={paymentProviders}
            onSelectPaymentProvider={(provider: string) =>
              form.setValue(
                'paymentProvider',
                provider as PaymentInfo['paymentProvider'],
              )
            }
          />
        )}

        {selectedPaymentProviderValue === 'liqpay-payparts' && (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded">
            <div className="text-sm">
              <span className="font-medium text-green-800">
                {partsCount} {t('parts')}
              </span>
              <span className="text-green-700 ml-1">
                — {Math.ceil(finalAmount / partsCount)} {currency}/
                {t('partLabel')}
              </span>
            </div>
            <PayPartsModal
              price={finalAmount}
              currencyCode={currency}
              initialPartsCount={partsCount}
              onPartsCountChange={setPartsCount}
            />
          </div>
        )}

        {/* Bonus section — hidden for anonymous (not signed-up) users */}
        {showBonusCard && (
          <div
            className={clsx(
              'relative flex flex-col w-full p-4 rounded border transition-all text-left space-y-4',
              {
                'border-primary bg-primary/5':
                  isBonusApplied && bonusBalance > 0,
                'border-gray-200 hover:border-gray-300':
                  !isBonusApplied || bonusBalance === 0,
              },
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={clsx(
                  'w-10 h-10 rounded flex items-center justify-center shrink-0',
                  {
                    'bg-primary/10': isBonusApplied && bonusBalance > 0,
                    'bg-gray-100': !isBonusApplied || bonusBalance === 0,
                  },
                )}
              >
                <Coins
                  className={clsx('w-5 h-5', {
                    'text-primary': isBonusApplied && bonusBalance > 0,
                    'text-gray-600': !isBonusApplied || bonusBalance === 0,
                  })}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={clsx('font-medium text-sm', {
                    'text-primary': isBonusApplied && bonusBalance > 0,
                    'text-gray-900': !isBonusApplied || bonusBalance === 0,
                  })}
                >
                  {t('bonuses_title')}
                </h3>
                {bonusBalance > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      {t('bonuses_available')}: {bonusBalance} {currency}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {t('bonuses_limit_hint')}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    {t('bonuses_empty_balance')}
                  </p>
                )}
              </div>
              {bonusBalance > 0 && (
                <div className="flex items-center space-x-2 px-2">
                  <Checkbox
                    id="use-bonuses"
                    checked={isBonusApplied}
                    onCheckedChange={(checked) =>
                      setIsBonusApplied(checked as boolean)
                    }
                    className="w-5 h-5"
                  />
                  <Label
                    htmlFor="use-bonuses"
                    className="text-xs font-medium cursor-pointer select-none"
                  >
                    {t('bonuses_apply')}
                  </Label>
                </div>
              )}
            </div>
            {isBonusApplied && bonusBalance > 0 && (
              <div className="pt-4 border-t border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 max-w-[200px] relative">
                    <Input
                      type="number"
                      min="0"
                      max={maxBonusAllowed}
                      value={bonusSpend === 0 ? '' : bonusSpend}
                      placeholder="0"
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          setBonusSpend(0);
                          return;
                        }
                        const parsed = parseInt(rawValue, 10);
                        if (isNaN(parsed)) return;
                        const val = Math.min(
                          maxBonusAllowed,
                          Math.max(0, parsed),
                        );
                        setBonusSpend(val);
                      }}
                      className="h-10 pr-12 font-medium border-primary/20 focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      {currency}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">
                        {t('bonuses_balance_limit')}:{' '}
                        <span className="font-semibold text-gray-700">
                          {bonusLimitFromBalance} {currency}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('bonuses_order_limit')}:{' '}
                        <span className="font-semibold text-gray-700">
                          {Math.floor(eligibleAmount)} {currency}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-400 italic leading-tight mt-1">
                        * {t('bonuses_logic_hint_updated')}
                      </p>
                      {bonusSpend > 0 && (
                        <p className="text-xs text-primary font-semibold mt-2">
                          {t('bonuses_discount_applied')}: -{bonusSpend}{' '}
                          {currency}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full h-12 bg-green-800 rounded"
            disabled={isLoading || !selectedPaymentProviderValue}
            // @ts-ignore
            onClick={form.handleSubmit(onSubmit)}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t('processingPayment')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span>
                  {t('completePayment')} {finalAmount.toFixed(2)} {currency}
                </span>
              </div>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {t('managerConfirmationNotice')}
          </p>
        </div>
      </Form>
    </div>
  );
}
