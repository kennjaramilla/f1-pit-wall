import { createSlice } from "@reduxjs/toolkit";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Session } from "@/lib/auth/session";

export interface AuthState {
  session: Session | null;
}

/** Read-only on the client: the session is preloaded from the verified cookie on the server. */
export const authSlice = createSlice({
  name: "auth",
  initialState: { session: null } as AuthState,
  reducers: {},
  selectors: {
    selectSession: (s) => s.session,
    selectCan: (s, permission: Permission) => can(s.session?.role, permission),
  },
});

export const { selectSession, selectCan } = authSlice.selectors;
