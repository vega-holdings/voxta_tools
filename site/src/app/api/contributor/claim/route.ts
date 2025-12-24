import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface ClaimRequest {
  contributorName: string
}

export async function POST(request: NextRequest) {
  // Get current user from cookie
  const userCookie = request.cookies.get('discord_user')
  if (!userCookie) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let user: { id: number; discordId: string; displayName: string }
  try {
    user = JSON.parse(userCookie.value)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const body = await request.json() as ClaimRequest
  const { contributorName } = body

  if (!contributorName || typeof contributorName !== 'string') {
    return NextResponse.json({ error: 'Invalid contributor name' }, { status: 400 })
  }

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  // Check if already claimed by someone (array query not well supported, check locally)
  const allUsers = await payload.find({
    collection: 'discord-users',
    limit: 100,
  })

  for (const existingUser of allUsers.docs) {
    const claims = existingUser.claimedContributorNames as Array<{ name: string }> | undefined
    if (claims?.some(c => c.name === contributorName)) {
      if (existingUser.id === user.id) {
        return NextResponse.json({ error: 'You already claimed this name' }, { status: 400 })
      }
      return NextResponse.json({ error: `Already claimed by ${existingUser.displayName}` }, { status: 400 })
    }
  }

  // Get current user's claims
  const discordUser = await payload.findByID({
    collection: 'discord-users',
    id: user.id,
  })

  if (!discordUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const currentClaims = (discordUser.claimedContributorNames || []) as Array<{ name: string }>

  // Add the claim
  await payload.update({
    collection: 'discord-users',
    id: user.id,
    data: {
      claimedContributorNames: [
        ...currentClaims,
        { name: contributorName },
      ],
    },
  })

  return NextResponse.json({ success: true })
}
