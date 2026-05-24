import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BUCKET = "apiary-images";

export function getApiaryImageUrl(apiaryId) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${apiaryId}.jpg`;
}

export async function compressImage(buffer) {
  return sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
}

export async function uploadToSupabase(apiaryId, buffer) {
  const path = `${apiaryId}.jpg`;
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upload failed: ${response.status} ${text}`);
  }
}

export async function deleteFromSupabase(apiaryId) {
  const path = `${apiaryId}.jpg`;
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
}
