export function validateCorroborationInput(trackingId: string, type: string, description: string): string | null {
  if (!/^SHK-[A-Z0-9-]{6,64}$/i.test(trackingId.trim())) return 'Enter the tracking ID shown on the claim receipt.';
  if (type !== 'firsthand' && type !== 'heard_from_others') return 'Choose firsthand observation or information heard from others.';
  if (description.trim().length > 2000) return 'Description must be 2000 characters or fewer.';
  return null;
}
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
export function validateCorroborationFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return 'Choose a PDF, JPEG, PNG, or WebP file.';
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) return 'File size must be between 1 byte and 10 MB.';
  return null;
}
