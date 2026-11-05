import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Alert, Button, Field, Input } from '../../components/ui'
import { api } from '../../lib/api'
import { applyServerErrors } from '../../lib/forms'
import { toast } from '../../stores/toast'
import { safeNext } from './guards'
import { useLogin, useRegister } from './hooks'

/* Login ------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean().optional(),
})
type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const { register, handleSubmit, setError, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit((values) =>
    login.mutateAsync(values).then(
      () => navigate(safeNext(params.get('next')), { replace: true }),
      (error) => applyServerErrors(error, setError, ['email', 'password']),
    ),
  )

  return (
    <>
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back. Pick up where you left off.</p>

      {params.get('verified') && (
        <div className="mt-4">
          <Alert tone="success">Your email is verified. Log in to continue.</Alert>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!formState.errors.password} {...register('password')} />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input type="checkbox" className="rounded border-slate-300" {...register('remember')} /> Keep me signed in
          </label>
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  )
}

/* Register ---------------------------------------------------------------- */

const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name.').max(120),
    email: z.email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'Passwords do not match.' })
type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const registerUser = useRegister()
  const { register, handleSubmit, setError, formState } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = handleSubmit((values) =>
    registerUser.mutateAsync(values).then(
      () => {
        toast.success('Account created. Check your email for a verification link.')
        navigate(safeNext(params.get('next')), { replace: true })
      },
      (error) => applyServerErrors(error, setError, ['name', 'email', 'password', 'password_confirmation']),
    ),
  )

  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">One account for learning, teaching and every organisation you join.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Full name" htmlFor="name" error={formState.errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={!!formState.errors.name} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={formState.errors.password?.message} hint="At least 8 characters, with a letter and a number.">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!formState.errors.password} {...register('password')} />
        </Field>
        <Field label="Confirm password" htmlFor="password_confirmation" error={formState.errors.password_confirmation?.message}>
          <Input
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!formState.errors.password_confirmation}
            {...register('password_confirmation')}
          />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </>
  )
}

/* Forgot password --------------------------------------------------------- */

const forgotSchema = z.object({ email: z.email('Enter a valid email address.') })

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = handleSubmit((values) =>
    api.post('/auth/forgot-password', values).then(
      () => setSent(true),
      (error) => applyServerErrors(error, setError, ['email']),
    ),
  )

  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      {sent ? (
        <div className="mt-4 space-y-4">
          <Alert tone="success">If that email has an account, a reset link is on its way. It expires in 60 minutes.</Alert>
          <Link to="/login" className="block text-center text-sm font-medium text-brand-700 hover:underline">
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">Enter your email and we'll send you a link.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
            </Field>
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>
              Send reset link
            </Button>
          </form>
        </>
      )}
    </>
  )
}

/* Reset password ---------------------------------------------------------- */

const resetSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.').regex(/[A-Za-z]/, 'Include a letter.').regex(/\d/, 'Include a number.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'Passwords do not match.' })

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) })

  const onSubmit = handleSubmit((values) =>
    api.post('/auth/reset-password', { ...values, token, email }).then(
      () => {
        toast.success('Password changed. You can log in now.')
        navigate('/login')
      },
      (error) => applyServerErrors(error, setError, ['password', 'password_confirmation']),
    ),
  )

  if (!token || !email) {
    return <Alert tone="error" title="This link is incomplete">Open the reset link from your email again, or request a new one.</Alert>
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-600">For {email}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="New password" htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Confirm new password" htmlFor="password_confirmation" error={formState.errors.password_confirmation?.message}>
          <Input id="password_confirmation" type="password" autoComplete="new-password" {...register('password_confirmation')} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Save password
        </Button>
      </form>
    </>
  )
}
