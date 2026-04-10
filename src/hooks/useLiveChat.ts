import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { ChatMemberSummary, ChatMessage, User } from '../types';
import {
  CHAT_IMAGES_BUCKET_ID,
  chatImageUploadService,
} from '../services/chatImageUploadService';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabaseClient';
import { compressImageForChat } from '../utils/compressImageForChat';

type RealtimeConnectionState = 'idle' | 'connecting' | 'subscribed' | 'disconnected';

function parsePresenceOnlineUserIds(state: Record<string, unknown[]>): Set<string> {
  const ids = new Set<string>();
  for (const presences of Object.values(state)) {
    if (!Array.isArray(presences)) continue;
    for (const raw of presences) {
      if (!raw || typeof raw !== 'object') continue;
      const userId = (raw as { user_id?: unknown }).user_id;
      if (typeof userId === 'string' && userId.length > 0) {
        ids.add(userId);
      }
    }
  }
  return ids;
}

function buildMemberNameMap(members: ChatMemberSummary[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const member of members) {
    const name = member.full_name.trim();
    map.set(member.id, name.length > 0 ? name : 'Integrante');
  }
  return map;
}

function mergeAuthorFromMessages(messages: ChatMessage[], nameMap: Map<string, string>): void {
  for (const message of messages) {
    if (!nameMap.has(message.user_id)) {
      nameMap.set(message.user_id, message.author_name);
    }
  }
}

type ChatInsertRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  image_storage_path: string | null;
};

function readInsertRow(payload: RealtimePostgresChangesPayload<Record<string, unknown>>): ChatInsertRow | null {
  const rowUnknown = payload.new;
  if (!rowUnknown || typeof rowUnknown !== 'object') return null;
  const row = rowUnknown as Record<string, unknown>;
  const id = row.id;
  const userId = row.user_id;
  const content = row.content;
  const createdAt = row.created_at;
  const imageRaw = row.image_storage_path;
  if (typeof id !== 'string' || typeof userId !== 'string') return null;
  if (typeof content !== 'string' || typeof createdAt !== 'string') return null;
  const imagePath =
    typeof imageRaw === 'string' && imageRaw.trim().length > 0 ? imageRaw.trim() : null;
  return { id, user_id: userId, content, created_at: createdAt, image_storage_path: imagePath };
}

type ChatRefs = {
  seenMessageIds: MutableRefObject<Set<string>>;
  nameByUserId: MutableRefObject<Map<string, string>>;
  photoByUserId: MutableRefObject<Map<string, string | null>>;
};

function handleChatInsertPayload(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  refs: ChatRefs,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
): void {
  const row = readInsertRow(payload);
  if (!row) return;
  if (refs.seenMessageIds.current.has(row.id)) return;
  refs.seenMessageIds.current.add(row.id);

  const authorName = refs.nameByUserId.current.get(row.user_id) ?? 'Integrante';
  const authorPhoto = refs.photoByUserId.current.get(row.user_id) ?? null;
  const imagePath = row.image_storage_path;
  const imageUrl = imagePath ? chatImageUploadService.getPublicUrl(imagePath) : null;

  const incoming: ChatMessage = {
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    author_name: authorName,
    author_photo_url: authorPhoto,
    image_storage_path: imagePath,
    image_url: imageUrl,
  };

  setMessages((previous) => [...previous, incoming].slice(-chatService.CHAT_RECENT_LIMIT));
}

async function uploadChatImageIfPresent(file: File, userId: string): Promise<string> {
  const compressed = await compressImageForChat(file);
  return chatImageUploadService.uploadCompressedImage(
    compressed.blob,
    userId,
    compressed.contentType
  );
}

