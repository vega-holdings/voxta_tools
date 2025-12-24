import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

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
    const { env } = await getCloudflareContext()
    const db = env.D1

    const now = new Date().toISOString()

    // Update article directly in D1 (simpler, avoids hook issues)
    await db.prepare(`
      UPDATE kb_articles
      SET title = ?, content = ?, last_edited_by_name = ?, last_edited_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(title, content, user.displayName, now, now, articleId).run()

    // Increment user's edit count
    await db.prepare(`
      UPDATE discord_users SET edit_count = edit_count + 1, updated_at = ? WHERE id = ?
    `).bind(now, user.id).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Edit error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
