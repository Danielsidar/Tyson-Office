"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl
  ? new ConvexReactClient(convexUrl)
  : (null as unknown as ConvexReactClient);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Convex לא מוגדר</h1>
          <p className="opacity-80">
            צריך להריץ <code className="bg-zinc-800 px-2 py-1 rounded">npx convex dev</code>{" "}
            ולוודא ש-NEXT_PUBLIC_CONVEX_URL נמצא ב-.env.local
          </p>
        </div>
      </div>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
