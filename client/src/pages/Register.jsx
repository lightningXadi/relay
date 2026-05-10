import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ username, email, password });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.data?.error || err.message || 'Could not register');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-root px-5 py-10 text-ink">
      <div className="mx-auto w-full max-w-md flex-1">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">
            <MessageCircle className="h-4 w-4 text-accent" aria-hidden />
          </div>
          Relay
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10"
        >
          <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
          <p className="mt-2 text-sm text-ink-soft">It takes a minute. No credit card theatre.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-ink-soft">
                Display name
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={32}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-panel px-3.5 py-2.5 text-sm text-ink outline-none ring-accent/30 transition focus:border-accent/50 focus:ring-2"
                placeholder="Alex Chen"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-soft">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-panel px-3.5 py-2.5 text-sm text-ink outline-none ring-accent/30 transition focus:border-accent/50 focus:ring-2"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-ink-soft">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-panel px-3.5 py-2.5 text-sm text-ink outline-none ring-accent/30 transition focus:border-accent/50 focus:ring-2"
              />
              <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white shadow-soft transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-soft">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
