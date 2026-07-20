import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/events/")({
  component: EventsRedirect,
});

// Les événements sont maintenant gérés dans /map
function EventsRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/map" } as any);
  }, []);
  return null;
}