export function stationGalleryId(stationName: string): string {
  return `gallery-${stationName.toLowerCase().replace(/\s+/g, "-")}`;
}

export const STATIONS = [
  {
    name: "Maitri",
    region: "Antarctica",
    lat: "70°45'S",
    lon: "11°44'E",
    desc: "India's second Antarctic research station, operational since 1989. Studies atmospheric sciences, biology, and geology in one of Earth's most extreme environments.",
    img: "https://images.unsplash.com/photo-1774776230803-69056b58f72a?w=800&h=500&fit=crop&auto=format",
    color: "#22d3ee",
  },
  {
    name: "Bharati",
    region: "Antarctica",
    lat: "69°24'S",
    lon: "76°11'E",
    desc: "India's newest Antarctic base, established in 2012. A state-of-the-art facility designed for minimal environmental impact and year-round scientific operations.",
    img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=500&fit=crop&auto=format",
    color: "#3b82f6",
  },
  {
    name: "Himadri",
    region: "Arctic, Svalbard",
    lat: "78°55'N",
    lon: "11°56'E",
    desc: "India's Arctic station in Ny-Ålesund, Norway. Investigates climate change, glaciology, and atmospheric phenomena in the high Arctic since 2008.",
    img: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800&h=500&fit=crop&auto=format",
    color: "#06b6d4",
  },
  {
    name: "Himansh",
    region: "Spiti, Himalaya",
    lat: "32°26'N",
    lon: "77°36'E",
    desc: "High-altitude research station at 4,058 m in Himachal Pradesh. Monitors Himalayan glaciers and their critical role in South Asia's freshwater supply.",
    img: "https://images.unsplash.com/photo-1765359743557-0a7c83dd58de?w=800&h=500&fit=crop&auto=format",
    color: "#8b5cf6",
  },
];

export const CONTENT_TYPES = [
  { value: "report", label: "Expedition Report", exts: ".pdf,.doc,.docx" },
  { value: "dataset", label: "Dataset", exts: ".csv,.xlsx,.nc,.zip" },
  { value: "publication", label: "Publication", exts: ".pdf" },
  { value: "photo", label: "Photo / Image", exts: ".jpg,.jpeg,.png,.tiff,.raw" },
  { value: "video", label: "Video", exts: ".mp4,.mov,.avi" },
];

// Maps a CONTENT_TYPES value to the display label used for submission
// "type" fields in the admin review queue (kept short, matches TYPE_ICONS
// keys below).
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  report: "Report",
  dataset: "Dataset",
  publication: "Publication",
  photo: "Photo",
  video: "Video",
};

export const TYPE_ICONS: Record<string, string> = {
  Report: "📄", Dataset: "📊", Photo: "🖼", Video: "🎬", Publication: "📖",
};

// ---------------------------------------------------------------------------
// Submissions — shared between the scientist Upload portal, the Admin
// review queue, and the public site's approved gallery. Persisted to
// localStorage under SUBMISSIONS_STORAGE_KEY so state survives a refresh
// and so the public gallery (rendered in a totally separate view/component
// tree) can pick up approvals made in the Admin console. This is demo-only
// client-side persistence — production would read/write these via a real
// database and the public gallery would subscribe to it, instead of
// re-reading localStorage on mount.

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  title: string;
  station: string;
  type: string;
  year: string;
  author: string;
  uploadedAt: string;
  status: SubmissionStatus;
  fileSize: string;
  fileExt: string;
  aiSummary: string;
  aiCaption: string;
  tags: string[];
  aiModel?: string;
  aiBasis?: string;
  aiFailed?: boolean;
  // Data URL (freshly uploaded demo files) or remote image URL (seed data)
  // used to render an actual photo preview in the admin queue and, once
  // approved, in the public gallery. Omitted for non-image submissions.
  previewUrl?: string;
}

export const SUBMISSIONS_STORAGE_KEY = "polarlink_demo_submissions";

