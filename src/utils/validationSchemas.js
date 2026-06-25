import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username must be between 3 and 50 characters')
    .max(50, 'Username must be between 3 and 50 characters'),
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank')
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(255, 'Password must be less than 255 characters'),
});

export const profileSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username must be between 3 and 50 characters')
    .max(50, 'Username must be between 3 and 50 characters'),
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank')
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters'),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(255, 'New password must be less than 255 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
