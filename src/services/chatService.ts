import { supabase } from './supabaseClient';
import { chatImageUploadService } from './chatImageUploadService';
import type { ChatMemberSummary, ChatMessage } from '../types';

const CHAT_MESSAGE_MAX_LENGTH = 1000;
const CHAT_RECENT_LIMIT = 120;

type ChatMessageRowDb = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  image_storage_path: string | null;
  users: { full_name: string; photo_url: string | null } | null;
};

function normalizeUserRelation(
  users: unknown
): { full_name: string; photo_url: string | null } | null {
  if (!users) return null;
  if (Array.isArray(users)) {
    const first = users[0];
    if (!first || typeof first !== 'object') return null;
    const fullName = (first as { full_name?: unknown }).full_name;
    const photoUrl = (first as { photo_url?: unknown }).photo_url;
    return {
      full_name: typeof fullName === 'string' ? fullName : '',
      photo_url: typeof photoUrl === 'string' ? photoUrl : null,
    };
  }
  if (typeof users === 'object') {
    const fullName = (users as { full_name?: unknown }).full_name;
    const photoUrl = (users as { photo_url?: unknown }).photo_url;
    return {
      full_name: typeof fullName === 'string' ? fullName : '',
      photo_url: typeof photoUrl === 'string' ? photoUrl : null,
    };
  }
  return null;
}

function normalizeStoragePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveImagePublicUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  return chatImageUploadService.getPublicUrl(storagePath);
}

function toChatMessage(row: ChatMessageRowDb): ChatMessage {
  const userRel = normalizeUserRelation(row.users);
  const name = userRel?.full_name?.trim() || 'Integrante';
  const imagePath = normalizeStoragePath(row.image_storage_path);
  return {
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    author_name: name.length > 0 ? name : 'Integrante',
    author_photo_url: userRel?.photo_url ?? null,
    image_storage_path: imagePath,
    image_url: resolveImagePublicUrl(imagePath),
  };
}

function validateOutgoingMessage(content: string, imageStoragePath: string | null): string {
  const trimmed = content.trim();
  const hasImage = imageStoragePath !== null;
  if (!hasImage && trimmed.length === 0) {
    throw new Error('Escribe un mensaje o adjunta una imagen.');
  }
  if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error(`El mensaje no puede superar ${CHAT_MESSAGE_MAX_LENGTH} caracteres.`);
  }
  return trimmed;
}

export const chatService = {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_RECENT_LIMIT,

  resolveChatImagePublicUrl: resolveImagePublicUrl,

  async listRecentMessages(): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(
        `
        id,
        user_id,
        content,
        created_at,
        image_storage_path,
        users(full_name, photo_url)
      `
      )
      .order('created_at', { ascending: false })
      .limit(CHAT_RECENT_LIMIT);

    if (error) throw error;
    const rawRows = (data ?? []) as unknown[];
    const rows: ChatMessageRowDb[] = rawRows.map((raw) => {
      const row = raw as {
        id: string;
        user_id: string;
        content: string;
        created_at: string;
        image_storage_path?: unknown;
        users?: unknown;
      };
      return {
        id: row.id,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        image_storage_path: normalizeStoragePath(row.image_storage_path),
        users: normalizeUserRelation(row.users),
      };
    });
    const chronological = [...rows].reverse();
    return chronological.map(toChatMessage);
  },

  async listActiveMemberSummaries(): Promise<ChatMemberSummary[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as ChatMemberSummary[];
  },

  async sendMessage(
    userId: string,
    content: string,
    imageStoragePath: string | null = null
  ): Promise<ChatMessage> {
    const path = normalizeStoragePath(imageStoragePath);
    const cleanContent = validateOutgoingMessage(content, path);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        content: cleanContent,
        image_storage_path: path,
      })
      .select(
        `
        id,
        user_id,
        content,
        created_at,
        image_storage_path,
        users(full_name, photo_url)
      `
      )
      .single();

    if (error) throw error;
    const row = data as {
      id: string;
      user_id: string;
      content: string;
      created_at: string;
      image_storage_path?: unknown;
      users?: unknown;
    };
    return toChatMessage({
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      image_storage_path: normalizeStoragePath(row.image_storage_path),
      users: normalizeUserRelation(row.users),
    });
  },
};
