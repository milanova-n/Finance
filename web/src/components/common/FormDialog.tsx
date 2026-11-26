import { useEffect, useRef, type ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { DialogBody, DialogHead } from './FormDialog.styles';

/** Add/edit form shell. MUI Dialog handles focus trap and Escape. */
export function FormDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const body = bodyRef.current;
      if (!body) return;
      const target =
        body.querySelector<HTMLElement>('[data-autofocus]') ??
        body.querySelector<HTMLElement>('input, textarea');
      target?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogHead>
        {title}
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogHead>
      <DialogBody ref={bodyRef}>{children}</DialogBody>
    </Dialog>
  );
}
