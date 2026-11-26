import { createContext } from 'react';
import type { User } from '../types';

export type AuthValue = {
  user: User | null;
  ready: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
    username?: string
  ) => Promise<void>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthValue | null>(null);
