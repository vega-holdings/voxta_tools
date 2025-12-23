import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

    // Store/update user in Payload
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    // Check if user exists
    const existing = await payload.find({
      collection: 'discord-users',
      where: { discordId: { equals: discordUser.id } },
      limit: 1,
    })

    let user
    if (existing.docs.length > 0) {
      // Update existing user
      user = await payload.update({
        collection: 'discord-users',
        id: existing.docs[0].id,
        data: {
          username: discordUser.username,
          displayName: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
          lastLogin: new Date().toISOString(),
        },
      })
    } else {
      // Create new user
      user = await payload.create({
        collection: 'discord-users',
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          displayName: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
          lastLogin: new Date().toISOString(),
        },
      })
    }

    // Create session cookie
    const response = NextResponse.redirect(new URL('/leaderboard?login=success', request.url))

    // Set a simple session cookie with user ID (in production, use signed JWT)
    response.cookies.set('discord_user', JSON.stringify({
      id: user.id,
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.global_name || discordUser.username,
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
