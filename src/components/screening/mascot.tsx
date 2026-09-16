"use client";

import Image from "next/image";
import { useState } from "react";

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
  const reacted = reaction > 0;
  const messages = interaction === "high-five" ? HIGH_FIVES : GREETINGS;

  const image = (
    <Image
      key={`mascot-image-${reaction}`}
      src={`/images/mimo-${reacted ? "cheer" : pose}.png`}
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
      className={`mascot mascot-button ${className} ${reacted ? "waving" : ""}`}
      type="button"
      onClick={() => setReaction((value) => value + 1)}
      aria-label={interaction === "high-five" ? "Tos dengan Mimo" : "Sapa Mimo"}
    >
      {image}
      <span className="mascot-speech" role="status">
        {reacted
          ? messages[(reaction - 1) % messages.length]
          : interaction === "high-five"
            ? "Tos di sini!"
            : "Sapa aku, yuk!"}
      </span>
    </button>
  );
}
