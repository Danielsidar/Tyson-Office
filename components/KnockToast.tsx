"use client";

type Props = {
  fromName: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingKnockToast({ fromName, onAccept, onDecline }: Props) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[min(95vw,420px)] bg-zinc-900 border border-indigo-500/50 rounded-2xl p-5 shadow-2xl shadow-indigo-500/20 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start gap-4">
        <div className="text-4xl animate-bounce">🚪</div>
        <div className="flex-1">
          <div className="text-sm text-zinc-400">דופק בדלת...</div>
          <div className="text-lg font-bold mt-0.5">{fromName}</div>
          <p className="text-sm text-zinc-300 mt-1">רוצה לדבר איתך</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onDecline}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition font-medium"
        >
          לא עכשיו
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition font-semibold shadow-lg shadow-indigo-500/30"
        >
          פתח דלת
        </button>
      </div>
    </div>
  );
}

export function OutgoingKnockToast({ toName }: { toName: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-40 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="text-2xl animate-pulse">🚪</div>
        <div>
          <div className="text-sm font-medium">דופק בדלת של {toName}...</div>
          <div className="text-xs text-zinc-400">ממתין לתשובה</div>
        </div>
      </div>
    </div>
  );
}
