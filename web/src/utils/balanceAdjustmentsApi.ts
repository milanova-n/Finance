import { api, queryString } from '../services/api';

export type BalanceAdjustmentRow = {
  id: number;
  accountId: number;
  accountName: string;
  currency: string;
  date: string;
  amount: number;
  comment: string | null;
  period: string;
};

export async function fetchBalanceAdjustments(
  filters: Record<string, string | number | undefined> = {}
): Promise<BalanceAdjustmentRow[]> {
  return api<BalanceAdjustmentRow[]>(
    `/balance-adjustments${queryString(filters)}`
  );
}
