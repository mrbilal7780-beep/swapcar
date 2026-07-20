import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/events/new")({
  component: EventsNewRedirect,
});

// La création d'événements est maintenant dans /map
function EventsNewRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/map" } as any);
  }, []);
  return null;
}