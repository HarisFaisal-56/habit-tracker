import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { createDatabase } from "../data/db";
import { createDexieRepository } from "../data/dexieRepository";
import type { HabitRepository } from "../data/repository";
import { RepositoryContext } from "../data/RepositoryContext";

/** A repository backed by a fresh in-memory IndexedDB. */
export function createTestRepository(): HabitRepository {
  return createDexieRepository(
    createDatabase("test", { indexedDB: new IDBFactory(), IDBKeyRange }),
  );
}

/** Renders the real app routes at `path` with the given (or a fresh) repository. */
export function renderApp(path = "/", repository = createTestRepository()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  render(
    <RepositoryContext value={repository}>
      <RouterProvider router={router} />
    </RepositoryContext>,
  );
  return { router, repository, user };
}
