
import type { WebhookEvent } from '@clerk/nextjs/server';
import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }

  const payload = (await buffer(req)).toString();
  const headers = req.headers as Record<string, string>;
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, headers) as WebhookEvent;
  } catch (err) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  if (evt.type === 'user.created') {
    // Redirect user to onboarding page
    // Note: This is handled client-side, so we'll need to update our frontend to check for this metadata
    await fetch(`${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}/users/${evt.data.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: { needsOnboarding: true },
      }),
    });
  }

  res.status(200).json({ message: 'Webhook processed successfully' });
}