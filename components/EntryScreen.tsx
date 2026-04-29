"use client";

import { useState } from "react";

const EMOJI_OPTIONS = [
  "🦊", "🐼", "🐸", "🦁", "🐧", "🐻", "🦄", "🐶",
  "🐱", "🐯", "🐨", "🦉", "🦋", "🐙", "🦖", "🐵",
];

const COLORS = [
  "from-pink-500 to-rose-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-indigo-500",
  "from-fuchsia-500 to-purple-500",
  "from-lime-500 to-green-500",
];

type Props = {
  onEnter: (name: string, avatar: string) => void;
};

export function EntryScreen({ onEnter }: Props) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(EMOJI_OPTIONS[0]);
  const colorIndex = Math.abs(hashCode(name)) % COLORS.length;
  const ringColor = COLORS[colorIndex];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    onEnter(trimmed, avatar);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur rounded-3xl p-8 border border-zinc-800 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br ${ringColor} flex items-center justify-center text-5xl shadow-lg mb-4 transition-all`}
          >
            {avatar}
          </div>
          <h1 className="text-3xl font-bold">המשרד הדיגיטלי</h1>
          <p className="text-zinc-400 mt-2 text-center">
            תיכנס, שב בקוביה שלך, ותתחיל לעבוד
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">
              איך קוראים לך?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="השם שלך"
              autoFocus
              maxLength={20}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">
              בחר אווטאר
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`text-2xl aspect-square rounded-lg flex items-center justify-center transition ${
                    avatar === e
                      ? "bg-indigo-500/30 ring-2 ring-indigo-400"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={name.trim().length < 2}
            className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-xl text-lg shadow-lg shadow-indigo-500/30"
          >
            הכנס למשרד
          </button>
        </form>
      </div>
    </div>
  );
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