export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: "SUB-2024-0041",
    title: "Ice Core Analysis — Maitri Summer Campaign",
    station: "Maitri", type: "Report", year: "2024",
    author: "Dr. Priya Nair", uploadedAt: "2024-11-18 09:42",
    status: "pending", fileSize: "4.2 MB", fileExt: "PDF",
    aiSummary: "This expedition report documents glaciological observations during the 2024 summer campaign at Maitri Station. Ice core samples collected at depths of 12–85 m show accelerated melt rates of 0.3 m/yr above the 2010–2020 baseline, with temperature anomalies consistent with global warming trends.",
    aiCaption: "🧊 India's Maitri Station scientists have uncovered alarming new data on polar ice melt. The 2024 summer campaign reveals ice core temperatures 1.8°C above the decade baseline — a critical signal for global climate models. #IndiaScience #PolarResearch #NCPOR #ClimateChange #AntarcticScience",
    tags: ["glaciology", "ice-core", "climate", "antarctica"],
  },
  {
    id: "SUB-2024-0039",
    title: "Atmospheric CO₂ Monitoring Dataset — Q3 2024",
    station: "Himadri", type: "Dataset", year: "2024",
    author: "Dr. Sneha Rao", uploadedAt: "2024-11-14 14:10",
    status: "pending", fileSize: "18.7 MB", fileExt: "CSV",
    aiSummary: "Quarterly atmospheric dataset from Ny-Ålesund Arctic Observatory covering July–September 2024. Measurements include CO₂ concentration (ppm), methane, black carbon aerosols, and ozone layer depth recorded at 15-minute intervals across 2,184 data points.",
    aiCaption: "📡 Arctic air doesn't lie. Our Himadri Station in Svalbard has captured 90 days of pristine Arctic atmospheric data — CO₂, methane, and aerosols at 15-minute resolution. Vital baselines for climate science. #ArcticScience #IndiaResearch #NCPOR #ClimateData",
    tags: ["atmosphere", "CO2", "arctic", "dataset"],
  },
  {
    id: "SUB-2024-0036",
    title: "Himalayan Glacier Retreat Photographic Survey",
    station: "Himansh", type: "Photo", year: "2024",
    author: "Dr. Vikram Singh", uploadedAt: "2024-11-08 11:55",
    status: "approved", fileSize: "312 MB", fileExt: "ZIP",
    aiSummary: "A collection of 847 high-resolution photographs documenting glacier terminus positions across the Spiti Valley from June–October 2024. Comparative imagery with 2010 baselines shows visible retreat of 340 m in the Shigri Glacier and 210 m in the Gepang Gath Glacier.",
    aiCaption: "📷 Pictures speak louder than data alone. Our Himansh researchers captured 847 images of Himalayan glacier retreat in 2024 — some glaciers have lost over 340m in 14 years. Seeing is believing. #Himalayas #GlacierRetreat #IndiaClimate #NCPOR",
    tags: ["glacier", "photography", "himalaya", "retreat"],
    previewUrl: "https://images.unsplash.com/photo-1765359743557-0a7c83dd58de?w=800&h=600&fit=crop&auto=format",
  },
  {
    id: "SUB-2024-0033",
    title: "Bharati Station Annual Scientific Report 2024",
    station: "Bharati", type: "Publication", year: "2024",
    author: "Dr. Arjun Mehta", uploadedAt: "2024-10-30 08:20",
    status: "rejected", fileSize: "9.1 MB", fileExt: "PDF",
    aiSummary: "Comprehensive annual report from Bharati Station covering oceanographic surveys, marine biology observations, meteorological data, and logistical operations for calendar year 2024.",
    aiCaption: "📖 A year at the edge of the world. Bharati Station's 2024 annual report is a complete record of Indian science at the frontiers of Antarctica — ocean, atmosphere, and life itself. #Antarctica #BharatiStation #IndiaScience",
    tags: ["annual-report", "oceanography", "antarctica", "bharati"],
  },
];
