"use client";

import { SceneResetProvider } from "@/contexts/SceneResetContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SceneResetProvider>{children}</SceneResetProvider>;
}
