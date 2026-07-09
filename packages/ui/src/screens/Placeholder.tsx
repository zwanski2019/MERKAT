/**
 * Placeholder for screens built in later phases (CLAUDE.md §12). Keeps routing
 * and nav real now; each is replaced by its screen in its owning phase.
 */
export function Placeholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}): JSX.Element {
  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-fg">{title}</h1>
      <p className="text-sm text-muted">
        {title} lands in {phase}.
      </p>
    </div>
  );
}
