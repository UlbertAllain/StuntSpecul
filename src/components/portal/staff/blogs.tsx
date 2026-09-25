"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import {
  blogCategories,
  blogCategoryLabel,
  type BlogCategory,
  type BlogPost,
  type BlogStatus,
} from "@/lib/portal";
import { Message } from "../shared/shell";

type BlogForm = {
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  status: BlogStatus;
};

const EMPTY_FORM: BlogForm = {
  title: "",
  excerpt: "",
  content: "",
  category: "nutrition",
  status: "draft",
};

export function BlogPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const editing = useMemo(
    () => posts.find((post) => post.id === editingId) || null,
    [editingId, posts],
  );

  useEffect(() => {
    const controller = new AbortController();

    api<BlogPost[]>("/staff/blogs", { signal: controller.signal })
      .then(setPosts)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setPosts(await api<BlogPost[]>("/staff/blogs"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingId("");
    setForm(EMPTY_FORM);
    setError("");
  }

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      status: post.status,
    });
    setError("");
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        await api(`/staff/blogs/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          body: form,
        });
      } else {
        await api("/staff/blogs", {
          method: "POST",
          body: form,
        });
      }
      await load();
      startCreate();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(post: BlogPost) {
    if (
      busy ||
      !window.confirm(
        `Hapus artikel “${post.title}”? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/staff/blogs/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
      });
      if (editingId === post.id) startCreate();
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="staff-blog-panel">
      <div className="section-heading">
        <div>
          <span className="parent-section-eyebrow">EDUKASI ORANG TUA</span>
          <h2>Kelola blog</h2>
          <p className="portal-note">
            Tulis artikel edukasi lalu publikasikan agar dapat dibaca oleh akun
            orang tua.
          </p>
        </div>
        <button
          className="portal-secondary"
          type="button"
          onClick={startCreate}
        >
          <Plus size={17} />
          Artikel baru
        </button>
      </div>

      {error && <Message error>{error}</Message>}

      <div className="staff-blog-layout">
        <div className="staff-blog-list">
          {loading ? (
            <Message>Memuat artikel…</Message>
          ) : posts.length === 0 ? (
            <div className="portal-empty">
              <BookOpen size={28} />
              <h3>Belum ada artikel</h3>
              <p>Buat artikel pertama dari form di samping.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className={`staff-blog-item ${
                  editingId === post.id ? "active" : ""
                }`}
              >
                <div>
                  <span>{blogCategoryLabel(post.category)}</span>
                  <strong>{post.title}</strong>
                  <p>{post.excerpt}</p>
                  <small>
                    {post.status === "published" ? "Dipublikasikan" : "Draft"} ·{" "}
                    {new Date(post.updatedAt).toLocaleDateString("id-ID")}
                  </small>
                </div>
                <div className="staff-blog-item-actions">
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    aria-label={`Edit ${post.title}`}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void remove(post)}
                    aria-label={`Hapus ${post.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="staff-blog-editor">
          <div className="staff-blog-editor-head">
            <div>
              <span>{editing ? "EDIT ARTIKEL" : "ARTIKEL BARU"}</span>
              <h3>{editing ? editing.title : "Tulis konten edukasi"}</h3>
            </div>
            {editing && (
              <button
                type="button"
                onClick={startCreate}
                aria-label="Batal edit"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <label>
            Judul
            <input
              value={form.title}
              maxLength={120}
              onChange={(event) =>
                setForm((old) => ({ ...old, title: event.target.value }))
              }
              placeholder="Contoh: Kebiasaan makan untuk mendukung pertumbuhan"
            />
          </label>

          <div className="staff-blog-editor-row">
            <label>
              Kategori
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    category: event.target.value as BlogCategory,
                  }))
                }
              >
                {blogCategories.map((item) => (
                  <option key={item} value={item}>
                    {blogCategoryLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    status: event.target.value as BlogStatus,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Publikasikan</option>
              </select>
            </label>
          </div>

          <label>
            Ringkasan
            <textarea
              value={form.excerpt}
              maxLength={280}
              rows={3}
              onChange={(event) =>
                setForm((old) => ({ ...old, excerpt: event.target.value }))
              }
              placeholder="Ringkasan singkat yang tampil di kartu artikel."
            />
          </label>

          <label>
            Isi artikel
            <textarea
              className="staff-blog-content-input"
              value={form.content}
              maxLength={12000}
              rows={14}
              onChange={(event) =>
                setForm((old) => ({ ...old, content: event.target.value }))
              }
              placeholder="Tulis isi artikel. Pisahkan paragraf dengan satu baris kosong."
            />
          </label>

          <div className="staff-blog-editor-actions">
            <button
              type="button"
              className="portal-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              <Save size={17} />
              {busy
                ? "Menyimpan…"
                : editing
                  ? "Simpan perubahan"
                  : "Simpan artikel"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
