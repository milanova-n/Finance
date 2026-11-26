import { styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';

export const UserAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  fontSize: '0.75rem',
  fontWeight: 600,
  backgroundColor: theme.app.brand.main,
  color: theme.app.brand.contrast,
}));
