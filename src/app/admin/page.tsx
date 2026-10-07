import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminDashboard from './dashboard';

export default async function AdminPage() {
    if (!await isAdmin()) notFound();
    return <AdminDashboard />;
}
