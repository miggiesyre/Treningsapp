'use client';

import { useActionState } from 'react';
import { authAction, type AuthState } from '@/app/actions/auth';
import { Brand } from './brand';

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(authAction, {});
  const msg = state.msg ?? notice;

  return (
    <form action={action} className="lg-form">
      <Brand />
      <input
        className="lg-in"
        name="email"
        type="email"
        placeholder="E-post"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        defaultValue={state.email}
        required
      />
      <input className="lg-in" name="password" type="password" placeholder="Passord" autoComplete="current-password" required />
      <button className="lg-btn" name="intent" value="login" disabled={pending}>
        Logg inn
      </button>
      <button className="lg-link" name="intent" value="forgot" formNoValidate disabled={pending}>
        Glemt passord?
      </button>
      {msg && (
        <span className="lg-msg" role="status">
          {msg}
        </span>
      )}
    </form>
  );
}
