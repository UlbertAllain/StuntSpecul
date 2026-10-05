"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, Pencil, Plus, UserRound } from "lucide-react";
import type { ParentAccountView } from "@/lib/portal";
import { formatDetailedAge } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { uploadProfilePhoto } from "@/lib/cloudinary";
import { Message } from "../shared/shell";

function maskNik(nik: string | null) {
  if (!nik) return "Belum dilengkapi";
  return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
}

export function ParentProfile({
  view,
  onRefresh,
}: {
  view: ParentAccountView;
  onRefresh: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [savingChildId, setSavingChildId] = useState("");
  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChildId, setEditingChildId] = useState("");
  const [profileError, setProfileError] = useState("");
  const [childNotice, setChildNotice] = useState("");
  const [ageReferenceDate, setAgeReferenceDate] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(
      () => setAgeReferenceDate(new Date()),
      60 * 60 * 1000,
    );

    return () => window.clearInterval(timer);
  }, []);

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
          nik: formData.get("nik"),
          birthDate: formData.get("birthDate"),
          sex: formData.get("sex"),
        },
      });
      form.reset();
      setShowChildForm(false);
      setEditingChildId("");
      setChildNotice("Profil anak berhasil ditambahkan.");
      await onRefresh();
    } catch (cause) {
      setProfileError(errorMessage(cause));
    } finally {
      setAddingChild(false);
    }
  }

  async function updateChild(form: HTMLFormElement, childId: string) {
    if (savingChildId) return;

    const formData = new FormData(form);
    setSavingChildId(childId);
    setProfileError("");
    setChildNotice("");

    try {
      await api(`/parent-account/children/${childId}`, {
        method: "PATCH",
        body: {
          name: formData.get("name"),
          nik: formData.get("nik"),
          birthDate: formData.get("birthDate"),
          sex: formData.get("sex"),
        },
      });
      setEditingChildId("");
      setChildNotice("Data anak berhasil diperbarui.");
      await onRefresh();
    } catch (cause) {
      setProfileError(errorMessage(cause));
    } finally {
      setSavingChildId("");
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
            onClick={() => {
              setEditingChildId("");
              setShowChildForm((value) => !value);
            }}
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
              NIK anak
              <input
                name="nik"
                inputMode="numeric"
                pattern="[0-9]{16}"
                minLength={16}
                maxLength={16}
                required
                placeholder="16 digit NIK anak"
                autoComplete="off"
              />
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
            <div key={child.id} className="parent-child-profile-entry">
              <article className="parent-child-profile-item">
                <span className="parent-child-profile-avatar">
                  <UserRound size={18} />
                </span>
                <div>
                  <strong>{child.name}</strong>
                  <small>
                    {formatDetailedAge(child.birthDate, ageReferenceDate)} ·{" "}
                    {child.sex === "male" ? "Laki-laki" : "Perempuan"}
                  </small>
                  <small>NIK {maskNik(child.nik)}</small>
                  <small>Kode {child.code}</small>
                </div>
                <button
                  type="button"
                  className="portal-secondary parent-child-edit-button"
                  onClick={() => {
                    setShowChildForm(false);
                    setEditingChildId((current) =>
                      current === child.id ? "" : child.id,
                    );
                    setProfileError("");
                    setChildNotice("");
                  }}
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </article>

              {editingChildId === child.id && (
                <form
                  className="profile-form parent-add-child-form parent-edit-child-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void updateChild(event.currentTarget, child.id);
                  }}
                >
                  <label>
                    Nama anak
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      defaultValue={child.name}
                    />
                  </label>
                  <label>
                    NIK anak
                    <input
                      name="nik"
                      inputMode="numeric"
                      pattern="[0-9]{16}"
                      minLength={16}
                      maxLength={16}
                      required
                      defaultValue={child.nik ?? ""}
                      placeholder={
                        child.nik ? "16 digit NIK anak" : "Lengkapi NIK anak"
                      }
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Tanggal lahir
                    <input
                      name="birthDate"
                      type="date"
                      required
                      defaultValue={child.birthDate}
                    />
                  </label>
                  <label>
                    Jenis kelamin
                    <select name="sex" defaultValue={child.sex} required>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </label>
                  <div className="parent-edit-child-actions">
                    <button
                      type="button"
                      className="portal-secondary"
                      disabled={savingChildId === child.id}
                      onClick={() => setEditingChildId("")}
                    >
                      Batal
                    </button>
                    <button
                      className="portal-primary"
                      disabled={savingChildId === child.id}
                    >
                      {savingChildId === child.id
                        ? "Menyimpan…"
                        : "Simpan perubahan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="portal-note profile-note">
        Umur dihitung otomatis dari tanggal lahir dan akan berubah seiring
        waktu. Anak lama yang belum memiliki NIK tetap bisa dibuka, tetapi NIK
        perlu dilengkapi saat data anak diedit. NIK ditampilkan dalam bentuk
        tersamarkan. Perubahan profil berlaku untuk pemeriksaan berikutnya;
        riwayat lama tetap tersimpan sebagai data saat pemeriksaan dilakukan.
      </p>
    </>
  );
}
