import { useState, type FormEvent } from 'react';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { LogoMark } from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { Lede, PageTitle } from '../styles/shared.styles';
import {
  validateEmail,
  validateFullName,
  validateLogin,
  validateOptionalUsername,
  validatePassword,
} from '../utils/authValidation';
import {
  AsideWordmark,
  AuthAside,
  AuthForm,
  AuthNote,
  AuthPage,
  AuthPanel,
  AuthPitch,
  AuthSwitch,
} from './Login.styles';

export function Login() {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signingUp = mode === 'signup';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (signingUp) {
      const nameError = validateFullName(fullName);
      const emailError = validateEmail(email);
      const usernameError = validateOptionalUsername(username);
      const passwordError = validatePassword(password, true);
      const validationError =
        nameError ?? emailError ?? usernameError ?? passwordError;
      if (validationError) {
        setError(validationError);
        return;
      }
    } else {
      const loginError = validateLogin(login);
      const passwordError = validatePassword(password, false);
      const validationError = loginError ?? passwordError;
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setBusy(true);
    try {
      if (signingUp) {
        const trimmedUsername = username.trim();
        await register(
          fullName.trim(),
          email.trim(),
          password,
          trimmedUsername || undefined
        );
      } else {
        await signIn(login.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPage>
      <AuthAside component="aside">
        <AsideWordmark>
          <LogoMark size={32} />
          <Typography component="span" className="aside-wordmark-text">
            MyFi
          </Typography>
        </AsideWordmark>

        <div className="m-auto">
          <AuthPitch component="h1">Every euro, accounted for.</AuthPitch>
          <AuthNote>
            Log what you spend and what comes in, and MyFi works out where
            each account actually stands.
          </AuthNote>
        </div>
      </AuthAside>

      <AuthPanel component="main">
        <AuthForm onSubmit={handleSubmit}>
          <div>
            <PageTitle component="h2">
              {signingUp ? 'Create your account' : 'Welcome back'}
            </PageTitle>
            <Lede variant="body2">
              {signingUp
                ? 'Then add accounts and categories when you are ready.'
                : 'Sign in with your email or username.'}
            </Lede>
          </div>

          {error && <Alert severity="error">{error}</Alert>}

          {signingUp && (
            <TextField
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="First and family name"
              size="small"
              fullWidth
            />
          )}

          {signingUp ? (
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              size="small"
              fullWidth
            />
          ) : (
            <TextField
              label="Email or username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              size="small"
              fullWidth
            />
          )}

          {signingUp && (
            <TextField
              label="Username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              size="small"
              fullWidth
            />
          )}

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      onClick={() => setShowPassword((on) => !on)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button type="submit" variant="contained" disabled={busy} fullWidth>
            {busy ? 'One moment' : signingUp ? 'Create account' : 'Sign in'}
          </Button>

          <AuthSwitch>
            {signingUp ? 'Already have an account? ' : 'New to MyFi? '}
            <Link
              component="button"
              type="button"
              onClick={() => {
                setMode(signingUp ? 'signin' : 'signup');
                setError('');
              }}
            >
              {signingUp ? 'Sign in' : 'Create one'}
            </Link>
          </AuthSwitch>
        </AuthForm>
      </AuthPanel>
    </AuthPage>
  );
}