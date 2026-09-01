"use client"

import * as React from "react"
import { SendIcon } from "lucide-react"

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type ChatMessage = {
  id: string
  author: string
  mine: boolean
  lines: string[]
  time: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    author: "Alex",
    mine: false,
    lines: ["Morning! Did the new build pass?", "The deploy is queued."],
    time: "9:02",
  },
  {
    id: "2",
    author: "You",
    mine: true,
    lines: ["All green. Shipping after lunch."],
    time: "9:05",
  },
  {
    id: "3",
    author: "Alex",
    mine: false,
    lines: ["Nice work 🎉"],
    time: "9:06",
  },
]

export function ChatThread() {
  const [messages, setMessages] = React.useState(INITIAL_MESSAGES)
  const [draft, setDraft] = React.useState("")

  const send = (event: React.FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((current) => [
      ...current,
      {
        id: String(current.length + 1),
        author: "You",
        mine: true,
        lines: [text],
        time: "now",
      },
    ])
    setDraft("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="h-72">
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-4 pb-2">
                <MessageScrollerItem>
                  <Marker variant="separator">
                    <MarkerContent>Today</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                  >
                    <Message align={message.mine ? "end" : "start"}>
                      {!message.mine && (
                        <MessageAvatar className="size-8 text-xs font-medium">
                          {message.author[0]}
                        </MessageAvatar>
                      )}
                      <MessageContent>
                        {!message.mine && (
                          <MessageHeader>{message.author}</MessageHeader>
                        )}
                        <BubbleGroup>
                          {message.lines.map((line, index) => (
                            <Bubble
                              key={index}
                              align={message.mine ? "end" : "start"}
                              variant={message.mine ? "default" : "muted"}
                            >
                              <BubbleContent>{line}</BubbleContent>
                              {message.id === "2" && (
                                <BubbleReactions>👍</BubbleReactions>
                              )}
                            </Bubble>
                          ))}
                        </BubbleGroup>
                        <MessageFooter>{message.time}</MessageFooter>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </CardContent>
      <CardFooter>
        <form onSubmit={send} className="flex w-full gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message"
            aria-label="Message"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <SendIcon />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
