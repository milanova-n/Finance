import Stack from '@mui/material/Stack';
import { Loading } from '../components/common/Loading';
import { TransactionsDataGrid } from '../features/transactions/TransactionsDataGrid';
import { TransactionFormDialog } from '../features/transactions/TransactionFormDialog';
import { TransactionsPageAlerts } from '../features/transactions/TransactionsPageAlerts';
import { TransactionsPageHeader } from '../features/transactions/TransactionsPageHeader';
import { TransactionsViewTabs } from '../features/transactions/TransactionsViewTabs';
import { useTransactionsPage } from '../features/transactions/useTransactionsPage';
import { TableCard } from './Accounts.styles';

export function Transactions() {
  const page = useTransactionsPage();

  if (!page.rows) {
    return <Loading label="Loading transactions" />;
  }

  return (
    <>
      <TransactionsPageAlerts
        error={page.error}
        onDismissError={() => page.setError('')}
        noAccounts={page.noAccounts}
      />

      <TransactionsPageHeader
        noAccounts={page.noAccounts}
        onAddTransaction={page.openNew}
      />

      <TransactionsViewTabs view={page.view} onChange={page.navigate} />

      <Stack spacing={3}>
        <TableCard>
          <TransactionsDataGrid
            view={page.view}
            rows={page.rows}
            expenseFieldDefs={page.expenseFieldDefs}
            incomeFieldDefs={page.incomeFieldDefs}
            onEdit={page.openEdit}
            onDelete={page.remove}
          />
        </TableCard>
      </Stack>

      <TransactionFormDialog
        accounts={page.accounts}
        expenseCategories={page.expenseCategories}
        incomeCategories={page.incomeCategories}
        expensePurposes={page.expensePurposes}
        cashTypes={page.cashTypes}
        allCashSubtypes={page.allCashSubtypes}
        cashSubtypes={page.cashSubtypes}
        catalogGap={page.catalogGap}
        onGoToCatalogSetup={page.goToCatalogSetup}
        expenseFieldDefs={page.expenseFieldDefs}
        incomeFieldDefs={page.incomeFieldDefs}
        form={page.form}
      />
    </>
  );
}