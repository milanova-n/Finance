import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { AppSidebar } from './AppSidebar';
import { SidebarDrawer } from './AppSidebar.styles';
import { LayoutMain } from './AppLayout.styles';

const TITLES: Record<string, string> = {
  '/': 'Home',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/analysis': 'Analysis',
  '/settings': 'Settings',
};

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/transactions')) return 'Transactions';
  const base = pathname.split('?')[0];
  return TITLES[base] ?? 'Home';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  // Permanent sidebar from tablet (sm); phone keeps the drawer + top bar.
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const closeMobile = () => setMobileOpen(false);
  const sidebar = <AppSidebar onNavigate={isDesktop ? undefined : closeMobile} />;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isDesktop ? (
        <SidebarDrawer variant="permanent" open>
          {sidebar}
        </SidebarDrawer>
      ) : (
        <SidebarDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
        >
          {sidebar}
        </SidebarDrawer>
      )}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!isDesktop && (
          <Toolbar
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              gap: 1,
              minHeight: 56,
            }}
          >
            <IconButton
              edge="start"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
              {pageTitle(pathname)}
            </Typography>
          </Toolbar>
        )}

        <LayoutMain>{children}</LayoutMain>
      </Box>
    </Box>
  );
}