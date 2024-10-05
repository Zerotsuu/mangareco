import { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'

export async function POST(req: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET

  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const headerPayload = headers()
  const svixHeaders = {
    'svix-id': headerPayload.get('svix-id')!,
    'svix-timestamp': headerPayload.get('svix-timestamp')!,
    'svix-signature': headerPayload.get('svix-signature')!,
  }

  const payload: unknown = await req.json()
  const wh = new Webhook(webhookSecret)

  let evt: WebhookEvent

  try {
    evt = wh.verify(JSON.stringify(payload), svixHeaders) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    // Handle new user creation
    const userId = evt.data.id
    const clerkApiUrl = `https://api.clerk.com/v1/users/${userId}/metadata`
    try {
      const response = await fetch(clerkApiUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: { needsOnboarding: true },
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to update user metadata')
      }
    } catch (error) {
      console.error('Error updating user metadata:', error)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  return new Response('Webhook processed successfully', { status: 200 })
}