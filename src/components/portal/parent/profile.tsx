"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, Plus, UserRound } from "lucide-react";
import type { ParentAccountView } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { uploadProfilePhoto } from "@/lib/cloudinary";
import { formatAge } from "@/lib/screening";
import { Message } from "../shared/shell";

export function ParentProfile({
  view,
  onRefresh,
}: {
  view: ParentAccountView;
  onRefresh: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [childNotice, setChildNotice] = useState("");

  async function uploadAvatar(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setProfileError("");
    try {
      const uploaded = await uploadProfilePhoto(file);
      await api("/parent-account/profile", {
        method: "PATCH",
        body: {
          avatarUrl: uploaded.secureUrl,
          avatarPublicId: uploaded.publicId,
        },
      });
      await onRefresh();
    } catch (cause) {
      setProfileError(errorMessage(cause));
    } finally {
      setUploading(false);
    }
  }

  async function addChild(form: HTMLFormElement) {
    if (addingChild) return;
    const formData = new FormData(form);
    setAddingChild(true);
    setProfileError("");
    setChildNotice("");

    try {
      await api("/parent-account/children", {
        method: "POST",
        body: {
          name: formData.get("name"),
          birthDate: formData.get("birthDate"),
          sex: formData.get("sex"),
        },
      });
      form.reset();
      setShowChildForm(false);
      setChildNotice("Profil anak berhasil ditambahkan.");
      await onRefresh();
    } catch (cause) {
      setProfileError(errorMessage(cause));
    } finally {
      setAddingChild(false);
    }
  }

  return (
    <>
      <section className="parent-profile-hero">
        <label className="parent-profile-photo">
          {view.parent.avatarUrl ? (
            <Image
              src={view.parent.avatarUrl}
              alt={view.parent.name}
              width={184}
              height={184}
              unoptimized
            />
          ) : (
            <span>{view.parent.name.slice(0, 1).toUpperCase()}</span>
          )}
          <i>
            <Camera size={16} />
          </i>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => void uploadAvatar(event.target.files?.[0])}
          />
        </label>
        <h2>{view.parent.name}</h2>
        <p>{view.parent.email}</p>
        <small>
          {uploading ? "Mengunggah foto…" : "Tekan foto untuk mengganti profil"}
        </small>
      </section>

      {profileError && <Message error>{profileError}</Message>}
      {childNotice && <Message>{childNotice}</Message>}

      <section className="profile-menu-card parent-children-card">
        <div className="parent-children-heading">
          <div>
            <span>PROFIL ANAK</span>
            <strong>{view.children.length} anak terdaftar</strong>
          </div>
          <button
            type="button"
            className="portal-secondary"
            onClick={() => setShowChildForm((value) => !value)}
          >
            <Plus size={16} />
            Tambah anak
          </button>
        </div>

        {showChildForm && (
          <form
            className="profile-form parent-add-child-form"
            onSubmit={(event) => {
              event.preventDefault();
              void addChild(event.currentTarget);
            }}
          >
            <label>
              Nama anak
              <input name="name" required minLength={2} maxLength={80} />
            </label>
            <label>
              Tanggal lahir
              <input name="birthDate" type="date" required />
            </label>
            <label>
              Jenis kelamin
              <select name="sex" defaultValue="male" required>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </label>
            <button className="portal-primary" disabled={addingChild}>
              {addingChild ? "Menambahkan…" : "Simpan anak"}
            </button>
          </form>
        )}

        <div className="parent-child-profile-list">
          {view.children.map((child) => (
            <article key={child.id} className="parent-child-profile-item">
              <span className="parent-child-profile-avatar">
                <UserRound size={18} />
              </span>
              <div>
                <strong>{child.name}</strong>
                <small>
                  {formatAge(ageInMonths(child.birthDate))} ·{" "}
                  {child.sex === "male" ? "Laki-laki" : "Perempuan"}
                </small>
                <small>Kode {child.code}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="portal-note profile-note">
        Setiap anak memiliki riwayat pemeriksaan dan foto terakhirnya sendiri.
        Data pemeriksaan tidak dapat diubah dari halaman profil.
      </p>
    </>
  );
}
