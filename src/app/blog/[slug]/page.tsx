import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Article, loadPost, loadSlugs } from "@/features/blog";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await loadSlugs()).map((slug) => ({ slug }));
}

// Reads the CONTRACT's `post.seo` (ADR-NEXT-S07) — never a CMS/vendor API.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  if (!post) return {};
  const { title, description, ogImage, canonical } = post.seo;
  return {
    title,
    description,
    openGraph: { title, description, ...(ogImage ? { images: [ogImage] } : {}) },
    ...(canonical ? { alternates: { canonical } } : {}),
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await loadPost((await params).slug);
  if (!post) notFound(); // expected "missing" → not-found.tsx (ADR-NEXT-S09)
  return (
    <>
      {post.seo.jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(post.seo.jsonLd) }} />
      ) : null}
      <Article post={post} />
    </>
  );
}
