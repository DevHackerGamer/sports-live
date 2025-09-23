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
            // Each item here is one entry in the navigation menu..
            { label: "Getting Started", slug: "guides/started" },
            { label: "Project Set Up", slug: "guides/installation" },
            { label: "Overview", slug: "guides/overview" },
            { label: "Team & Contributors", slug: "guides/teamandcontributors" },
          ],
        },
        {
          label: "Methodology & Planning",
          items: [
          
            { label: "Git methodology", slug: "guides/git" },
            {
              label: "Project management methodology",
              slug: "guides/project",
            },
            { label: "Project Design & Planning", slug: "guides/designplan" }
           
          ],
        },
         {
          label: "Development",
          items: [
            // Each item here is one entry in the navigation menu.

           
            { label: "Development Guide", slug: "guides/development" },
            { label: "Technology Stack", slug: "guides/stack" },
            { label: "Database Documentation", slug: "guides/dbdoc" },
            { label: "Third-Party Integrations", slug: "guides/third-party" },
            { label: "Deployment & Integration", slug: "guides/deployment" }
          ],
        },
       
        {
          label: "Usage Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Frontend ", slug: "guides/frontend" },
            { label: "Backend", slug: "guides/backend" },
            { label: "Authentication", slug: "guides/authentication" },
            { label: "API Documentation", slug: "guides/endpoints" },
            { label: "User Guide", slug: "guides/userguide" },
          ],

        },
       

        {
          label: "Testing & Quality",
          items: [
                { label: "Code Quality Tools", slug: "guides/codeq" },
                 { label: "Bug Tracking", slug: "guides/bugtracker" },
                { label: "Testing", slug: "guides/testing" },
            { label: "User Feedback Collection & Analysis", slug: "guides/ufeedback" },
            { label: "User and Stakeholder Feedback Integration", slug: "guides/feedbackintegration" }
            // Each item here is one entry in the navigation menu.
           
          ],
        }, 
     
        {
          label: "Project Evaluation & General Discussion",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "General Discussion", slug: "guides/generaldiscussion"

             },
              { label: "Project Challenges", slug: "guides/challenges" },
            { label: "Project Evaluation", slug: "guides/evaluation" },
            { label: "Conclusion", slug: "guides/conclusion" }
            
            
          ],
        },
        {
           label: "Supporting Documents", 
           items: [
             { label: "Appendix", slug: "guides/appendix" }, 
             { label: "Roadmap", slug: "guides/roadmap" }, 
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
