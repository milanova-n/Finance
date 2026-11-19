import type { ElementType } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { FONT_DISPLAY } from '../../styles/fonts';

type Poly = { component?: ElementType };

export const EmptyRoot = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(6, 3),
  color: theme.palette.text.secondary,
}));

export const EmptyTitle = styled(Typography)<Poly>(({ theme }) => ({
  fontFamily: FONT_DISPLAY,
  fontSize: '1.1rem',
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

export const EmptyAction = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));