"use client";

export type CloudinaryUpload = {
  secureUrl: string;
  publicId: string;
};

export async function uploadProfilePhoto(
  file: File,
): Promise<CloudinaryUpload> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pilih file gambar untuk foto profil.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/uploads/profile-photo", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as {
    success: boolean;
    data?: CloudinaryUpload;
    message?: string;
  } | null;

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(
      payload?.message || "Foto profil gagal diunggah. Silakan coba lagi.",
    );
  }

  return payload.data;
}


export async function uploadLatestFacePhoto(
  photo: Blob,
  examinationId: string,
): Promise<CloudinaryUpload> {
  if (!photo.type.startsWith("image/")) {
    throw new Error("Foto wajah tidak valid.");
  }

  if (photo.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran foto wajah terlalu besar.");
  }

  const form = new FormData();
  form.append("file", photo, "latest-face.jpg");

  const response = await fetch("/api/station/face-photo", {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-examination-id": examinationId },
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as {
    success: boolean;
    data?: CloudinaryUpload;
    message?: string;
  } | null;

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(
      payload?.message || "Foto wajah belum berhasil disimpan.",
    );
  }

  return payload.data;
}
