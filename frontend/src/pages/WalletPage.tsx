import { useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  TrendingDown,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetWalletQuery,
  useGetWalletTransactionsQuery,
  useCreateWalletTopUpIntentMutation,
  useConfirmWalletTopUpMutation,
  useAddWalletMoneyMutation,
  useRequestWalletRefundMutation,
} from '@/features/api/apiSlice';
import { StripeCheckoutForm } from '@/components/payments/StripeCheckoutForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { isStripeEnabled } from '@/lib/stripe';
import type { WalletTransaction } from '@/types';

const TOP_UP_AMOUNTS = [100, 500, 1000];

export function WalletPage() {
  const [customAmount, setCustomAmount] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: walletData, refetch } = useGetWalletQuery();
  const { data: txData, refetch: refetchTx } = useGetWalletTransactionsQuery({ page: '1' });
  const [createTopUpIntent, { isLoading: creatingIntent }] = useCreateWalletTopUpIntentMutation();
  const [confirmTopUp] = useConfirmWalletTopUpMutation();
  const [addMoney, { isLoading: demoLoading }] = useAddWalletMoneyMutation();
  const [requestRefund, { isLoading: refunding }] = useRequestWalletRefundMutation();

  const balance = walletData?.data?.balance ?? 0;
  const stripeOn = walletData?.data?.stripeEnabled ?? isStripeEnabled();
  const monthlySummary = txData?.data?.monthlySummary ?? walletData?.data?.monthlySummary;
  const transactions = (txData?.data?.transactions ?? walletData?.data?.transactions ?? []) as WalletTransaction[];

  const startStripeTopUp = async (amount: number) => {
    setTopUpAmount(amount);
    setClientSecret(null);
    try {
      const result = await createTopUpIntent({ amount }).unwrap();
      setClientSecret(result.data.clientSecret);
      setShowTopUp(true);
    } catch (err: unknown) {
      const error = err as { data?: { message?: string; code?: string } };
      if (error.data?.code === 'STRIPE_NOT_CONFIGURED') {
        await handleDemoTopUp(amount);
      } else {
        toast.error(error.data?.message || 'Could not start payment');
      }
    }
  };

  const handleDemoTopUp = async (amount: number) => {
    try {
      await addMoney({ amount }).unwrap();
      toast.success(`₹${amount} added to wallet`);
      setShowTopUp(false);
      setCustomAmount('');
      setClientSecret(null);
      refetch();
      refetchTx();
    } catch {
      toast.error('Top-up failed');
    }
  };

  const handleTopUpClick = (amount: number) => {
    if (stripeOn) {
      startStripeTopUp(amount);
    } else {
      handleDemoTopUp(amount);
    }
  };

  const onStripeTopUpSuccess = async (paymentIntentId: string) => {
    try {
      await confirmTopUp({ paymentIntentId }).unwrap();
      toast.success(`₹${topUpAmount} added to your wallet`);
      setShowTopUp(false);
      setClientSecret(null);
      setTopUpAmount(null);
      setCustomAmount('');
      refetch();
      refetchTx();
    } catch {
      toast.error('Payment succeeded but wallet update failed. Contact support with your receipt.');
    }
  };

  const handleRefundRequest = async (txId: string) => {
    try {
      await requestRefund(txId).unwrap();
      toast.success('Refund request submitted');
      refetchTx();
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Refund request failed');
    }
  };

  return (
    <div className="container-custom py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Health Wallet</h1>
      <p className="text-muted mb-8">Pay for consultations, medicines, and services securely</p>

      <Card className="mb-6 bg-gradient-to-br from-primary to-primary/80 text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-4 opacity-90">
            <Wallet className="h-5 w-5" />
            <span className="text-sm">Available Balance</span>
          </div>
          <p className="text-4xl font-bold mb-6">{formatCurrency(balance)}</p>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setShowTopUp(!showTopUp);
              setClientSecret(null);
              setTopUpAmount(null);
            }}
          >
            <Plus className="h-4 w-4" /> Add Money
          </Button>
        </CardContent>
      </Card>

      {monthlySummary && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Monthly spending — {monthlySummary.month}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted">Spent</p>
                <p className="text-lg font-bold text-accent">{formatCurrency(monthlySummary.totalSpent)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted">Top-ups</p>
                <p className="text-lg font-bold text-secondary">{formatCurrency(monthlySummary.totalTopUps)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted">Transactions</p>
                <p className="text-lg font-bold">{monthlySummary.transactionCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted">Last month</p>
                <p className="text-lg font-bold text-muted">{formatCurrency(monthlySummary.previousMonthSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showTopUp && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Top Up Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!clientSecret ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {TOP_UP_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      variant={topUpAmount === amt ? 'default' : 'outline'}
                      onClick={() => handleTopUpClick(amt)}
                      disabled={creatingIntent || demoLoading}
                    >
                      {creatingIntent && topUpAmount === amt ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        formatCurrency(amt)
                      )}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    min={100}
                    max={50000}
                    placeholder="Custom amount (min ₹100)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const amt = Number(customAmount);
                      if (amt >= 100) handleTopUpClick(amt);
                      else toast.error('Minimum top-up is ₹100');
                    }}
                    disabled={creatingIntent || demoLoading || !customAmount}
                  >
                    Continue
                  </Button>
                </div>
                <p className="text-xs text-muted flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {stripeOn
                    ? 'Secure card payment powered by Stripe'
                    : 'Demo mode — balance added instantly (configure Stripe for production)'}
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Pay {formatCurrency(topUpAmount || 0)} with card
                </p>
                <StripeCheckoutForm
                  clientSecret={clientSecret}
                  amountLabel={formatCurrency(topUpAmount || 0)}
                  submitLabel="Add"
                  onSuccess={onStripeTopUpSuccess}
                  onError={(msg) => toast.error(msg)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setClientSecret(null);
                    setTopUpAmount(null);
                  }}
                >
                  Choose different amount
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx._id || `${tx.timestamp}-${tx.description}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'p-2 rounded-full shrink-0',
                        tx.type === 'credit' ? 'bg-secondary/20' : 'bg-accent/20'
                      )}
                    >
                      {tx.type === 'credit' ? (
                        <ArrowDownLeft className="h-4 w-4 text-secondary" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted">
                        {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {tx.refundStatus && tx.refundStatus !== 'none' && (
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          Refund: {tx.refundStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span
                      className={cn(
                        'font-semibold block',
                        tx.type === 'credit' ? 'text-secondary' : 'text-accent'
                      )}
                    >
                      {tx.type === 'credit' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    {tx.balanceAfter != null && (
                      <span className="text-xs text-muted">
                        Bal: {formatCurrency(tx.balanceAfter)}
                      </span>
                    )}
                    {tx._id &&
                      tx.type === 'debit' &&
                      tx.category === 'appointment' &&
                      (!tx.refundStatus || tx.refundStatus === 'none') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 text-xs gap-1"
                          disabled={refunding}
                          onClick={() => handleRefundRequest(tx._id!)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Request Refund
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
