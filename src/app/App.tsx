import { createBrowserRouter, RouterProvider } from "react-router";
import { createDatabase } from "../data/db";
import { createDexieRepository } from "../data/dexieRepository";
import { RepositoryContext } from "../data/RepositoryContext";
import { routes } from "./routes";
import { UpdatePrompt } from "./UpdatePrompt";

const router = createBrowserRouter(routes);
const repository = createDexieRepository(createDatabase());

export function App() {
  return (
    <RepositoryContext value={repository}>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </RepositoryContext>
  );
}
