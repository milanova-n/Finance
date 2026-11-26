export function validateFullName(fullName: string): string | null {
  const trimmed = fullName.trim();
  if (!trimmed) return 'Enter your full name.';
  if (trimmed.split(/\s+/).filter(Boolean).length < 2) {
    return 'Enter at least first and family name.';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validateOptionalUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return null;
  if (trimmed.length < 3) return 'Username needs at least 3 characters.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return 'Use letters, numbers, dots, dashes or underscores.';
  }
  return null;
}

export function validatePassword(
  password: string,
  signingUp: boolean
): string | null {
  if (!password) return 'Enter your password.';

  if (signingUp && password.length < 15) {
    return 'Password must be at least 15 characters long.';
  }

  if (signingUp && password.length > 64) {
    return 'Password must not exceed 64 characters.';
  }

  return null;
}

export function validateLogin(login: string): string | null {
  if (!login.trim()) return 'Enter your email or username.';
  return null;
}