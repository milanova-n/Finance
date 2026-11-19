import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { Lede, PageHeader, PageTitle } from '../styles/shared.styles';

export function Dashboard() {
  return (
    <>
      <PageHeader>
        <PageTitle>Analysis</PageTitle>
        <Lede>Charts and summaries will appear here.</Lede>
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
        <InsightsOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body1">Analysis is not set up yet.</Typography>
      </Box>
    </>
  );
}