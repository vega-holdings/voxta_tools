import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const runtime = 'edge'

interface DiscordUser {
  id: string
  username: string
  global_name?: string
  avatar?: string
}

interface DiscordTokens {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface D1User {
  id: number
  discord_id: string
  username: string
  display_name: string
  avatar: string | null
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://voxta.axailotl.ai'}/api/auth/discord/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=not_configured', request.url))
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(new URL('/?error=token_failed', request.url))
    }

    const tokens: DiscordTokens = await tokenResponse.json()

    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL('/?error=user_failed', request.url))
    }

    const discordUser: DiscordUser = await userResponse.json()
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null
    const displayName = discordUser.global_name || discordUser.username
    const now = new Date().toISOString()

    // Use D1 directly instead of Payload (edge compatible)
    const { env } = await getCloudflareContext()
    const db = env.D1

    // Check if user exists
    const existing = await db.prepare(
      'SELECT id, discord_id, username, display_name, avatar FROM discord_users WHERE discord_id = ?'
    ).bind(discordUser.id).first<D1User>()

    let userId: number

    if (existing) {
      // Update existing user
      await db.prepare(
        'UPDATE discord_users SET username = ?, display_name = ?, avatar = ?, last_login = ?, updated_at = ? WHERE id = ?'
      ).bind(discordUser.username, displayName, avatarUrl, now, now, existing.id).run()
      userId = existing.id
    } else {
      // Create new user
      const result = await db.prepare(
        'INSERT INTO discord_users (discord_id, username, display_name, avatar, edit_count, last_login, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
      ).bind(discordUser.id, discordUser.username, displayName, avatarUrl, now, now, now).run()
      userId = result.meta.last_row_id as number
    }

    // Create session cookie
    const response = NextResponse.redirect(new URL('/leaderboard?login=success', request.url))

    response.cookies.set('discord_user', JSON.stringify({
      id: userId,
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: displayName,
      avatar: avatarUrl,
    }), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Discord auth error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
