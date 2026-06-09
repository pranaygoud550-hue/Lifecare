import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface StripeCheckoutFormProps {
  clientSecret: string;
  amountLabel: string;
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
  onError: (message: string) => void;
  submitLabel?: string;
  disabled?: boolean;
}

function CheckoutForm({
  amountLabel,
  onSuccess,
  onError,
  submitLabel = 'Pay now',
  disabled,
}: Omit<StripeCheckoutFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/wallet`,
      },
      redirect: 'if_required',
    });

    setLoading(false);

    if (error) {
      onError(error.message || 'Payment failed');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await onSuccess(paymentIntent.id);
    } else if (paymentIntent?.status === 'processing') {
      onError('Payment is processing. Please wait and check your wallet shortly.');
    } else {
      onError('Payment was not completed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button type="submit" className="w-full" size="lg" disabled={!stripe || loading || disabled}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          `${submitLabel} ${amountLabel}`
        )}
      </Button>
    </form>
  );
}

export function StripeCheckoutForm(props: StripeCheckoutFormProps) {
  const stripePromise = getStripe();

  if (!stripePromise || !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <p className="text-sm text-amber-600 p-3 rounded-lg bg-amber-50 border border-amber-200">
        Stripe is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to enable card payments.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#0d9488' } },
      }}
    >
      <CheckoutForm
        amountLabel={props.amountLabel}
        onSuccess={props.onSuccess}
        onError={props.onError}
        submitLabel={props.submitLabel}
        disabled={props.disabled}
      />
    </Elements>
  );
}
