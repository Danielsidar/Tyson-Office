"use client";

type User = {
  sessionId: string;
  name: string;
  avatar: string;
  cubicleIndex: number;
  inCallWith: string | null;
};

type Props = {
  users: User[];
  mySessionId: string;
  onKnock: (sessionId: string) => void;
  totalCubicles?: number;
};

const GRID_COLS = 6;

export function OfficeMap({
  users,
  mySessionId,
  onKnock,
  totalCubicles = 24,
}: Props) {
  const userByCubicle = new Map<number, User>();
  for (const u of users) userByCubicle.set(u.cubicleIndex, u);

  return (
    <div className="w-full h-full p-6 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Office "floor" */}
        <div
          className="relative bg-zinc-900 rounded-3xl p-6 shadow-inner border border-zinc-800"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 14px)",
          }}
        >
          {/* Header strip - meeting room placeholder */}
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/40 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏢</div>
              <div>
                <div className="font-semibold">חדר ישיבות</div>
                <div className="text-xs text-zinc-400">בקרוב</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">בפיתוח</div>
          </div>

          {/* Cubicles grid */}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalCubicles }).map((_, i) => {
              const user = userByCubicle.get(i);
              return (
                <Cubicle
                  key={i}
                  index={i}
                  user={user}
                  isMine={user?.sessionId === mySessionId}
                  onKnock={() => user && onKnock(user.sessionId)}
                />
              );
            })}
          </div>
        </div>

        {/* Online list */}
        <div className="mt-4 text-sm text-zinc-400 text-center">
          {users.length} {users.length === 1 ? "עובד" : "עובדים"} במשרד עכשיו
        </div>
      </div>
    </div>
  );
}

function Cubicle({
  index,
  user,
  isMine,
  onKnock,
}: {
  index: number;
  user: User | undefined;
  isMine: boolean;
  onKnock: () => void;
}) {
  if (!user) {
    return (
      <div className="aspect-square rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-700 text-xs select-none">
        קוביה {index + 1}
      </div>
    );
  }

  const inCall = !!user.inCallWith;
  const baseClasses = isMine
    ? "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/40"
    : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 cursor-pointer";

  return (
    <button
      type="button"
      disabled={isMine || inCall}
      onClick={onKnock}
      title={
        isMine
          ? "זה אתה"
          : inCall
            ? `${user.name} בשיחה`
            : `דפוק בדלת של ${user.name}`
      }
      className={`relative aspect-square rounded-2xl border-2 ${baseClasses} flex flex-col items-center justify-center transition select-none disabled:cursor-not-allowed`}
    >
      <div className="text-4xl mb-1">{user.avatar}</div>
      <div className="text-xs font-medium px-1 truncate max-w-full">
        {user.name}
      </div>
      {isMine && (
        <div className="absolute top-1 right-1 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded">
          אתה
        </div>
      )}
      {inCall && !isMine && (
        <div className="absolute top-1 right-1 text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded animate-pulse">
          בשיחה
        </div>
      )}
      {!isMine && !inCall && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-zinc-900/80 opacity-0 hover:opacity-100 transition">
          <div className="text-sm font-semibold">דפוק בדלת 🚪</div>
        </div>
      )}
    </button>
  );
}
