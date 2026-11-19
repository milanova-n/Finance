import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import type { TransactionView } from '../../types';

const tabSx = { minHeight: 0, py: 1.25 };

type Props = {
  view: TransactionView;
  onChange: (view: TransactionView) => void;
};

export function TransactionsViewTabs({ view, onChange }: Props) {
  return (
    <Tabs
      value={view}
      onChange={(_, value: TransactionView) => onChange(value)}
      sx={{ mb: 3, minHeight: 0, '& .MuiTabs-indicator': { height: 2 } }}
    >
      <Tab disableRipple label="All" value="all" sx={tabSx} />
      <Tab disableRipple label="Expenses" value="expenses" sx={tabSx} />
      <Tab disableRipple label="Income" value="income" sx={tabSx} />
      <Tab disableRipple label="Cash" value="cash" sx={tabSx} />
    </Tabs>
  );
}
