// Route group placeholder — actual app routes are nested files.
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => <Outlet />,
});
