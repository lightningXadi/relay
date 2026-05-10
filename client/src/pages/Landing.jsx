import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Zap, Shield, Users } from 'lucide-react';

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Landing() {
  return (
    <div className="min-h-dvh bg-surface-root text-ink">
      <header className="border-b border-border/80 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft shadow-chip">
              <MessageCircle className="h-5 w-5 text-accent" aria-hidden />
            </div>
            <span className="text-[15px] font-medium tracking-tight">Relay</span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-ink-soft transition-colors hover:bg-surface-card hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-accent px-3.5 py-2 font-medium text-white shadow-chip transition hover:brightness-110"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-16 md:pt-24">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p
            variants={item}
            className="text-sm font-medium tracking-wide text-accent"
          >
            Team messaging, without the noise
          </motion.p>
          <motion.h1
            variants={item}
            className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl"
          >
            Calm, fast conversations for people who ship.
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-5 text-base leading-relaxed text-ink-soft md:text-lg"
          >
            Relay keeps your threads tight, your UI quiet, and your focus where it matters. Built
            for product teams that want premium polish without the gimmicks.
          </motion.p>
          <motion.div variants={item} className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white shadow-soft transition hover:brightness-110"
            >
              Create free account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-panel px-6 py-3 text-sm font-medium text-ink shadow-chip transition hover:border-accent/40"
            >
              I have an account
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-20 grid gap-4 md:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {[
            {
              Icon: Zap,
              t: 'Real-time sync',
              d: 'Socket-powered delivery with typing cues and receipts that stay out of your way.',
            },
            {
              Icon: Shield,
              t: 'Session-based auth',
              d: 'JWT-backed API with secure hashing and sane defaults so you can deploy confidently.',
            },
            {
              Icon: Users,
              t: 'Direct & groups',
              d: 'Move from a quick DM to a room with your team without switching products.',
            },
          ].map(({ Icon, t, d }) => (
            <div
              key={t}
              className="rounded-2xl border border-border bg-surface-panel p-6 shadow-soft"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card">
                <Icon className="h-5 w-5 text-accent" aria-hidden />
              </div>
              <h2 className="mt-4 text-[15px] font-medium">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-ink-soft">
        Relay — a focused messaging experience.
      </footer>
    </div>
  );
}
