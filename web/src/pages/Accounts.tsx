import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { api } from '../lib/api';
import { money } from '../lib/format';
import {
  ACCOUNT_KINDS,
  type Account,
  type AccountKind,
} from '../lib/types';
import { FormDialog, Loading, AlertSlot } from '../components/ui';
import {
  Amount,
  FormActions,
  FormGrid,
  Lede,
  PageHeader,
  PageTitle,
} from '../theme/shared.styles';

type Draft = {
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: string;
};

const BLANK: Draft = {
  name: '',
  kind: 'cash',
  currency: 'EUR',
  openingBalance: '0',
};

const KIND_ICONS: Record<AccountKind, SvgIconComponent> = {
  cash: AccountBalanceWalletOutlinedIcon,
  bank: AccountBalanceOutlinedIcon,
  card: CreditCardOutlinedIcon,
  savings: SavingsOutlinedIcon,
};

const accountGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
} as const;

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuAccount, setMenuAccount] = useState<Account | null>(null);

  const load = useCallback(() => {
    api<Account[]>('/accounts')
      .then(setAccounts)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  function openNew() {
    setEditing(null);
    setDraft(BLANK);
    setFormError('');
    setOpen(true);
  }

  function openEdit(account: Account) {
    closeMenu();
    setEditing(account);
    setDraft({
      name: account.name,
      kind: account.kind,
      currency: account.currency,
      openingBalance: String(account.openingBalance),
    });
    setFormError('');
    setOpen(true);
  }

  function openMenu(event: MouseEvent<HTMLElement>, account: Account) {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuAccount(account);
  }

  function closeMenu() {
    setMenuAnchor(null);
    setMenuAccount(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const body = {
        ...draft,
        openingBalance: Number(draft.openingBalance || 0),
      };
      if (editing) {
        await api(`/accounts/${editing.id}`, { method: 'PUT', body });
      } else {
        await api('/accounts', { method: 'POST', body });
      }
      setOpen(false);
      load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not save the account.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(account: Account) {
    closeMenu();
    if (!confirm(`Delete ${account.name}? This cannot be undone.`)) return;
    try {
      await api(`/accounts/${account.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete the account.'
      );
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!accounts) return <Loading label="Loading your accounts" />;

  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const currency = accounts[0]?.currency ?? 'EUR';

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle component="h1">Accounts ({money(total, currency)})</PageTitle>
          <Lede variant="body2">
            Each balance is your opening amount plus everything in, minus
            everything out.
          </Lede>
        </div>
      </PageHeader>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openNew}
        fullWidth
        sx={{ display: { xs: 'inline-flex', sm: 'none' }, mb: 2 }}
      >
        Add account
      </Button>

      <Box sx={accountGridSx}>
        {accounts.map((account) => {
          const KindIcon = KIND_ICONS[account.kind];
          return (
            <Card
              key={account.id}
              variant="outlined"
              sx={{
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 1,
                    bgcolor: 'app.sunken',
                    color: 'primary.main',
                    '& .MuiSvgIcon-root': { fontSize: 24 },
                  }}
                >
                  <KindIcon />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    title={account.name}
                    sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {account.name}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label={`Actions for ${account.name}`}
                  onClick={(e) => openMenu(e, account)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack spacing={1}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Opening balance
                  </Typography>
                  <Amount component="span" color="text.secondary">
                    {money(account.openingBalance, account.currency)}
                  </Amount>
                </Stack>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Income
                  </Typography>
                  <Amount component="span" strong>
                    {money(account.balance, account.currency)}
                  </Amount>
                </Stack>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Outcome
                  </Typography>
                  <Amount component="span" strong>
                    {money(account.balance, account.currency)}
                  </Amount>
                </Stack>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Cashflow
                  </Typography>
                  <Amount component="span" strong>
                    {money(account.balance, account.currency)}
                  </Amount>
                </Stack>
                <Divider />
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Current balance
                  </Typography>
                  <Amount component="span" strong>
                    {money(account.balance, account.currency)}
                  </Amount>
                </Stack>
              </Stack>
            </Card>
          );
        })}

        <Card
          variant="outlined"
          role="button"
          tabIndex={0}
          onClick={openNew}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openNew();
            }
          }}
          sx={(theme) => ({
            p: 2.5,
            minHeight: 168,
            height: '100%',
            cursor: 'pointer',
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            borderStyle: 'dashed',
            bgcolor: 'transparent',
            boxShadow: 'none',
            transition: theme.transitions.create(
              ['border-color', 'background-color'],
              { duration: theme.transitions.duration.shorter }
            ),
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'app.sunken',
            },
          })}
        >
          <AddIcon color="primary" fontSize="large" />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Add account
          </Typography>
        </Card>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => menuAccount && openEdit(menuAccount)}>
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => menuAccount && remove(menuAccount)}
          sx={{ color: 'error.main' }}
        >
          Delete
        </MenuItem>
      </Menu>

      <FormDialog
        open={open}
        title={editing ? `Edit ${editing.name}` : 'Add an account'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save}>
          {formError && (
            <AlertSlot>
              <Alert severity="error">{formError}</Alert>
            </AlertSlot>
          )}

          <FormGrid>
            <TextField
              label="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Everyday card"
              size="small"
              required
              slotProps={{ htmlInput: { 'data-autofocus': true } }}
            />

            <TextField
              select
              label="Type"
              value={draft.kind}
              onChange={(e) =>
                setDraft({ ...draft, kind: e.target.value as AccountKind })
              }
              size="small"
              disabled={editing !== null}
            >
              {ACCOUNT_KINDS.map((kind) => (
                <MenuItem key={kind.value} value={kind.value}>
                  {kind.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Currency"
              value={draft.currency}
              onChange={(e) =>
                setDraft({ ...draft, currency: e.target.value.toUpperCase() })
              }
              size="small"
              required
              disabled={editing !== null}
              slotProps={{ htmlInput: { maxLength: 3 } }}
            />

            <TextField
              label="Opening balance"
              type="number"
              value={draft.openingBalance}
              onChange={(e) =>
                setDraft({ ...draft, openingBalance: e.target.value })
              }
              size="small"
              required
              slotProps={{ htmlInput: { step: '0.01' } }}
            />
          </FormGrid>

          <FormActions>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? 'Saving' : editing ? 'Save changes' : 'Add account'}
            </Button>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </FormActions>
        </form>
      </FormDialog>
    </>
  );
}
