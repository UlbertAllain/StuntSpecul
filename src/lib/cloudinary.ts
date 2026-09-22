"use client";

export type CloudinaryUpload = {
  secureUrl: string;
  publicId: string;
};

export async function uploadProfilePhoto(
  file: File,
): Promise<CloudinaryUpload> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Pilih file gambar untuk foto profil.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "stuntspecula/profile");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  const payload = (await response.json().catch(() => null)) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload?.secure_url || !payload.public_id) {
    throw new Error(
      payload?.error?.message || "Foto profil gagal diunggah ke Cloudinary.",
    );
  }

  return { secureUrl: payload.secure_url, publicId: payload.public_id };
}
