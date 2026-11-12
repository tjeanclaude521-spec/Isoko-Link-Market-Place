import type { TranslationKey } from '@/lib/translations';

const constraintKeys: Record<string, TranslationKey> = {
  products_price_range: 'errPrice',
  products_quantity_range: 'errQuantity',
  products_name_length: 'errName',
  products_description_required: 'errDescription',
  products_unit_allowed: 'errUnit',
  products_category_required: 'errCategory',
  products_location_required: 'errLocation',
  products_contact_length: 'errPhone',
  products_image_url_valid: 'errImage',
};

const messageRules: [RegExp, TranslationKey][] = [
  [/must be signed in/i, 'errSignIn'],
  [/Only farmers can publish/i, 'errNotFarmer'],
  [/complete your profile/i, 'errProfilePhone'],
  [/Product name/i, 'errName'],
  [/Product description/i, 'errDescription'],
  [/Price must/i, 'errPrice'],
  [/valid unit/i, 'errUnit'],
  [/Quantity cannot/i, 'errQuantity'],
  [/valid category/i, 'errCategory'],
  [/District, sector/i, 'errLocation'],
  [/Contact phone/i, 'errPhone'],
  [/WhatsApp number/i, 'errWhatsapp'],
  [/image link/i, 'errImage'],
];

export function productErrorKey(message: string): TranslationKey {
  const constraint = Object.keys(constraintKeys).find((name) => message.includes(name));
  if (constraint) return constraintKeys[constraint];
  return messageRules.find(([pattern]) => pattern.test(message))?.[1] ?? 'errSaveGeneric';
}
