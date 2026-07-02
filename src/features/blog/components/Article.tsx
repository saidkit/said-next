import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { Post } from "@/lib/cms";

/**
 * RSC — renders a post. `mdx` bodies compile via next-mdx-remote; `html` bodies
 * (from a CMS like WordPress) render as sanitized markup, styled in globals.css.
 */
export function Article({ post }: { post: Post }) {
  return (
    <article className="article">
      <header>
        <h1>{post.title}</h1>
        {post.author ? <p className="byline">By {post.author}</p> : null}
        <time dateTime={post.date}>{post.date.slice(0, 10)}</time>
      </header>
      {post.bodyFormat === "mdx" ? (
        <MDXRemote
          source={post.body}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }}
        />
      ) : (
        <div className="cms-content" dangerouslySetInnerHTML={{ __html: post.body }} />
      )}
    </article>
  );
}
