import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface EditRequest {
  articleId: number
  title: string
  content: string
}

export async function POST(request: NextRequest) {
  // Get current user from cookie
  const userCookie = request.cookies.get('discord_user')
  if (!userCookie) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let user: { id: number; displayName: string }
  try {
    user = JSON.parse(userCookie.value)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const body = await request.json() as EditRequest
  const { articleId, title, content } = body

  if (!articleId || !title || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  // Get current article to preserve edit history
  const article = await payload.findByID({
    collection: 'kb-articles',
    id: articleId,
  })

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const currentHistory = (article.editHistory || []) as Array<{ editor?: number; editorName?: string; editedAt?: string }>

  // Update article with Payload
  await payload.update({
    collection: 'kb-articles',
    id: articleId,
    data: {
      title,
      content,
      lastEditedBy: user.id,
      lastEditedByName: user.displayName,
      lastEditedAt: now,
      editHistory: [
        ...currentHistory,
        {
          editor: user.id,
          editorName: user.displayName,
          editedAt: now,
        },
      ],
    },
  })

  // Increment user's edit count
  const discordUser = await payload.findByID({
    collection: 'discord-users',
    id: user.id,
  })

  if (discordUser) {
    await payload.update({
      collection: 'discord-users',
      id: user.id,
      data: {
        editCount: (discordUser.editCount || 0) + 1,
      },
    })
  }

  return NextResponse.json({ success: true })
}
