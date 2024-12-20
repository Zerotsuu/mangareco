/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    reactStrictMode: true,
    i18n: {
      locales: ["en"],
      defaultLocale: "en",
    },
    images: {
      unoptimized:true,
      domains: [
        "s4.anilist.co",
        "img.anili.st",
      ],
    },
    async headers() {
      return [
        {
          source: "/api/webhooks/clerk",
          headers: [
            { key: 'Content-Type', value: 'application/json' },
          ],
        },
      ];
    },
  };

export default config;
