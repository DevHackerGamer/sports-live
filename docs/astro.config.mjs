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
            { label: "Overview", slug: "guides/overview" },
          ],
        },
        {
          label: "Usage Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Frontend ", slug: "guides/frontend" },
            { label: "Backend", slug: "guides/backend" },
            { label: "Authentication", slug: "guides/authentication" },
            { label: "API Documentation", slug: "guides/endpoints" }
          ],
        },
        {
          label: "Development",
          items: [
            // Each item here is one entry in the navigation menu.
          
             { label: "Design & Development Plan", slug: "guides/designplan" },
            { label: "Development Guide", slug: "guides/development" },
            { label: "Technology Stack", slug: "guides/stack" },
            { label: "Database Documentation", slug: "guides/dbdoc" },
            { label: "Third-Party Integrations", slug: "guides/third-party" },
          ],
        },

        {
          label: "Testing & Quality",
          items: [
                { label: "Code Quality Tools", slug: "guides/codeq" },
                 { label: "Bug Tracking", slug: "guides/bugtracker" },
                { label: "Testing", slug: "guides/testing" },
            { label: "User Feedback", slug: "guides/ufeedback" }
            // Each item here is one entry in the navigation menu.
           
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
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});
