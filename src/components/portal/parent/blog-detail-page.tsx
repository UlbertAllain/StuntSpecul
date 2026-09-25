"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays } from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import { blogCategoryLabel, type BlogPost } from "@/lib/portal";
import { Message, PortalShell } from "../shared/shell";

export function ParentBlogDetailPage() {
  const router = useRouter();
  const params = useParams<{ blogId: string }>();
  const blogId = decodeURIComponent(params.blogId || "");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<BlogPost>(`/blogs/${encodeURIComponent(blogId)}`, {
      signal: controller.signal,
    })
      .then(setPost)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ClientError && cause.status === 401) {
          router.replace("/login");
          return;
        }
        setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [blogId, router]);

  return (
    <PortalShell
      tone="parent"
      heading="Blog pertumbuhan"
      subtitle="Informasi edukasi untuk mendampingi tumbuh kembang anak."
      actions={
        <button
          type="button"
          className="portal-text"
          onClick={() => router.back()}
        >
          <ArrowLeft size={18} />
          Kembali
        </button>
      }
    >
      {loading && <Message>Memuat artikel…</Message>}
      {error && <Message error>{error}</Message>}

      {!loading && !error && !post && (
        <div className="portal-empty">
          <BookOpen size={28} />
          <h3>Artikel tidak ditemukan</h3>
          <Link className="parent-history-page-back" href="/ortu">
            <ArrowLeft size={18} /> Kembali ke akun orang tua
          </Link>
        </div>
      )}

      {post && (
        <article className="parent-blog-detail">
          <div className="parent-blog-detail-meta">
            <span>{blogCategoryLabel(post.category)}</span>
            <time>
              <CalendarDays size={15} />
              {new Date(post.publishedAt || post.updatedAt).toLocaleDateString(
                "id-ID",
                { day: "numeric", month: "long", year: "numeric" },
              )}
            </time>
          </div>

          <h2>{post.title}</h2>
          <p className="parent-blog-detail-excerpt">{post.excerpt}</p>
          <p className="parent-blog-detail-author">
            Ditulis oleh {post.authorName}
          </p>

          <div className="parent-blog-detail-content">
            {post.content
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>

          <p className="parent-blog-detail-note">
            Artikel ini bersifat edukasi umum dan tidak menggantikan konsultasi
            dengan tenaga kesehatan.
          </p>

          <Link className="parent-history-page-back bottom" href="/ortu">
            <ArrowLeft size={18} />
            Kembali ke Blog
          </Link>
        </article>
      )}
    </PortalShell>
  );
}
