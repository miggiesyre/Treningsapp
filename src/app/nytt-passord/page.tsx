'use client';

import { useActionState } from 'react';
import { setPassword, type AuthState } from '@/app/actions/auth';
import { Brand } from '../login/brand';

// Reached from the invite e-mail (first password) and the reset e-mail.
export default function NewPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setPassword, {});
  return (
    <div className="lg">
      <form action={action} className="lg-form">
        <Brand />
        <input className="lg-in" name="password" type="password" placeholder="Nytt passord (minst 12 tegn)" autoComplete="new-password" minLength={12} required />
        <input className="lg-in" name="repeat" type="password" placeholder="Gjenta passord" autoComplete="new-password" minLength={12} required />
        <button className="lg-btn" disabled={pending}>
          Lagre passord
        </button>
        {state.msg && (
          <span className="lg-msg" role="status">
            {state.msg}
          </span>
        )}
      </form>
    </div>
  );
}
