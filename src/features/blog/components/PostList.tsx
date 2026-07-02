import Link from "next/link";
import type { PostSummary } from "@/lib/cms";

/** RSC — receives server-resolved data as props; does not fetch (ADR-NEXT-S03). */
export function PostList({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return <p>No posts yet. Add one to <code>content/blog/</code>.</p>;
  return (
    <ul className="post-list">
      {posts.map((p) => (
        <li key={p.slug}>
          <Link href={`/blog/${p.slug}`}>
            <h2>{p.title}</h2>
            <p>{p.excerpt}</p>
            <time dateTime={p.date}>{p.date.slice(0, 10)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
