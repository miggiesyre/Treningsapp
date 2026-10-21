import { redirect } from 'next/navigation';

// Middleware sends logged-in users to their role's home; this is only a fallback.
export default function Root() {
  redirect('/login');
}
