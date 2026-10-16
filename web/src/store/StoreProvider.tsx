"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import type { Session } from "@/lib/auth/session";
import { makeStore } from "./store";

export function StoreProvider({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const [store] = useState(() => makeStore({ auth: { session } }));
  return <Provider store={store}>{children}</Provider>;
}
