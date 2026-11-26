import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { PageHeader, PageTitle } from '../styles/shared.styles';

export function Home() {
  return (
    <>
      <PageHeader>
        <PageTitle>Home</PageTitle>
      </PageHeader>
      <Box
        sx={{
          py: 8,
          textAlign: 'center',
          color: 'text.secondary',
          border: 1,
          borderColor: 'divider',
          borderRadius: 0,
        }}
      >
        <HomeOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body1">Your home view will live here.</Typography>
      </Box>
    </>
  );
}
