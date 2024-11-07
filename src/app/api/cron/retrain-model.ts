// // src/app/api/cron/retrain-model.ts
// import { verifySignature } from "@upstash/qstash/nextjs";
// import type { NextApiRequest, NextApiResponse } from "next";
// import { Redis } from '@upstash/redis';
// import { db } from "~/server/db";

// async function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== 'POST') {
//         return res.status(405).json({ error: 'Method not allowed' });
//     }

//     try {
//         // Get all user ratings
//         const allRatings = await db.mangaList.findMany({
//             select: {
//                 userId: true,
//                 mangaId: true,
//                 likeStatus: true,
//             },
//             where: {
//                 likeStatus: {
//                     in: ['like', 'dislike'] // Only get explicit ratings
//                 }
//             }
//         });

//         // Format ratings for the model
//         const formattedRatings = allRatings.map(rating => ({
//             user_id: rating.userId,
//             manga_id: rating.mangaId,
//             rating: rating.likeStatus === 'like' ? 1.0 : -1.0
//         }));

//         // Trigger retraining on Hugging Face
//         const response = await fetch(
//             `${process.env.HUGGING_FACE_SPACE_URL}/api/retrain`,
//             {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ ratings: formattedRatings })
//             }
//         );

//         if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(`Failed to retrain model: ${errorText}`);
//         }

//         // Store last training timestamp and metrics in Redis
//         const redis = new Redis({
//             url: process.env.UPSTASH_REDIS_REST_URL!,
//             token: process.env.UPSTASH_REDIS_REST_TOKEN!,
//         });

//         const trainingResult = (await response.json()) as Record<string, unknown>;
//         await redis.set('last_model_training', JSON.stringify({
//             timestamp: Date.now(),
//             metrics: trainingResult,
//             num_ratings: allRatings.length
//         }));

//         return res.status(200).json({
//             success: true,
//             message: 'Model retraining completed',
//             metrics: trainingResult
//         });

//     } catch (error) {
//         console.error('Retraining error:', error);
//         return res.status(500).json({
//             error: 'Failed to retrain model',
//             details: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// }

// export default verifySignature(handler);

// export const config = {
//     api: {
//         bodyParser: false,
//     },
// };