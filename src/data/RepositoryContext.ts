import { createContext, useContext } from "react";
import type { HabitRepository } from "./repository";

export const RepositoryContext = createContext<HabitRepository | null>(null);

export function useRepository(): HabitRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error("useRepository must be used inside a RepositoryContext provider");
  }
  return repository;
}
