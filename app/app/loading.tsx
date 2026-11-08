export default function Loading() {
  return (
    <div className="animate-pulse px-4 pt-4">
      <div className="h-3 w-24 rounded bg-zinc-200" />
      <div className="mt-2 h-6 w-40 rounded bg-zinc-200" />
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[74px] rounded-2xl border border-zinc-200/80 bg-white"
          />
        ))}
      </div>
      <div className="mt-5 h-40 rounded-2xl border border-zinc-200/80 bg-white" />
      <div className="mt-5 h-32 rounded-2xl border border-zinc-200/80 bg-white" />
    </div>
  );
}
