import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Card, Field, Input } from '../components/ui'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values.email.trim(), values.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      setServerError((err as { message?: string }).message ?? 'Unable to sign in.')
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-brand-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg">
            LQ
          </div>
          <h1 className="text-2xl font-bold text-white">Laundry CRM</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to manage your store</p>
        </div>

        <Card className="p-5 sm:p-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="owner@demo.laundry"
                {...register('email', { required: 'Email is required' })}
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
            </Field>

            {serverError ? (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                {serverError}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Demo accounts</p>
            <p className="mt-1">owner@demo.laundry · Owner@1234</p>
            <p>admin@demo.laundry · Admin@1234</p>
            <p>manager@demo.laundry · Manager@1234</p>
            <p>staff@demo.laundry · Staff@1234</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
