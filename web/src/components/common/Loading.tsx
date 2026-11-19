import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <Stack spacing={3} aria-busy="true" aria-label={label}>
      <Skeleton variant="rounded" height={96} />
      <Skeleton variant="rounded" height={220} />
    </Stack>
  );
}