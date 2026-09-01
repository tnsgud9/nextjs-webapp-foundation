"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function Overlays() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overlays</CardTitle>
        <CardDescription>
          Hover{" "}
          <HoverCard>
            <HoverCardTrigger
              href="#"
              className="font-medium text-foreground underline underline-offset-3"
            >
              @sam
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Sam Rivera</div>
                <div className="text-xs text-muted-foreground">
                  Design lead · Joined March 2024
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>{" "}
          or open a panel below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              Popover
            </PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Dimensions</PopoverTitle>
                <PopoverDescription>
                  Set the size of the layer.
                </PopoverDescription>
              </PopoverHeader>
              <div className="grid grid-cols-2 gap-2">
                <Field>
                  <FieldLabel htmlFor="popover-width">Width</FieldLabel>
                  <Input id="popover-width" defaultValue="320" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="popover-height">Height</FieldLabel>
                  <Input id="popover-height" defaultValue="240" />
                </Field>
              </div>
            </PopoverContent>
          </Popover>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
              Sheet
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit profile</SheetTitle>
                <SheetDescription>
                  Changes apply after you save.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4">
                <Field>
                  <FieldLabel htmlFor="sheet-name">Name</FieldLabel>
                  <Input id="sheet-name" defaultValue="Sam Rivera" />
                </Field>
              </div>
              <SheetFooter>
                <Button>Save changes</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Drawer>
            <DrawerTrigger render={<Button variant="outline" />}>
              Drawer
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Daily goal</DrawerTitle>
                <DrawerDescription>
                  Set how many minutes you want to focus each day.
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4 text-center text-5xl font-semibold tabular-nums">
                90
              </div>
              <DrawerFooter>
                <Button>Save</Button>
                <DrawerClose render={<Button variant="outline" />}>
                  Cancel
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
        <ContextMenu>
          <ContextMenuTrigger className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Right-click here
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              Back
              <ContextMenuShortcut>⌘[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              Reload
              <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Inspect</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </CardContent>
    </Card>
  )
}
