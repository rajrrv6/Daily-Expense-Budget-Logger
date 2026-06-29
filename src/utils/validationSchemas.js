import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username must be between 3 and 50 characters.')
    .max(50, 'Username must be between 3 and 50 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username cannot contain spaces or special characters except underscores.'),
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank.')
    .email('Invalid email format.')
    .max(100, 'Email must be less than 100 characters.'),
  firstName: z.string().trim().min(1, 'First name is required.').max(50, 'First name must be less than 50 characters.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(50, 'Last name must be less than 50 characters.'),
  phoneNumber: z.string()
    .trim()
    .min(1, 'Phone number is required.')
    .regex(/^\+?[0-9]{10,15}$/, 'Phone number must be between 10 and 15 digits (optional "+" prefix).'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters.')
    .max(255, 'Password must be less than 255 characters.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.'),
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const profileSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username must be between 3 and 50 characters.')
    .max(50, 'Username must be between 3 and 50 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username cannot contain spaces or special characters except underscores.'),
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank.')
    .email('Invalid email format.')
    .max(100, 'Email must be less than 100 characters.'),
  firstName: z.string().trim().min(1, 'First name is required.').max(50, 'First name must be less than 50 characters.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(50, 'Last name must be less than 50 characters.'),
  phoneNumber: z.string()
    .trim()
    .min(1, 'Phone number is required.')
    .regex(/^\+?[0-9]{10,15}$/, 'Phone number must be between 10 and 15 digits (optional "+" prefix).'),
  monthlyIncome: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ required_error: 'Monthly income is required.', invalid_type_error: 'Monthly income must be a valid number.' })
      .min(0, 'Monthly income cannot be negative.')
  ),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters.')
    .max(255, 'New password must be less than 255 characters.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'New password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.'),
  confirmPassword: z.string().min(1, 'Please confirm your new password.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});
