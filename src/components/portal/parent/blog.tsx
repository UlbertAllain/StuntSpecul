"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Filter } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import {
  blogCategories,
  blogCategoryLabel,
  type BlogCategory,
  type BlogPostSummary,
} from "@/lib/portal";
import { Message } from "../shared/shell";

const BLOG_CLIENT_CACHE_MS = 60_000;
let cachedPosts: BlogPostSummary[] | null = null;
let cachedAt = 0;
let pendingPosts: Promise<BlogPostSummary[]> | null = null;

function loadParentBlogs() {
  if (cachedPosts && Date.now() - cachedAt < BLOG_CLIENT_CACHE_MS) {
    return Promise.resolve(cachedPosts);
  }
  pendingPosts ??= api<BlogPostSummary[]>("/blogs")
    .then((posts) => {
      cachedPosts = posts;
      cachedAt = Date.now();
      return posts;
    })
    .finally(() => {
      pendingPosts = null;
    });
  return pendingPosts;
}

export function prefetchParentBlogs() {
  void loadParentBlogs().catch(() => {});
}

export function ParentBlog() {
  const [posts, setPosts] = useState<BlogPostSummary[]>(cachedPosts ?? []);
  const [category, setCategory] = useState<BlogCategory | "all">("all");
  const [loading, setLoading] = useState(cachedPosts === null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    loadParentBlogs()
      .then((value) => {
        if (!active) return;
        setPosts(value);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
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

      {loading && <Message>Menyiapkan artikel…</Message>}
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
