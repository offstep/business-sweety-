import { sb } from './supabase.js';

// Nom du bucket Supabase Storage : à vérifier dans ton projet (variable VITE_STORAGE_BUCKET).
export const BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'images';

export async function uploadImage(file, folder) {
  if (!file || !file.size) return null;
  const ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
