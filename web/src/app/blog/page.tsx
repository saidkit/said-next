import type { Metadata } from "next";
import { PostList, loadPosts } from "@/features/blog";

export const metadata: Metadata = { title: "Blog" };

// ISR — SSG-with-revalidation for CMS content (ADR-NEXT-S07).
export const revalidate = 3600;

export default async function BlogIndexPage() {
  const posts = await loadPosts();
  return (
    <section>
      <h1>Blog</h1>
      <PostList posts={posts} />
    </section>
  );
}
