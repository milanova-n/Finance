import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Account } from '../../types';
import { FormDialog } from '../../components/common/FormDialog';
import { AlertSlot } from '../../components/common/AlertSlot.styles';
import { FormActions } from '../../styles/shared.styles';
import { money } from '../../utils/format';
import {
  currentMonthParam,
  fetchReconciliationHistory,
  fetchReconciliationPreview,
  periodLabel,
  submitReconciliation,
  type ReconciliationHistoryRow,
  type ReconciliationPreview,
} from '../../utils/reconciliationApi';

function SummaryRow({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color={strong ? 'text.primary' : 'text.secondary'}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 600 : 400 }}>
        {money(value, currency)}
      </Typography>
    </Stack>
  );
}

export function AccountReconcileDialog({
  open,
  account,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [month, setMonth] = useState(currentMonthParam());
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [history, setHistory] = useState<ReconciliationHistoryRow[]>([]);
  const [closingInput, setClosingInput] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadPreview = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const [nextPreview, nextHistory] = await Promise.all([
        fetchReconciliationPreview(account.id, month),
        fetchReconciliationHistory(account.id),
      ]);
      setPreview(nextPreview);
      setHistory(nextHistory.filter((row) => row.reconciledAt));
      const defaultClosing =
        nextPreview.closingBalance ?? nextPreview.calculatedBalance;
      setClosingInput(String(defaultClosing));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Could not load the month.');
    } finally {
      setLoading(false);
    }
  }, [account, month]);

  useEffect(() => {
    if (!open || !account) return;
    setMonth(currentMonthParam());
    setComment('');
    setError('');
  }, [open, account]);

  useEffect(() => {
    if (!open || !account) return;
    void loadPreview();
  }, [open, account, loadPreview]);

  if (!account) return null;

  const currency = account.currency;
  const closingNum = Number(closingInput);
  const adjustment =
    preview && Number.isFinite(closingNum)
      ? closingNum - preview.calculatedBalance
      : null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!account || !preview || !Number.isFinite(closingNum)) {
      setError('Enter the balance from your statement.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitReconciliation(account.id, {
        period: month,
        closingBalance: closingNum,
        comment: comment.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save reconciliation.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open={open}
      title={`Reconcile ${account.name}`}
      onClose={onClose}
    >
      <form onSubmit={save}>
        {error ? (
          <AlertSlot>
            <Alert severity="error">{error}</Alert>
          </AlertSlot>
        ) : null}

        <Stack spacing={2}>
          <TextField
            label="Month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Typography variant="body2" color="text.secondary">
            {preview
              ? `${periodLabel(preview.period)} · through ${preview.periodEnd}`
              : 'Ledger totals for the selected month.'}
          </Typography>

          {loading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Calculating
              </Typography>
            </Stack>
          ) : preview ? (
            <Stack
              spacing={1}
              sx={{ p: 1.5, borderRadius: 1, bgcolor: 'app.sunken' }}
            >
              <SummaryRow
                label="Opening (start of month)"
                value={preview.openingBalance}
                currency={currency}
              />
              <SummaryRow
                label="Income"
                value={preview.incomeTotal}
                currency={currency}
              />
              <SummaryRow
                label="Expense"
                value={preview.expenseTotal}
                currency={currency}
              />
              <SummaryRow
                label="Cash movements"
                value={preview.cashMovementTotal}
                currency={currency}
              />
              <SummaryRow
                label="Calculated closing"
                value={preview.calculatedBalance}
                currency={currency}
                strong
              />
              {preview.reconciledAt ? (
                <Typography variant="caption" color="success.main">
                  Last reconciled {new Date(preview.reconciledAt).toLocaleString()}
                </Typography>
              ) : null}
              {preview.adjustments.length > 0 ? (
                <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Adjustment rows
                  </Typography>
                  {preview.adjustments.map((row) => (
                    <Typography key={row.id} variant="caption">
                      {money(row.amount, currency)}
                      {row.comment ? ` · ${row.comment}` : ''}
                    </Typography>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          ) : null}

          <TextField
            label="Statement closing balance"
            type="number"
            value={closingInput}
            onChange={(e) => setClosingInput(e.target.value)}
            size="small"
            required
            helperText={
              adjustment != null && Math.abs(adjustment) >= 0.005
                ? `Creates an adjustment of ${money(adjustment, currency)} (actual − calculated).`
                : 'Should match your bank or wallet statement for month end.'
            }
            slotProps={{ htmlInput: { step: '0.01', 'data-autofocus': true } }}
          />

          <TextField
            label="Note (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            size="small"
            placeholder="Rounding, missing receipt, etc."
          />

          {history.length > 0 ? (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Recent reconciliations
              </Typography>
              {history.slice(0, 6).map((row) => (
                <Typography key={row.id} variant="caption">
                  {periodLabel(row.period)} · {money(row.closingBalance, currency)}
                  {Math.abs(row.adjustmentsTotal) >= 0.005
                    ? ` (adj ${money(row.adjustmentsTotal, currency)})`
                    : ''}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </Stack>

        <FormActions>
          <Button type="submit" variant="contained" disabled={busy || loading || !preview}>
            {busy ? 'Saving' : 'Save reconciliation'}
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
        </FormActions>
      </form>
    </FormDialog>
  );
}