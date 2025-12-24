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
    } catch (e) {
      console.log('User lookup failed:', e)
      // User not found in DB - continue without relationship
    }

    // Get current article
    let article
    try {
      article = await payload.findByID({
        collection: 'kb-articles',
        id: articleId,
      })
    } catch (e) {
      console.error('Article lookup error:', e)
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Build update data - just title, content, and text fields first
    // Skip relationship and array fields to isolate the issue
    const updateData: Record<string, unknown> = {
      title,
      content,
      lastEditedByName: user.displayName,
      lastEditedAt: now,
    }

    console.log('Updating article:', articleId, 'with data keys:', Object.keys(updateData))

    // Update article
    try {
      await payload.update({
        collection: 'kb-articles',
        id: articleId,
        data: updateData,
      })
    } catch (updateError) {
      console.error('Payload update error:', updateError)
      throw updateError
    }

    // Increment user's edit count if user exists
    if (discordUser) {
      try {
        await payload.update({
          collection: 'discord-users',
          id: user.id,
          data: {
            editCount: (discordUser.editCount || 0) + 1,
          },
        })
      } catch (userUpdateError) {
        console.error('User edit count update error:', userUpdateError)
        // Non-fatal, don't throw
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Edit error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to save: ${errorMessage}` }, { status: 500 })
  }
}
