export function ConversationSkeleton() {
  return (
    <div className="space-y-2 px-3 py-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="h-11 w-11 shrink-0 rounded-full bg-surface-card" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-surface-card" />
            <div className="h-3 w-full rounded bg-surface-card/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-4 w-24 animate-pulse rounded bg-surface-card" />
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
          <div
            className="h-16 max-w-[70%] animate-pulse rounded-2xl bg-surface-card"
            style={{ width: `${50 + i * 10}%` }}
          />
        </div>
      ))}
    </div>
  );
}
