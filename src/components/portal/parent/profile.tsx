"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera } from "lucide-react";
import type { ParentAccountView } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { uploadProfilePhoto } from "@/lib/cloudinary";
import { Message } from "../shared/shell";

export function ParentProfile({
  view,
  onRefresh,
}: {
  view: ParentAccountView;
  onRefresh: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const child = view.children[0];

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
      <section className="profile-menu-card">
        <div>
          <span>Profil anak</span>
          <strong>{child?.name || "Belum ada profil"}</strong>
        </div>
        {child && (
          <>
            <div>
              <span>Tanggal lahir</span>
              <strong>
                {new Date(`${child.birthDate}T00:00:00Z`).toLocaleDateString(
                  "id-ID",
                )}
              </strong>
            </div>
            <div>
              <span>Jenis kelamin</span>
              <strong>
                {child.sex === "male" ? "Laki-laki" : "Perempuan"}
              </strong>
            </div>
            <div>
              <span>Kode anak</span>
              <strong>{child.code}</strong>
            </div>
          </>
        )}
      </section>
      <p className="portal-note profile-note">
        Foto profil membantu membedakan akun. Data pemeriksaan tidak dapat
        diubah dari halaman profil.
      </p>
    </>
  );
}

