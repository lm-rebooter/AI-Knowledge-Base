type SectionCardProps = {
  title: string;
  description: string;
};

export function SectionCard({ title, description }: SectionCardProps) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_14px_30px_rgba(31,26,20,0.05)] backdrop-blur transition duration-300 hover:bg-white">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </article>
  );
}
