"use client"

import * as React from "react"
import { ChevronsUpDownIcon, PilcrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DirectionProvider, useDirection } from "@/components/ui/direction"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"

const TAGS = Array.from({ length: 24 }, (_, index) => `v1.${24 - index}.0`)

function DirectionLabel() {
  const direction = useDirection()
  return (
    <span className="text-xs text-muted-foreground uppercase">{direction}</span>
  )
}

export function LayoutPanels() {
  const [rtl, setRtl] = React.useState(false)
  const direction = rtl ? "rtl" : "ltr"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layout</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ResizablePanelGroup className="h-36 rounded-lg border">
          <ResizablePanel defaultSize="40">
            <div className="flex h-full items-center justify-center text-sm">
              Sidebar
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="60">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="50">
                <div className="flex h-full items-center justify-center text-sm">
                  Editor
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="50">
                <div className="flex h-full items-center justify-center text-sm">
                  Console
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
        <ScrollArea className="h-32 rounded-lg border">
          <div className="p-3">
            <div className="mb-2 text-sm font-medium">Tags</div>
            {TAGS.map((tag, index) => (
              <React.Fragment key={tag}>
                {index > 0 && <Separator className="my-2" />}
                <div className="text-sm">{tag}</div>
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
        <Collapsible className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">3 pinned items</span>
            <CollapsibleTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <ChevronsUpDownIcon />
              <span className="sr-only">Toggle</span>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md border px-3 py-2 text-sm">Roadmap</div>
          <CollapsibleContent className="flex flex-col gap-2">
            <div className="rounded-md border px-3 py-2 text-sm">Backlog</div>
            <div className="rounded-md border px-3 py-2 text-sm">Releases</div>
          </CollapsibleContent>
        </Collapsible>
        <DirectionProvider direction={direction}>
          <div dir={direction} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Text direction</span>
              <div className="flex items-center gap-2">
                <DirectionLabel />
                <Toggle
                  variant="outline"
                  size="sm"
                  pressed={rtl}
                  onPressedChange={setRtl}
                  aria-label="Right to left"
                >
                  <PilcrowRightIcon />
                </Toggle>
              </div>
            </div>
            <Slider defaultValue={[30]} max={100} aria-label="Volume" />
          </div>
        </DirectionProvider>
      </CardContent>
    </Card>
  )
}
