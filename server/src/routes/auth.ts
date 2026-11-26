import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { users } from '../db/schema.js';
import { requireAuth, signToken } from '../auth.js';

export const authRouter = Router();

const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your full name.')
  .max(120)
  .refine(
    (name) => name.split(/\s+/).filter(Boolean).length >= 2,
    'Enter at least first and family name.'
  );

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email.')
  .email('Enter a valid email address.')
  .max(254);

const optionalUsernameSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z
    .string()
    .trim()
    .min(3, 'Username needs at least 3 characters.')
    .max(40)
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Use letters, numbers, dots, dashes or underscores.'
    )
    .optional()
);

const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  username: optionalUsernameSchema,
  password: z
    .string()
    .min(15, 'Password must be at least 15 characters long.')
    .max(64, 'Password must not exceed 64 characters.'),
});

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Enter your email or username.'),
  password: z.string().min(1, 'Enter your password.'),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { fullName, email, username, password } = parsed.data;

    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    if (existingEmail) {
      return res
        .status(409)
        .json({ error: 'An account with that email already exists.' });
    }

    if (username) {
      const [existingUsername] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1);

      if (existingUsername) {
        return res
          .status(409)
          .json({ error: 'That username is taken. Pick another.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        fullName,
        email: email.toLowerCase(),
        username: username ?? null,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
      });

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
    };
    res.status(201).json({ token: signToken(authUser), user: authUser });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const login = parsed.data.login;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(
        or(
          sql`lower(${users.email}) = lower(${login})`,
          sql`lower(${users.username}) = lower(${login})`
        )
      )
      .limit(1);

    const ok = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;
    if (!user || !ok) {
      return res
        .status(401)
        .json({ error: 'That email or username and password do not match.' });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
    };
    res.json({ token: signToken(authUser), user: authUser });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
