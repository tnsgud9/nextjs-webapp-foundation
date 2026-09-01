import { type Metadata } from "next"

import DesignSystemShowcase from "@/app/(design-system)/components/showcase"


export const metadata: Metadata = {
  title: "Design System",
  description:
    "Design system page: the project's UI components at a glance.",
}

export default function DesignSystemPage() {
  return (
    <DesignSystemShowcase />
  )
}
