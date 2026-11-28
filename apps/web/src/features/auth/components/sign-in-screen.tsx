import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/field';
import { signIn } from '@/lib/auth/supabase';
import { BRAND } from '@/lib/brand';
import { authCopy as copy } from '../copy';

const signInSchema = z.object({
  email: z.string().trim().pipe(z.email(copy.validEmail)),
  password: z.string().min(1, copy.needPassword),
});

export function SignInScreen() {
  const router = useRouter();
  const [problem, setProblem] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState } = useForm<z.input<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setProblem(undefined);
    const failed = await signIn(email.trim(), password);
    if (failed !== null) {
      setProblem(copy.problems[failed]);
      return;
    }
    await router.navigate({ to: '/', replace: true });
  });

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="feature-surface flex flex-col items-center justify-center gap-4 rounded-b-[2rem] px-6 py-8 text-center lg:rounded-none">
        <img
          src={BRAND.crest}
          alt=""
          width={256}
          height={256}
          className="size-28 drop-shadow-xl lg:size-56"
        />
        <div>
          <p className="text-2xl font-bold lg:text-4xl">{BRAND.schoolName}</p>
          <p className="mt-1 opacity-85">{BRAND.motto}</p>
        </div>
      </div>
      <div className="flex items-start justify-center px-4 py-8 lg:items-center">
        <form onSubmit={(event) => void submit(event)} noValidate className="w-full max-w-sm">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">{copy.title}</h1>
            <Field label={copy.email} error={formState.errors.email?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register('email')}
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                />
              )}
            </Field>
            <Field label={copy.password} error={formState.errors.password?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                />
              )}
            </Field>
            <Checkbox
              label={copy.showPassword}
              checked={showPassword}
              onChange={(event) => {
                setShowPassword(event.target.checked);
              }}
            />
            <FormError message={problem} />
            <Button type="submit" size="lg" busy={formState.isSubmitting}>
              {copy.submit}
            </Button>
            <p className="text-center text-muted-foreground">{copy.forgot}</p>
          </div>
        </form>
      </div>
    </main>
  );
}
