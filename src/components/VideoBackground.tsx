import { useEffect, useRef, useState } from "react";

const VIDEOS = ["/videos/torque-bg-1.mp4", "/videos/torque-bg-2.mp4", "/videos/torque-bg-3.mp4"];

/**
 * Fond vidéo plein écran qui enchaîne les 3 clips en boucle avec un
 * fondu enchaîné, muted/autoplay pour respecter les politiques navigateur.
 */
export function VideoBackground({ opacity = 0.45 }: { opacity?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    videoRefs.current[activeIndex]?.play().catch(() => {});
  }, [activeIndex]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
      {VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={(el) => { videoRefs.current[i] = el; }}
          src={src}
          muted
          playsInline
          preload={i === 0 ? "auto" : "none"}
          onEnded={() => setActiveIndex((activeIndex + 1) % VIDEOS.length)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === activeIndex ? opacity : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
    </div>
  );
}