function subscribeChatChannel(
  user: User,
  channel: RealtimeChannel,
  refs: ChatRefs,
  setOnlineUserIds: Dispatch<SetStateAction<Set<string>>>,
  setRealtimeState: Dispatch<SetStateAction<RealtimeConnectionState>>,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
): void {
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    setOnlineUserIds(parsePresenceOnlineUserIds(state));
  });

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      handleChatInsertPayload(payload, refs, setMessages);
    }
  );

  setRealtimeState('connecting');

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      setRealtimeState('subscribed');
      const trackResult = channel.track({
        user_id: user.id,
        full_name: user.full_name,
      });
      if (trackResult instanceof Promise) {
        await trackResult;
      }
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      setRealtimeState('disconnected');
    }
  });
}

export function useLiveChat(user: User | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMemberSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>('idle');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const nameByUserIdRef = useRef<Map<string, string>>(new Map());
  const photoByUserIdRef = useRef<Map<string, string | null>>(new Map());

  const refs: ChatRefs = {
    seenMessageIds: seenMessageIdsRef,
    nameByUserId: nameByUserIdRef,
    photoByUserId: photoByUserIdRef,
  };

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setMembers([]);
      setOnlineUserIds(new Set());
      setLoadError(null);
      setIsLoadingInitial(false);
      seenMessageIdsRef.current = new Set();
      return;
    }

    let cancelled = false;
    setIsLoadingInitial(true);
    setLoadError(null);

    void (async () => {
      try {
        const [initialMessages, activeMembers] = await Promise.all([
          chatService.listRecentMessages(),
          chatService.listActiveMemberSummaries(),
        ]);
        if (cancelled) return;

        const nextSeen = new Set<string>();
        for (const message of initialMessages) {
          nextSeen.add(message.id);
        }
        seenMessageIdsRef.current = nextSeen;

        const nameMap = buildMemberNameMap(activeMembers);
        mergeAuthorFromMessages(initialMessages, nameMap);
        nameByUserIdRef.current = nameMap;

        const photoMap = new Map<string, string | null>();
        for (const message of initialMessages) {
          photoMap.set(message.user_id, message.author_photo_url);
        }
        photoByUserIdRef.current = photoMap;

        setMessages(initialMessages);
        setMembers(activeMembers);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el chat.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInitial(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Solo dependemos del id: el objeto `user` puede cambiar de referencia sin ser otro integrante.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('barra-live-chat', {
      config: { presence: { key: user.id } },
    });

    subscribeChatChannel(user, channel, refs, setOnlineUserIds, setRealtimeState, setMessages);

    return () => {
      supabase.removeChannel(channel);
      setRealtimeState('idle');
      setOnlineUserIds(new Set());
    };
    // `refs` apunta a instancias estables de useRef; re-suscribir solo al cambiar identidad/presencia visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario
  }, [user?.id, user?.full_name]);

  const sendMessage = useCallback(
    async (rawText: string, imageFile: File | null = null): Promise<boolean> => {
      if (!user) return false;
      if (rawText.trim().length === 0 && !imageFile) return false;

      setSendError(null);
      setIsSending(true);
      try {
        const imageStoragePath = imageFile
          ? await uploadChatImageIfPresent(imageFile, user.id)
          : null;
        try {
          const created = await chatService.sendMessage(user.id, rawText, imageStoragePath);
          if (!seenMessageIdsRef.current.has(created.id)) {
            seenMessageIdsRef.current.add(created.id);
            nameByUserIdRef.current.set(created.user_id, created.author_name);
            photoByUserIdRef.current.set(created.user_id, created.author_photo_url);
            setMessages((previous) =>
              [...previous, created].slice(-chatService.CHAT_RECENT_LIMIT)
            );
          }
          return true;
        } catch (insertError) {
          if (imageStoragePath) {
            const { error: removeError } = await supabase.storage
              .from(CHAT_IMAGES_BUCKET_ID)
              .remove([imageStoragePath]);
            if (removeError && import.meta.env.DEV) {
              console.warn('Chat image rollback warning:', removeError.message);
            }
          }
          throw insertError;
        }
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [user]
  );

  return {
    messages,
    members,
    onlineUserIds,
    loadError,
    sendError,
    realtimeState,
    isSending,
    isLoadingInitial,
    sendMessage,
  };
}
