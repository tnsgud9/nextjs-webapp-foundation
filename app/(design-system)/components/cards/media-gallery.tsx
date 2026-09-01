"use client"

import * as React from "react"
import { FileTextIcon, ImageIcon, XIcon } from "lucide-react"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"

const SLIDES = [
  { title: "Dawn", className: "from-amber-200 to-rose-400" },
  { title: "Lagoon", className: "from-cyan-200 to-blue-500" },
  { title: "Meadow", className: "from-lime-200 to-emerald-500" },
  { title: "Dusk", className: "from-violet-300 to-indigo-600" },
]

const FILES = [
  {
    name: "brief.pdf",
    detail: "1.2 MB",
    state: "done",
    icon: FileTextIcon,
  },
  {
    name: "moodboard.png",
    detail: "Uploading 64%",
    state: "uploading",
    icon: ImageIcon,
  },
  {
    name: "notes.txt",
    detail: "Upload failed",
    state: "error",
    icon: FileTextIcon,
  },
] as const

export function MediaGallery() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gallery</CardTitle>
        <CardDescription>
          Slide {current + 1} of {SLIDES.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Carousel setApi={setApi} opts={{ loop: true }}>
          <CarouselContent>
            {SLIDES.map((slide) => (
              <CarouselItem key={slide.title}>
                <AspectRatio
                  ratio={16 / 9}
                  className={`flex items-end rounded-lg bg-linear-to-br p-3 ${slide.className}`}
                >
                  <span className="text-sm font-medium text-white drop-shadow">
                    {slide.title}
                  </span>
                </AspectRatio>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-3 flex justify-end gap-2">
            <CarouselPrevious className="static my-0" />
            <CarouselNext className="static my-0" />
          </div>
        </Carousel>
        <AttachmentGroup>
          {FILES.map((file) => (
            <Attachment key={file.name} state={file.state} size="sm">
              <AttachmentMedia>
                <file.icon />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
                <AttachmentDescription>{file.detail}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label={`Remove ${file.name}`}>
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      </CardContent>
    </Card>
  )
}
