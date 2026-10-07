import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminDashboard from './dashboard';

export default async function AdminPage() {
    if (!await isAdmin()) redirect('/admin/login');
    return <AdminDashboard />;
}
