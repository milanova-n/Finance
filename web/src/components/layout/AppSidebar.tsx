import type { NavLinkProps } from 'react-router-dom';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { NavLink } from 'react-router-dom';
import { Wordmark } from '../common/Logo';
import { useAuth } from '../../context/useAuth';
import {
  SideNavButton,
  SideNavLink,
  SidebarBrand,
  SidebarFooter,
  SidebarInner,
  SidebarNav,
} from './AppSidebar.styles';

type MainNavIcon = typeof HomeOutlinedIcon;

type MainLink = {
  to: string;
  label: string;
  icon: MainNavIcon;
  end?: boolean; // Highlight the link when the pathname exactly matches the to prop = true
};

const MAIN_LINKS: MainLink[] = [
  { to: '/', label: 'Home', icon: HomeOutlinedIcon, end: true },
  {
    to: '/accounts',
    label: 'Accounts',
    icon: AccountBalanceWalletOutlinedIcon,
  },
  {
    to: '/transactions',
    label: 'Transactions',
    icon: ReceiptLongOutlinedIcon,
    end: false,
  },
  { to: '/analysis', label: 'Analysis', icon: InsightsOutlinedIcon, end: true },
];

type Props = {
  onNavigate?: () => void; // Callback function to close the mobile sidebar when a link is clicked
};

const navClassName: NavLinkProps['className'] = ({ isActive }) =>
  isActive ? 'active' : undefined;

export function AppSidebar({ onNavigate }: Props) {
  const { signOut } = useAuth();

  return (
    <SidebarInner>
      <SidebarBrand>
        <NavLink
          to="/"
          aria-label="MyFi — Home"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={onNavigate}
        >
          <Wordmark />
        </NavLink>
      </SidebarBrand>

      <SidebarNav aria-label="Main">
        <List disablePadding dense>
          {MAIN_LINKS.map(({ to, label, icon: Icon, end }) => (
            <SideNavLink
              key={to}
              to={to}
              end={end}
              className={navClassName}
              onClick={onNavigate}
            >
              <SideNavButton dense>
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  slotProps={{ primary: { sx: { fontSize: '0.92rem' } } }}
                />
              </SideNavButton>
            </SideNavLink>
          ))}
        </List>
      </SidebarNav>

      <SidebarFooter aria-label="Settings and account">
        <SideNavLink
          to="/settings"
          className={navClassName}
          onClick={onNavigate}
        >
          <SideNavButton dense sx={{ mt: 0.5 }}>
            <ListItemIcon>
              <SettingsOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              secondary="Account & labels"
              slotProps={{
                primary: { sx: { fontSize: '0.92rem' } },
                secondary: { sx: { fontSize: '0.72rem' } },
              }}
            />
          </SideNavButton>
        </SideNavLink>

        <Divider sx={{ my: 0.5 }} />

        <Button
          fullWidth
          color="inherit"
          startIcon={<LogoutOutlinedIcon />}
          onClick={() => {
            signOut();
            onNavigate?.();
          }}
          sx={{
            justifyContent: 'flex-start',
            borderRadius: 0,
            textTransform: 'none',
          }}
        >
          Sign out
        </Button>
      </SidebarFooter>
    </SidebarInner>
  );
}
