import { type Metadata } from "next"
import { notFound } from "next/navigation"

import DesignSystemShowcase from "@/app/(design-system)/components/showcase"
import { isDesignSystemEnabled } from "@/config/env"


export const metadata: Metadata = {
  title: "Design System",
  description:
    "Design system page: the project's UI components at a glance.",
}

export default function DesignSystemPage() {
  // Not exposed in production; isDesignSystemEnabled in config/env.ts decides when it opens.
  if (!isDesignSystemEnabled) notFound()

  return (
    <DesignSystemShowcase />
  )
}
