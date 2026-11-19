import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

type Item = { id: number; name: string };

type Props = {
  title: string;
  description: string;
  items: Item[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRename?: (id: number, name: string) => Promise<void>;
  addLabel?: string;
};

export function CatalogNameList({
  title,
  description,
  items,
  onAdd,
  onDelete,
  onRename,
  addLabel = 'Add',
}: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditName(item.name);
    setMessage('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setSuccess('');
    try {
      const trimmed = name.trim();
      await onAdd(trimmed);
      setName('');
      setSuccess(`Added “${trimmed}”.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not add item.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (editingId == null || !onRename) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setMessage('Enter a name.');
      return;
    }
    setBusy(true);
    setMessage('');
    setSuccess('');
    try {
      await onRename(editingId, trimmed);
      setSuccess(`Saved as “${trimmed}”.`);
      cancelEdit();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, label: string) {
    setMessage('');
    setSuccess('');
    try {
      await onDelete(id);
      if (editingId === id) cancelEdit();
      setSuccess(`Removed “${label}”.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not remove item.');
    }
  }

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 0,
        bgcolor: theme.app.sunken,
        p: 2,
      })}
    >
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>

      {message && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 0 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Stack component="form" direction="row" spacing={1} onSubmit={submit} sx={{ mb: 2 }}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
          disabled={busy}
        />
        <Button type="submit" variant="contained" disabled={busy || !name.trim()}>
          {addLabel}
        </Button>
      </Stack>

      <Stack spacing={0.5} role="list">
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing defined yet — add a name above.
          </Typography>
        ) : (
          items.map((item) => (
            <Stack
              key={item.id}
              direction="row"
              spacing={1}
              role="listitem"
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 0.5,
                px: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {editingId === item.id ? (
                <>
                  <TextField
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    size="small"
                    fullWidth
                    disabled={busy}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void saveEdit();
                      }
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    aria-label="Save name"
                    disabled={busy}
                    onClick={() => void saveEdit()}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Cancel edit"
                    disabled={busy}
                    onClick={cancelEdit}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                    {item.name}
                  </Typography>
                  {onRename ? (
                    <IconButton
                      size="small"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => startEdit(item)}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    size="small"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => void remove(item.id, item.name)}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Stack>
          ))
        )}
      </Stack>
    </Box>
  );
}