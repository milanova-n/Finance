import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import ListItemButton from '@mui/material/ListItemButton';
import { NavLink } from 'react-router-dom';

export const SIDEBAR_WIDTH = 248;

export const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.palette.divider}`,
    borderRadius: 0,
    backgroundColor: theme.palette.background.paper,
  },
  '&.MuiDrawer-docked': {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
  },
  '&.MuiDrawer-docked .MuiDrawer-paper': {
    position: 'relative',
    height: '100%',
    minHeight: '100vh',
  },
}));

export const SidebarInner = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: '100vh',
});

export const SidebarBrand = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const SidebarNav = styled('nav')(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(1.5, 1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.25),
  overflowY: 'auto',
}));

export const SidebarFooter = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 1, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}));

export const SideNavLink = styled(NavLink)(({ theme }) => ({
  display: 'block',
  textDecoration: 'none',
  color: 'inherit',
  '&.active .MuiListItemButton-root': {
    color: theme.app.brand.main,
    backgroundColor: theme.app.brand.wash,
    '& .MuiListItemIcon-root': {
      color: theme.app.brand.main,
    },
  },
}));

export const SideNavButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: 0,
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  color: theme.palette.text.secondary,
  '& .MuiListItemIcon-root': {
    minWidth: 36,
    color: 'inherit',
  },
  '&:hover': {
    backgroundColor: theme.app.sunken,
    color: theme.palette.text.primary,
  },
}));

export const FooterRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1),
  borderRadius: 0,
}));