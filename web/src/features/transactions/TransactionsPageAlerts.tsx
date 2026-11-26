import Alert from '@mui/material/Alert';
import { AlertSlot } from '../../components/common/AlertSlot.styles';

type Props = {
  error: string;
  onDismissError: () => void;
  noAccounts: boolean;
};

export function TransactionsPageAlerts({
  error,
  onDismissError,
  noAccounts,
}: Props) {
  return (
    <>
      {error && (
        <AlertSlot>
          <Alert severity="error" onClose={onDismissError}>
            {error}
          </Alert>
        </AlertSlot>
      )}

      {noAccounts && (
        <AlertSlot>
          <Alert severity="info">
            Add an account first — every transaction is tied to at least one.
          </Alert>
        </AlertSlot>
      )}
    </>
  );
}
