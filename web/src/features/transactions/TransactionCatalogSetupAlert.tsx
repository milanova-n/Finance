import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import { settingsPath, type CatalogGap } from '../../utils/catalogGaps';

type Props = {
  gap: CatalogGap;
  onNavigate?: () => void;
};

export function TransactionCatalogSetupAlert({ gap, onNavigate }: Props) {
  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button
          component={RouterLink}
          to={settingsPath(gap.focus)}
          size="small"
          color="inherit"
          onClick={onNavigate}
        >
          Set up {gap.title.toLowerCase()}
        </Button>
      }
    >
      {gap.description}
    </Alert>
  );
}