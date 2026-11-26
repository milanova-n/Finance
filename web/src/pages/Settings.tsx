import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useAuth } from '../context/useAuth';
import { useThemeMode } from '../context/useThemeMode';
import { initials } from '../utils/format';
import { Lede, PageHeader, PageTitle } from '../styles/shared.styles';
import { UserAvatar } from '../components/common/UserAvatar.styles';
import { SettingsCatalogSection } from '../features/settings/SettingsCatalogSection';

type Section = 'account' | 'appearance' | 'labels';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'labels', label: 'Transaction labels' },
];

export function Settings() {
  const { user, signOut } = useAuth();
  const { mode, toggle } = useThemeMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get('focus');
  const sectionParam = searchParams.get('section') as Section | null;
  const section: Section =
    sectionParam && SECTIONS.some((s) => s.id === sectionParam)
      ? sectionParam
      : focus
        ? 'labels'
        : 'account';

  useEffect(() => {
    // If the focus is set and the section is not labels, set the section to labels
    if (focus && sectionParam !== 'labels') {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('section', 'labels');
          return next;
        },
        { replace: true }
      );
    }
  }, [focus, sectionParam, setSearchParams]);

  return (
    <>
      <PageHeader>
        <PageTitle>Settings</PageTitle>
        <Lede>Account, appearance, and transaction dropdown labels.</Lede>
      </PageHeader>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ alignItems: 'flex-start' }}
      >
        <Box
          component="nav"
          aria-label="Settings sections"
          sx={{
            width: { xs: '100%', md: 200 },
            flexShrink: 0,
            border: 1,
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          {SECTIONS.map((item) => (
            <Button
              key={item.id}
              fullWidth
              onClick={() =>
                setSearchParams(
                  item.id === 'labels' && focus
                    ? { section: 'labels', focus }
                    : { section: item.id }
                )
              }
              sx={{
                justifyContent: 'flex-start',
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: section === item.id ? 600 : 400,
                color: section === item.id ? 'primary.main' : 'text.primary',
                bgcolor:
                  section === item.id ? 'action.selected' : 'transparent',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {section === 'account' && user && (
            <Stack
              spacing={2}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 0,
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <UserAvatar sx={{ width: 48, height: 48, fontSize: '1rem' }}>
                  {initials(user.fullName)}
                </UserAvatar>
                <Box>
                  <Typography component="h2" variant="h6">
                    {user.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  {user.username && (
                    <Typography variant="body2" color="text.secondary">
                      @{user.username}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                Signed in on this device. Use sign out in the sidebar when you
                are done on a shared computer.
              </Typography>
              <Button
                variant="outlined"
                onClick={signOut}
                sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
              >
                Sign out
              </Button>
            </Stack>
          )}

          {section === 'appearance' && (
            <Stack
              spacing={2}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 0,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Theme
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose light or dark mode for the app. This preference is saved
                in your browser.
              </Typography>
              <Button
                variant="contained"
                startIcon={
                  mode === 'dark' ? (
                    <LightModeOutlinedIcon />
                  ) : (
                    <DarkModeOutlinedIcon />
                  )
                }
                onClick={toggle}
                sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
              >
                {mode === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'}
              </Button>
            </Stack>
          )}

          {section === 'labels' && <SettingsCatalogSection />}
        </Box>
      </Stack>
    </>
  );
}
