"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import type { Session } from "@/lib/auth/session";
import { loadNotes } from "./notesPersistence";
import { notesHydrated } from "./notesSlice";
import { makeStore } from "./store";

export function StoreProvider({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const [store] = useState(() => makeStore({ auth: { session } }));
  // localStorage only exists in the browser, so notes load after hydration.
  useEffect(() => {
    if (session) store.dispatch(notesHydrated(loadNotes(session.sub)));
  }, [store, session]);
  return <Provider store={store}>{children}</Provider>;
}
