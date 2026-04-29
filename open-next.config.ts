import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// We don't use Next.js ISR / on-demand revalidation; pages are either
// static or fully dynamic (server actions + RSC against D1). Skipping
// the incremental cache override keeps deploys simple and avoids the
// KV-binding-name dance.
export default defineCloudflareConfig({});
