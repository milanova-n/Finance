import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { FONT_DISPLAY } from '../../styles/fonts';

type LogoProps = {
  size?: number;
  alt?: string;
};

export function LogoMark({ size = 32, alt = '' }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt={alt}
      decoding="async" // TODO: Check if this is needed
      style={{ display: 'block', flex: 'none' }}
    />
  );
}


export function Wordmark() {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}
    >
      <LogoMark size={34} alt="" />
      <Typography
        component="span"
        sx={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: '1.32rem',
          letterSpacing: '-0.03em',
        }}
      >
        MyFi
      </Typography>
    </Box>
  );
}