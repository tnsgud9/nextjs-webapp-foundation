"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlusIcon, SearchIcon } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export function CatalogToolbar() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search releases or catalog..." />
        </InputGroup>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup defaultValue={["releases"]} variant="outline" size="sm">
            <ToggleGroupItem value="all-tracks">All Tracks</ToggleGroupItem>
            <ToggleGroupItem value="releases">Releases</ToggleGroupItem>
            <ToggleGroupItem value="top-earners">Top Earners</ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm">
            <PlusIcon />
            Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
