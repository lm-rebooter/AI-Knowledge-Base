type SectionCardProps = {
  title: string;
  description: string;
};

export function SectionCard({ title, description }: SectionCardProps) {
  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-7 shadow-[0_18px_45px_rgba(31,26,20,0.06)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
    </article>
  );
}
