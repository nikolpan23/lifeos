"use client";

import { createContext, useContext } from "react";
import type { Space } from "./nav";
import { spaceHref } from "./nav";

const SpaceContext = createContext<Space>("demo");

export const SpaceProvider = SpaceContext.Provider;

export function useSpace(): Space {
  return useContext(SpaceContext);
}

export function useHref() {
  const space = useSpace();
  return (slug = "") => spaceHref(space, slug);
}
