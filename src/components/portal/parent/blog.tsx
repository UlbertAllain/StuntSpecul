"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Filter } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import {
  blogCategories,
  blogCategoryLabel,
  type BlogCategory,
  type BlogPost,
} from "@/lib/portal";
import { Message } from "../shared/shell";

export function ParentBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [category, setCategory] = useState<BlogCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<BlogPost[]>("/blogs", { signal: controller.signal })
      .then(setPosts)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visible = useMemo(
    () =>
      category === "all"
        ? posts
        : posts.filter((post) => post.category === category),
    [category, posts],
  );

  return (
    <section className="parent-blog">
      <div className="section-heading compact-section-heading">
        <div>
          <span className="parent-section-eyebrow">EDUKASI KELUARGA</span>
          <h2>Blog pertumbuhan</h2>
          <p className="portal-note">
            Bacaan singkat dari petugas tentang nutrisi, kebiasaan sehat, dan
            pencegahan stunting.
          </p>
        </div>
      </div>

      <div className="parent-blog-filter" aria-label="Filter artikel">
        <Filter size={15} />
        <button
          type="button"
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
        >
          Semua
        </button>
        {blogCategories.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {blogCategoryLabel(item)}
          </button>
        ))}
      </div>

      {loading && <Message>Memuat artikel…</Message>}
      {error && <Message error>{error}</Message>}

      {!loading && !error && visible.length === 0 && (
        <div className="portal-empty parent-blog-empty">
          <BookOpen size={28} />
          <h3>Belum ada artikel</h3>
          <p>Artikel yang dipublikasikan petugas akan muncul di sini.</p>
        </div>
      )}

      <div className="parent-blog-grid">
        {visible.map((post) => (
          <article key={post.id} className="parent-blog-card">
            <div className="parent-blog-card-meta">
              <span>{blogCategoryLabel(post.category)}</span>
              <time>
                {new Date(
                  post.publishedAt || post.updatedAt,
                ).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </div>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <small>Oleh {post.authorName}</small>
            <Link href={`/ortu/blog/${encodeURIComponent(post.id)}`}>
              Baca artikel
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
