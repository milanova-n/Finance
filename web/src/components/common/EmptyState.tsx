import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { EmptyAction, EmptyRoot, EmptyTitle } from './EmptyState.styles';

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <EmptyRoot>
      <EmptyTitle>{title}</EmptyTitle>
      <Typography variant="body2">{hint}</Typography>
      {action && <EmptyAction>{action}</EmptyAction>}
    </EmptyRoot>
  );
}
