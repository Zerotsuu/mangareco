// // src/server/api/routers/admin.ts
// import { createTRPCRouter, protectedProcedure } from "../trpc";
// import { z } from "zod";
// import { scheduleModelRetraining } from "~/server/services/qstash";
// import { Redis } from '@upstash/redis';
// import { TRPCError } from "@trpc/server";

// export const adminRouter = createTRPCRouter({
//   scheduleRetraining: protectedProcedure
//     .input(z.object({
//       force: z.boolean().default(false)
//     }))
//     .mutation(async ({ ctx, input }) => {
      
//       // Check last training time if not forced
//       if (!input.force) {
//         const redis = new Redis({
//           url: process.env.UPSTASH_REDIS_REST_URL!,
//           token: process.env.UPSTASH_REDIS_REST_TOKEN!,
//         });

//         const lastTraining = await redis.get('last_model_training');
//         if (lastTraining) {
//           const hoursSinceLastTraining = 
//             (Date.now() - Number(lastTraining)) / (1000 * 60 * 60);
          
//           if (hoursSinceLastTraining < 24) {
//             throw new TRPCError({
//               code: 'BAD_REQUEST',
//               message: 'Model was trained recently. Use force=true to override.'
//             });
//           }
//         }
//       }

//       const scheduled = await scheduleModelRetraining();
      
//       if (!scheduled) {
//         throw new TRPCError({
//           code: 'INTERNAL_SERVER_ERROR',
//           message: 'Failed to schedule retraining'
//         });
//       }

//       return { success: true };
//     }),

//   getTrainingStatus: protectedProcedure
//     .query(async ({ ctx }) => {
//       const redis = new Redis({
//         url: process.env.UPSTASH_REDIS_REST_URL!,
//         token: process.env.UPSTASH_REDIS_REST_TOKEN!,
//       });

//       const lastTraining = await redis.get('last_model_training');
      
//       return {
//         lastTrainingTime: lastTraining ? new Date(Number(lastTraining)) : null
//       };
//     })
// });