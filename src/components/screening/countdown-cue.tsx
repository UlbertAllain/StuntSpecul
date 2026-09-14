import { Check, Pause } from "lucide-react";

/** A visual cue for holding a pose, independent of sensor readings. */
export function CountdownCue({
  remaining,
  paused,
}: {
  remaining: number;
  paused: boolean;
}) {
  return (
    <div className="countdown-cue" aria-label="Panduan tahan posisi">
      <span className="countdown-caption">
        {paused
          ? "Kita jeda dulu"
          : remaining > 3
            ? "Tahan posisi, ya…"
            : "Sedikit lagi…"}
      </span>
      <div className="countdown-beads" aria-hidden="true">
        {[3, 2, 1].map((number) => (
          <span
            key={number}
            className={
              remaining < number
                ? "passed"
                : remaining === number
                  ? "active"
                  : ""
            }
          >
            {remaining < number ? (
              <Check size={18} />
            ) : paused && remaining === number ? (
              <Pause size={18} />
            ) : (
              number
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
