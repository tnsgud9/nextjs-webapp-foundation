"use client"

import * as React from "react"
import { FileIcon, SettingsIcon, UserIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

const PAGE_COUNT = 8

export function NavigationPatterns() {
  const [page, setPage] = React.useState(1)
  const [showGrid, setShowGrid] = React.useState(true)

  const goTo = (next: number) => (event: React.MouseEvent) => {
    event.preventDefault()
    setPage(Math.min(PAGE_COUNT, Math.max(1, next)))
  }
  const start = Math.min(PAGE_COUNT - 2, Math.max(1, page - 1))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New tab <MenubarShortcut>⌘T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                New window <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Print</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                checked={showGrid}
                onCheckedChange={setShowGrid}
              >
                Show grid
              </MenubarCheckboxItem>
              <MenubarItem>Zoom in</MenubarItem>
              <MenubarItem>Zoom out</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Guides</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-56 gap-1">
                  {["Getting started", "Theming", "Accessibility"].map(
                    (title) => (
                      <li key={title}>
                        <NavigationMenuLink href="#">{title}</NavigationMenuLink>
                      </li>
                    )
                  )}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#">Changelog</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Command className="rounded-lg border">
          <CommandInput placeholder="Type a command..." />
          <CommandList className="max-h-40">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <FileIcon />
                New document
              </CommandItem>
              <CommandItem>
                <UserIcon />
                Profile
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>
                <SettingsIcon />
                Preferences
                <CommandShortcut>⌘,</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={goTo(page - 1)} />
            </PaginationItem>
            {[start, start + 1, start + 2].map((number) => (
              <PaginationItem key={number}>
                <PaginationLink
                  href="#"
                  isActive={page === number}
                  onClick={goTo(number)}
                >
                  {number}
                </PaginationLink>
              </PaginationItem>
            ))}
            {start + 2 < PAGE_COUNT && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext href="#" onClick={goTo(page + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardContent>
    </Card>
  )
}
