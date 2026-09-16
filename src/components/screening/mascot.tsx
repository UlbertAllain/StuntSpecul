"use client";
import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";

const GREETINGS = [
  "Hai jugaaa!",
  "Mimo senang ketemu kamu!",
  "Yuk, kita mulai!",
];
const HIGH_FIVES = ["Tos! Kamu hebat!", "Tos lagi!", "Terima kasih, teman!"];

export function Mascot({
  pose = "stand",
  interactive = false,
  interaction = "greet",
  className = "",
}: {
  pose?: "stand" | "cheer";
  interactive?: boolean;
  interaction?: "greet" | "high-five";
  className?: string;
}) {
  const [reaction, setReaction] = useState(0);
  const waving = reaction > 0;
  const messages = interaction === "high-five" ? HIGH_FIVES : GREETINGS;
  const image = (
    <Image
      key={`mascot-image-${reaction}`}
      src={`/images/mimo-${waving ? "cheer" : pose}.png`}
      alt={
        interactive
          ? "Mimo, teman pemeriksaan. Sentuh untuk menyapa."
          : "Mimo menemani pemeriksaan"
      }
      draggable={false}
      width={1024}
      height={1024}
    />
  );
  if (!interactive) return <div className={`mascot ${className}`}>{image}</div>;
  return (
    <button
      className={`mascot mascot-button ${className} ${waving ? "waving" : ""}`}
      type="button"
      onClick={() => setReaction((value) => value + 1)}
      aria-label={interaction === "high-five" ? "Tos dengan Mimo" : "Sapa Mimo"}
    >
      {image}
      {waving && (
        <span
          className="reaction-burst"
          key={`reaction-burst-${reaction}`}
          aria-hidden="true"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Star key={`reaction-star-${index}`} />
          ))}
        </span>
      )}
      <span className="mascot-speech" role="status">
        {waving
          ? messages[(reaction - 1) % messages.length]
          : interaction === "high-five"
            ? "Tos di sini!"
            : "Sapa aku, yuk!"}
      </span>
    </button>
  );
}
