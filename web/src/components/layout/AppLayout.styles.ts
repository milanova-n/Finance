import { styled } from '@mui/material/styles';
import { SIDEBAR_WIDTH } from './AppSidebar.styles';

/** Content column cap: full width beside sidebar until there is room to center 1080px. */
const mainMaxWidth = `min(1080px, calc(100vw - ${SIDEBAR_WIDTH}px))`;

export const LayoutMain = styled('main')(({ theme }) => ({
  flex: 1,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  margin: 0,
  boxSizing: 'border-box',
  padding: theme.spacing(2, 1.5, 5),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(2.5, 2, 5),
    maxWidth: mainMaxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3, 2.5, 6),
  },
  [theme.breakpoints.up('lg')]: {
    padding: theme.spacing(3, 3, 6),
  },
  [theme.breakpoints.up('xl')]: {
    padding: theme.spacing(3, 4, 6),
  },
}));