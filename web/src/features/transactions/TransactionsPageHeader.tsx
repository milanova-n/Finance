import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Lede, PageHeader, PageTitle } from '../../styles/shared.styles';

type Props = {
  noAccounts: boolean;
  onAddTransaction: () => void;
};

export function TransactionsPageHeader({
  noAccounts,
  onAddTransaction,
}: Props) {
  return (
    <PageHeader>
      <Box>
        <PageTitle component="h1">Transactions</PageTitle>
        <Lede variant="body2">
          Track your income, expenses, and cash movements and stay on top of your finances.
        </Lede>
      </Box>
      <Button
        variant="contained"
        onClick={onAddTransaction}
        disabled={noAccounts}
        title={noAccounts ? 'Add an account first' : undefined}
      >
        Add transaction
      </Button>
    </PageHeader>
  );
}
