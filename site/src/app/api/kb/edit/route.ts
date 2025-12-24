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

  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const now = new Date().toISOString()

    // Update article - only update simple fields, skip relationships
    await payload.update({
      collection: 'kb-articles',
      id: articleId,
      data: {
        title,
        content,
        lastEditedByName: user.displayName,
        lastEditedAt: now,
      },
    })

    // Increment user's edit count
    try {
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
    } catch {
      // User update failed, but article was saved
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Edit error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
