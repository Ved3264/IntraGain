'use client';

import { useState, type FormEvent } from 'react';
import { ADMIN_LOGIN_API } from '@/lib/admin-route';

export default function AdminLoginForm() {
    const [pending, setPending] = useState(false);
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        const password = new FormData(form).get('password');
        setPending(true);
        setError('');
        try {
            const response = await fetch(ADMIN_LOGIN_API, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }), signal: AbortSignal.timeout(30_000),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
            form.reset();
            window.location.replace('/admin');
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to sign in.');
            setPending(false);
        }
    }

    return <form className="login-form" onSubmit={submit}>
        <label htmlFor="admin-password">Password</label>
        <div className="login-password-field">
            <input id="admin-password" name="password" type={show ? 'text' : 'password'} required maxLength={256}
                autoComplete="current-password" autoCapitalize="none" spellCheck={false} disabled={pending} />
            <button type="button" onClick={() => setShow(value => !value)} disabled={pending}>{show ? 'Hide' : 'Show'}</button>
        </div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="btn login-submit" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Open admin dashboard'}</button>
    </form>;
}
