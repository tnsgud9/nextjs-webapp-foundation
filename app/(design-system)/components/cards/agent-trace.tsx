"use client"

import {
  CheckIcon,
  CircleAlertIcon,
  CircleDashedIcon,
  LoaderCircleIcon,
  SearchIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

export function AgentTrace() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Trace</CardTitle>
        <CardDescription>Deploying release v1.4.0 to production.</CardDescription>
      </CardHeader>
      <CardContent>
        <Trace>
          <TraceLine>
            <TraceIcon>
              <CheckIcon />
            </TraceIcon>
            <TraceTitle>Installed dependencies</TraceTitle>
            <TraceDescription>12s</TraceDescription>
          </TraceLine>
          <TraceCollapsible defaultOpen>
            <TraceCollapsibleTrigger>
              <TraceLine>
                <TraceIcon>
                  <SearchIcon />
                </TraceIcon>
                <TraceTitle>Searched for deprecated APIs</TraceTitle>
                <TraceDescription>3 files</TraceDescription>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
              app/page.tsx, lib/db.ts, proxy.ts
            </TraceCollapsibleContent>
          </TraceCollapsible>
          <TraceLine status="error">
            <TraceIcon>
              <CircleAlertIcon />
            </TraceIcon>
            <TraceTitle>Type check failed</TraceTitle>
            <TraceDescription>2 errors</TraceDescription>
          </TraceLine>
          <TraceLine status="running">
            <TraceIcon>
              <LoaderCircleIcon className="animate-spin" />
            </TraceIcon>
            <TraceTitle>Building static pages</TraceTitle>
          </TraceLine>
          <TraceLine status="pending">
            <TraceIcon>
              <CircleDashedIcon />
            </TraceIcon>
            <TraceTitle>Promote to production</TraceTitle>
          </TraceLine>
        </Trace>
      </CardContent>
    </Card>
  )
}
