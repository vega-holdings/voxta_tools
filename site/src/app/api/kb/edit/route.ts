import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface EditRequest {
  articleId: number
  title: string
  content: string
}

interface EditHistoryEntry {
  editor?: number | null
  editorName?: string | null
  editedAt?: string | null
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

  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    // Verify the discord user exists
    let discordUser = null
    try {
      discordUser = await payload.findByID({
        collection: 'discord-users',
        id: user.id,
      })
    } catch {
      // User not found in DB
    }

    // Get current article
    const article = await payload.findByID({
      collection: 'kb-articles',
      id: articleId,
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const currentHistory = (article.editHistory || []) as EditHistoryEntry[]

    // Build update data with full relationship tracking
    const updateData: Record<string, unknown> = {
      title,
      content,
      lastEditedByName: user.displayName,
      lastEditedAt: now,
      editHistory: [
        ...currentHistory,
        {
          editorName: user.displayName,
          editedAt: now,
          ...(discordUser ? { editor: user.id } : {}),
        },
      ],
    }

    // Only set relationship if user exists in DB
    if (discordUser) {
      updateData.lastEditedBy = user.id
    }

    // Update article
    await payload.update({
      collection: 'kb-articles',
      id: articleId,
      data: updateData,
    })

    // Increment user's edit count if user exists
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
  } catch (error) {
    console.error('Edit error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
