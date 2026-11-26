import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

/** Spacing wrapper for alerts above form fields. */
export const AlertSlot = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));
