import { permanentRedirect } from "next/navigation"

/** Legacy URL: the app now lives at `/discord`. */
export default function DashboardLegacy() {
  permanentRedirect("/discord")
}
