import { useEffect, useState } from "react";
import type { Submission } from "../data";
import { loadSubmissions } from "./submissionsStore";

// Reads approved submissions from the shared store (server API when
// available, else localStorage — see submissionsStore.ts) and polls it
// periodically, so an approval made in the admin console — including on a
// different device connected to the same locally-hosted server — shows up
// without needing a full page reload. Shared by the landing-page teaser and
// the dedicated Gallery page.
export function usePublicGallery(): { items: Submission[]; loaded: boolean } {
  const [items, setItems] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const all = await loadSubmissions();
      if (cancelled) return;
      setItems(all.filter((s) => s.status === "approved"));
      setLoaded(true);
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { items, loaded };
}
