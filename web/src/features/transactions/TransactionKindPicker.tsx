import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import type { TransactionKind } from '../../types';
import { TRANSACTION_KIND_LABELS } from '../../types';

const KIND_OPTIONS: {
  kind: TransactionKind;
  Icon: SvgIconComponent;
  flow: 'spend' | 'earn' | 'neutral';
}[] = [
  { kind: 'expense', Icon: TrendingDownOutlinedIcon, flow: 'spend' },
  { kind: 'income', Icon: TrendingUpOutlinedIcon, flow: 'earn' },
  { kind: 'cash', Icon: SwapHorizOutlinedIcon, flow: 'neutral' },
];

type Props = {
  value: TransactionKind;
  onChange: (kind: TransactionKind) => void;
  disabled?: boolean;
  cashDisabled?: boolean;
  helperText?: string;
};

export function TransactionKindPicker({
  value,
  onChange,
  disabled,
  cashDisabled,
  helperText,
}: Props) {
  return (
    <Box>
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1 }}
      >
        Transaction type
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ width: '100%' }}
      >
        {KIND_OPTIONS.map(({ kind, Icon, flow }) => {
          const selected = value === kind;
          const optionDisabled =
            disabled || (kind === 'cash' && Boolean(cashDisabled));

          return (
            <Button
              key={kind}
              type="button"
              variant={selected ? 'contained' : 'outlined'}
              disabled={optionDisabled}
              onClick={() => onChange(kind)}
              aria-pressed={selected}
              sx={(theme) => ({
                flex: 1,
                py: 1.25,
                flexDirection: 'column',
                gap: 0.5,
                textTransform: 'none',
                fontWeight: selected ? 600 : 500,
                ...(selected &&
                  flow === 'earn' && {
                    bgcolor: theme.app.earn.fill,
                    color: theme.palette.getContrastText(theme.app.earn.fill),
                    '&:hover': { bgcolor: theme.app.earn.text },
                  }),
                ...(selected &&
                  flow === 'spend' && {
                    bgcolor: theme.app.spend.fill,
                    color: theme.palette.getContrastText(theme.app.spend.fill),
                    '&:hover': { bgcolor: theme.app.spend.text },
                  }),
                ...(selected &&
                  flow === 'neutral' && {
                    bgcolor: 'text.primary',
                    color: 'background.paper',
                    '&:hover': { bgcolor: 'text.secondary' },
                  }),
              })}
            >
              <Icon fontSize="small" aria-hidden />
              {TRANSACTION_KIND_LABELS[kind]}
            </Button>
          );
        })}
      </Stack>
      {helperText && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, minHeight: '1.25em' }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
