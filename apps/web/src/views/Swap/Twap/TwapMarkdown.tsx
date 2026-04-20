import React from 'react'
import { styled } from 'styled-components'
import { Flex, Link, Text } from '@pancakeswap/uikit'

// ─── Lightweight inline markdown renderer ────────────────────────
// Supports: [text](url), **bold**, *italic*, `code`, and newlines

const INLINE_MD_REGEX = /(\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\\n|\n)/g

const MarkdownLink = styled(Link)`
  display: inline;
  font-size: inherit;
  font-weight: inherit;
  text-decoration: underline;
`

export const InlineMarkdown = ({
  children,
  ...textProps
}: { children: string } & React.ComponentProps<typeof Text>) => {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const str = children

  INLINE_MD_REGEX.lastIndex = 0
  while ((match = INLINE_MD_REGEX.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index))
    }

    if (match[2] && match[3]) {
      // [text](url)
      parts.push(
        <MarkdownLink key={match.index} href={match[3]} external small>
          {match[2]}
        </MarkdownLink>,
      )
    } else if (match[4]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[4]}</strong>)
    } else if (match[5]) {
      // *italic*
      parts.push(<em key={match.index}>{match[5]}</em>)
    } else if (match[6]) {
      // `code`
      parts.push(<code key={match.index}>{match[6]}</code>)
    } else if (match[0] === '\n' || match[0] === '\\n') {
      parts.push(<div key={match.index} style={{ marginBottom: '2px' }} />)
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex))
  }

  return <Text {...textProps}>{parts}</Text>
}
