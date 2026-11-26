import { styled } from '@mui/material/styles';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { FONT_DISPLAY } from '../../styles/fonts';

export const DialogHead = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1.5),
  fontFamily: FONT_DISPLAY,
  fontWeight: 500,
  fontSize: '1.06rem',
  letterSpacing: '-0.018em',
  padding: theme.spacing(3, 3, 0),
}));

export const DialogBody = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'visible',
}));
