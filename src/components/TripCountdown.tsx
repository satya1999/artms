import { useEffect, useState } from "react";

interface Remaining { days: number; hours: number; minutes: number; seconds: number; done: boolean; }

function remainingTo(target: number): Remaining {
  let ms = target - Date.now();
  const done = ms <= 0;
  if (ms < 0) ms = 0;
  const days = Math.floor(ms / 86_400_000); ms -= days * 86_400_000;
  const hours = Math.floor(ms / 3_600_000); ms -= hours * 3_600_000;
  const minutes = Math.floor(ms / 60_000); ms -= minutes * 60_000;
  const seconds = Math.floor(ms / 1_000);
  return { days, hours, minutes, seconds, done };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-900 text-white rounded-md py-1.5 px-1">
      <span className="text-base font-black leading-none tabular-nums">{String(value).padStart(2, "0")}</span>
      <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

/** Live ticking countdown to a trip's start date (yyyy-mm-dd). */
export function TripCountdown({ date }: { date: string }) {
  const target = new Date(`${date}T00:00:00`).getTime();
  const [t, setT] = useState<Remaining>(() => remainingTo(target));

  useEffect(() => {
    setT(remainingTo(target));
    const id = setInterval(() => setT(remainingTo(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t.done) {
    return (
      <div className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold text-center py-2">
        🚌 Departed / In progress
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      <Unit value={t.days} label="Days" />
      <Unit value={t.hours} label="Hrs" />
      <Unit value={t.minutes} label="Min" />
      <Unit value={t.seconds} label="Sec" />
    </div>
  );
}
