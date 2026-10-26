"use client";

import { createContext, useContext } from "react";

export interface AccountApi {
  email: string | null;
  /** Whether the server has an Anthropic API key configured. */
  aiConfigured: boolean;
  signOut(): Promise<void>;
  /** Permanently deletes the account and all data. Requires the current password. */
  deleteAccount?: (password: string) => Promise<void>;
}

const AccountContext = createContext<AccountApi>({ email: null, aiConfigured: false, signOut: async () => {} });

export const AccountProvider = AccountContext.Provider;

export function useAccount(): AccountApi {
  return useContext(AccountContext);
}
