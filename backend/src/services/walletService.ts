import mongoose from 'mongoose';
import { User } from '../models/index.js';
import type { IUser } from '../models/User.js';

export type WalletTxCategory =
  | 'topup'
  | 'appointment'
  | 'pharmacy'
  | 'refund'
  | 'other';

export interface WalletTxInput {
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category?: WalletTxCategory;
  appointmentId?: string;
  paymentIntentId?: string;
  refundStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'completed';
}

function ensureWallet(user: IUser) {
  if (!user.wallet) {
    user.wallet = { balance: 0, transactions: [] };
  }
}

function pushTransaction(user: IUser, tx: WalletTxInput) {
  ensureWallet(user);
  const balanceAfter =
    tx.type === 'credit'
      ? user.wallet!.balance + tx.amount
      : user.wallet!.balance - tx.amount;

  user.wallet!.transactions.push({
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    timestamp: new Date(),
    balanceAfter,
    category: tx.category || 'other',
    appointmentId: tx.appointmentId,
    paymentIntentId: tx.paymentIntentId,
    refundStatus: tx.refundStatus || 'none',
  } as NonNullable<IUser['wallet']>['transactions'][0]);

  if (tx.type === 'credit') {
    user.wallet!.balance += tx.amount;
  } else {
    user.wallet!.balance -= tx.amount;
  }

  return user.wallet!.transactions.at(-1);
}

/** Atomic wallet credit using MongoDB transaction */
export async function creditWallet(
  userId: string,
  input: WalletTxInput
): Promise<{ balance: number; transaction: unknown }> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    if (input.paymentIntentId) {
      const dup = user.wallet?.transactions?.some(
        (t) => t.paymentIntentId === input.paymentIntentId
      );
      if (dup) {
        await session.commitTransaction();
        return { balance: user.wallet!.balance, transaction: null };
      }
    }

    const transaction = pushTransaction(user, input);
    await user.save({ session });
    await session.commitTransaction();
    return { balance: user.wallet!.balance, transaction };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/** Atomic wallet debit — throws if insufficient balance */
export async function debitWallet(
  userId: string,
  input: WalletTxInput
): Promise<{ balance: number; transaction: unknown }> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    ensureWallet(user);

    if (user.wallet!.balance < input.amount) {
      throw Object.assign(new Error('Insufficient wallet balance'), { statusCode: 400 });
    }

    const transaction = pushTransaction(user, input);
    await user.save({ session });
    await session.commitTransaction();
    return { balance: user.wallet!.balance, transaction };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export function computeMonthlySpending(
  transactions: NonNullable<IUser['wallet']>['transactions']
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let currentMonthDebit = 0;
  let currentMonthCredit = 0;
  let previousMonthDebit = 0;

  for (const tx of transactions) {
    const ts = new Date(tx.timestamp);
    if (tx.type === 'debit') {
      if (ts >= monthStart) currentMonthDebit += tx.amount;
      else if (ts >= prevMonthStart && ts < monthStart) previousMonthDebit += tx.amount;
    } else if (tx.type === 'credit' && ts >= monthStart) {
      currentMonthCredit += tx.amount;
    }
  }

  return {
    month: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    totalSpent: Math.round(currentMonthDebit * 100) / 100,
    totalTopUps: Math.round(currentMonthCredit * 100) / 100,
    previousMonthSpent: Math.round(previousMonthDebit * 100) / 100,
    transactionCount: transactions.filter(
      (t: { type: string; timestamp: Date }) =>
        t.type === 'debit' && new Date(t.timestamp) >= monthStart
    ).length,
  };
}

/** Backfill running balance for legacy transactions missing balanceAfter */
export function enrichTransactions(
  transactions: NonNullable<IUser['wallet']>['transactions']
) {
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let running = 0;
  const withBalance = chronological.map((tx) => {
    if (tx.type === 'credit') running += tx.amount;
    else running -= tx.amount;
    const txDoc = tx as unknown as { toObject?: () => Record<string, unknown> };
    const plain =
      typeof txDoc.toObject === 'function' ? txDoc.toObject() : { ...(tx as object) };
    return {
      ...plain,
      balanceAfter: tx.balanceAfter ?? running,
    };
  });
  return withBalance.reverse();
}
