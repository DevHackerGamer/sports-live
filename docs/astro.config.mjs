// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Sports Live Documentation",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/DevHackerGamer/sports-live",
        },
      ],
      sidebar: [
        {
          label: "Introduction",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Getting Started", slug: "guides/started" },
            { label: "Project set up", slug: "guides/installation" },
          ],
        },
        {
          label: "Usage Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Frontend ", slug: "guides/frontend" },
            { label: "Backend", slug: "guides/backend" },
            { label: "Authentication", slug: "guides/authentication" },
          ],
        },
        {
          label: "Development",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Development Guide", slug: "guides/development" },
            { label: "Technology Stack", slug: "guides/stack" },
            { label: "Testing and Linting", slug: "guides/testing" },
            { label: "API Documentation", slug: "guides/endpoints" },
          ],
        },
        {
          label: "Methodology",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Git methodology", slug: "guides/git" },
            {
              label: "Project management methodology",
              slug: "guides/project",
            },
            //{ label: "API Documentation", slug: "guides/endpoints" },
          ],
        },
      ],
    }),
  ],
});
