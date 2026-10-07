import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin-auth';
import AdminLoginForm from './login-form';

export const metadata = { robots: { index: false, follow: false } };

export default async function HiddenAdminLoginPage() {
    if (await isAdmin()) redirect('/admin');
    return <main className="login-shell"><section className="login-card">
        <div className="login-brand"><span>V</span><div><b>Valgo Admin</b><small>Private management console</small></div></div>
        <h1>Welcome back</h1>
        <p>Enter the administrator password to manage scans and daily picks.</p>
        <AdminLoginForm />
        <Link className="public-link" href="/">← View public returns</Link>
    </section></main>;
}
