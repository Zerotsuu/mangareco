
import { mangaRouter } from "~/server/api/routers/manga"; 
import { mangaListRouter } from "~/server/api/routers/mangaList";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userProfileRouter } from "~/server/api/routers/userProfile";
import { recommendationRouter } from "~/server/api/routers/recommendation";
import { userRouter } from "./routers/user";
// import { getLayoutOrPageModule } from "next/dist/server/lib/app-dir-module";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  manga: mangaRouter,
  mangaList: mangaListRouter,
  userProfile: userProfileRouter,
  recommendation: recommendationRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
