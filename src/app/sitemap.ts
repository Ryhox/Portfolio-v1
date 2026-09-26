import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://ryhox.dev",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    { url: "https://ryhox.dev/legal", changeFrequency: "yearly", priority: 0.1 },
    { url: "https://ryhox.dev/privacy", changeFrequency: "yearly", priority: 0.1 },
  ];
}
