import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import TableRow from '@mui/material/TableRow';

export const TableCard = styled(Card)({
  overflow: 'hidden',
});

export const PaddedCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
}));

/** First and last cells get extra inset so content clears the card's radius. */
export const LedgerRow = styled(TableRow)(({ theme }) => ({
  '& > td:first-of-type, & > th:first-of-type': {
    paddingLeft: theme.spacing(3),
  },
  '& > td:last-of-type, & > th:last-of-type': {
    paddingRight: theme.spacing(3),
  },
}));
