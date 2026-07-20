import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/events/$id")({
  component: EventDetailRedirect,
});

// Les détails d'événements sont maintenant dans /map
function EventDetailRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/map" } as any);
  }, []);
  return null;
}