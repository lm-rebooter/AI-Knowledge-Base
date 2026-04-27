type SectionCardProps = {
  title: string;
  description: string;
};

export function SectionCard({ title, description }: SectionCardProps) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
    </article>
  );
}
