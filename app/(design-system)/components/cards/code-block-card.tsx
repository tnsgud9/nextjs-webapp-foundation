"use client"

import { FileCodeIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"

const CODE = `import { db } from "@/lib/db"

export async function getLatestNews() {
  return db.news.findMany({
    orderBy: { publishedAt: "desc" },
    take: 3,
  })
}
`

const HIGHLIGHTED_LINE = 5

const DIFF = [
  { variant: "default", text: "  orderBy: {" },
  { variant: "removed", text: '    createdAt: "desc",' },
  { variant: "added", text: '    publishedAt: "desc",' },
  { variant: "default", text: "  }," },
] as const

export function CodeBlockCard() {
  const lines = useHighlightedCode(CODE, "typescript")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code Block</CardTitle>
        <CardDescription>
          Syntax highlighting, line numbers and diff lines.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CodeBlock>
          <CodeBlockHeader>
            <CodeBlockTitle>
              <FileCodeIcon />
              lib/news.ts
            </CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={CODE} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent lineNumbers>
            {lines.map((line, index) => (
              <CodeBlockLine
                key={index}
                variant={index + 1 === HIGHLIGHTED_LINE ? "highlighted" : "default"}
              >
                {line}
              </CodeBlockLine>
            ))}
          </CodeBlockContent>
        </CodeBlock>
        <CodeBlock size="sm">
          <CodeBlockContent>
            {DIFF.map((line, index) => (
              <CodeBlockLine key={index} variant={line.variant}>
                {line.text}
              </CodeBlockLine>
            ))}
          </CodeBlockContent>
        </CodeBlock>
      </CardContent>
    </Card>
  )
}
