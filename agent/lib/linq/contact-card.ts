import { LinqAPIV3 } from "@linqapp/sdk";
import { z } from "zod";
import { linqCredentials } from "@agent/lib/linq/transport";
import { applicationOrigin } from "@shared/environment/origin";

const conflictSchema = z.object({ status: z.literal(409) });
const notFoundSchema = z.object({ status: z.literal(404) });
// Lines whose card Linq has confirmed active during this process.
const activeCardNumbers = new Set<string>();

/**
 * Shares Boostle's iMessage Name and Photo card into a Linq chat, setting up
 * the line's card on first use. Returns whether Linq accepted the share.
 */
export async function shareLinqContactCard(chatId: string) {
  const client = new LinqAPIV3({ apiKey: await linqCredentials.apiKey() });
  const chat = await client.chats.retrieve(chatId);
  const phoneNumber = chat.handles.find((handle) => handle.is_me)?.handle;
  // Name and Photo Sharing exists only in iMessage, not SMS or RCS.
  if (chat.service !== "iMessage" || !phoneNumber) return false;
  if (!(await ensureActiveContactCard(client, phoneNumber))) return false;
  await client.chats.shareContactCard(chatId);
  return true;
}

async function ensureActiveContactCard(client: LinqAPIV3, phoneNumber: string) {
  if (activeCardNumbers.has(phoneNumber)) return true;
  let active = (await readContactCards(client, phoneNumber)).some(
    (card) => card.is_active
  );
  if (!active) {
    try {
      const card = await client.contactCard.create({
        first_name: "Boostle",
        image_url: contactCardImageUrl(),
        phone_number: phoneNumber,
      });
      // An incomplete setup stays inactive; a later share retries creation.
      active = card.is_active;
    } catch (error) {
      // Linq refuses to overwrite a card that became active concurrently.
      if (!conflictSchema.safeParse(error).success) throw error;
      active = true;
    }
  }
  if (active) activeCardNumbers.add(phoneNumber);
  return active;
}

async function readContactCards(client: LinqAPIV3, phoneNumber: string) {
  try {
    const { contact_cards } = await client.contactCard.retrieve({
      phone_number: phoneNumber,
    });
    return contact_cards;
  } catch (error) {
    if (!notFoundSchema.safeParse(error).success) throw error;
    return [];
  }
}

function contactCardImageUrl() {
  const url = new URL("/apple-icon.png", applicationOrigin());
  if (url.protocol !== "https:") {
    throw new Error(
      "Contact card setup requires a public HTTPS application URL."
    );
  }
  return url.href;
}
