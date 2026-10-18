import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/pre-test")({
  component: () => <Navigate to="/kiem-tra-dau-vao" replace />,
});
