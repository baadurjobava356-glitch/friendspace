import { permanentRedirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  void children

  permanentRedirect("/")
}
