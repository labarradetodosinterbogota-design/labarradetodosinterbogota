import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, SendHorizontal, Video } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Input, Select, Spinner, TextArea } from '../../components/atoms';
import { Pagination, SearchBar } from '../../components/molecules';
import { useAuth } from '../../context/AuthContext';
import { useCreateForumComment, useCreateForumPost, useForumComments, useForumPosts } from '../../hooks';
import { FORUM_CATEGORY_OPTIONS } from '../../services/forumService';

const POSTS_PER_PAGE = 12;
const COMMENTS_PER_PAGE = 20;
const CONTENT_PREVIEW_MAX_CHARS = 380;
const DEFAULT_POST_CATEGORY = FORUM_CATEGORY_OPTIONS[0]?.value ?? 'general';
const FORUM_POST_CATEGORY_OPTIONS = [...FORUM_CATEGORY_OPTIONS];
const DEFAULT_FORUM_MEET_URL = 'https://meet.google.com/new';
const FORUM_MEET_HOST = 'meet.google.com';

const FORUM_FILTER_CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  ...FORUM_CATEGORY_OPTIONS,
];

const FORUM_CATEGORY_LABEL_MAP: ReadonlyMap<string, string> = new Map(
  FORUM_CATEGORY_OPTIONS.map((item) => [item.value, item.label])
);

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  return date.toLocaleString();
}

function getCategoryLabel(category: string): string {
  return FORUM_CATEGORY_LABEL_MAP.get(category) ?? 'General';
}

function getInitials(fullName: string): string {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'IN';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function getAuthorName(rawName: string): string {
  const name = rawName.trim();
  return name.length > 0 ? name : 'Integrante';
}

function toContentPreview(content: string): string {
  if (content.length <= CONTENT_PREVIEW_MAX_CHARS) return content;
  return `${content.slice(0, CONTENT_PREVIEW_MAX_CHARS)}...`;
}

function getForumMeetUrlConfig(): { url: string; isFallback: boolean } {
  const configuredUrl = import.meta.env.VITE_FORUM_MEET_URL?.trim();
  if (!configuredUrl) {
    return { url: DEFAULT_FORUM_MEET_URL, isFallback: true };
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    const isSecureMeetUrl =
      parsedUrl.protocol === 'https:' && parsedUrl.hostname.toLowerCase() === FORUM_MEET_HOST;
    if (!isSecureMeetUrl) {
      return { url: DEFAULT_FORUM_MEET_URL, isFallback: true };
    }

    return { url: parsedUrl.toString(), isFallback: false };
  } catch {
    return { url: DEFAULT_FORUM_MEET_URL, isFallback: true };
  }
}

export const Forum: React.FC = () => {
  const { user } = useAuth();
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [activePostId, setActivePostId] = React.useState<string | null>(null);
  const [commentsPage, setCommentsPage] = React.useState(1);

  const [newPostTitle, setNewPostTitle] = React.useState('');
  const [newPostCategory, setNewPostCategory] = React.useState(DEFAULT_POST_CATEGORY);
  const [newPostContent, setNewPostContent] = React.useState('');
  const [newCommentContent, setNewCommentContent] = React.useState('');
  const forumMeetConfig = React.useMemo(() => getForumMeetUrlConfig(), []);

  const postsQuery = useForumPosts(page, POSTS_PER_PAGE, searchQuery, categoryFilter);
  const commentsQuery = useForumComments(activePostId, commentsPage, COMMENTS_PER_PAGE);
  const createPostMutation = useCreateForumPost();
  const createCommentMutation = useCreateForumComment();

  const posts = React.useMemo(() => postsQuery.data?.data ?? [], [postsQuery.data]);
  const totalPosts = postsQuery.data?.total ?? 0;

  React.useEffect(() => {
    if (!activePostId) return;
    const visibleInCurrentPage = posts.some((post) => post.id === activePostId);
    if (!visibleInCurrentPage) {
      setActivePostId(null);
      setCommentsPage(1);
      setNewCommentContent('');
    }
  }, [activePostId, posts]);

  const onSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const onCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(event.target.value);
    setPage(1);
  };

  const onCreatePost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) return;

    try {
      await createPostMutation.mutateAsync({
        userId: user.id,
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory,
      });
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory(DEFAULT_POST_CATEGORY);
      setPage(1);
    } catch {
      // Error surfaced through createPostMutation state.
    }
  };

  const toggleDiscussion = (postId: string) => {
    if (activePostId === postId) {
      setActivePostId(null);
      return;
    }
    setActivePostId(postId);
    setCommentsPage(1);
    setNewCommentContent('');
  };

  const onCreateComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id || !activePostId) return;

    try {
      await createCommentMutation.mutateAsync({
        postId: activePostId,
        userId: user.id,
        content: newCommentContent,
      });
      setNewCommentContent('');
      setCommentsPage(1);
    } catch {
      // Error surfaced through createCommentMutation state.
    }
  };

  const onJoinForumMeet = () => {
    window.open(forumMeetConfig.url, '_blank', 'noopener,noreferrer');
  };

  const postErrorMessage =
    createPostMutation.error instanceof Error
      ? createPostMutation.error.message
      : 'No se pudo publicar el tema.';

  const commentErrorMessage =
    createCommentMutation.error instanceof Error
      ? createCommentMutation.error.message
      : 'No se pudo publicar el comentario.';

  const totalPostsPages = postsQuery.data?.total_pages ?? 0;
  const totalCommentsPages = commentsQuery.data?.total_pages ?? 0;
  const comments = commentsQuery.data?.data ?? [];

  const renderCommentsContent = () => {
    if (commentsQuery.isLoading) {
      return (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      );
    }

    if (commentsQuery.isError) {
      return (
        <Alert
          type="error"
          message={
            commentsQuery.error instanceof Error
              ? commentsQuery.error.message
              : 'No se pudieron cargar los comentarios.'
          }
        />
      );
    }

    if (comments.length === 0) {
      return <p className="text-sm text-dark-500">Aún no hay comentarios en este tema.</p>;
    }

    return (
      <ul className="space-y-3">
        {comments.map((comment) => {
          const commentAuthorName = getAuthorName(comment.author.full_name);
          return (
            <li key={comment.id} className="rounded-lg border border-dark-100 p-3">
              <div className="flex gap-3">
                <Avatar
                  src={comment.author.photo_url}
                  size="sm"
                  initials={getInitials(commentAuthorName)}
                  alt={`Avatar de ${commentAuthorName}`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-dark-500">
                    <span className="font-medium text-dark-800">{commentAuthorName}</span>
                    <span>•</span>
                    <span>{formatDateTime(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-dark-700 whitespace-pre-line break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  let postsSection: React.ReactNode;
  if (postsQuery.isLoading) {
    postsSection = (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  } else if (posts.length === 0) {
    postsSection = (
      <div className="bg-white rounded-lg border border-dark-200 p-10 text-center">
        <MessageCircle className="w-14 h-14 text-dark-300 mx-auto mb-4 opacity-60" />
        <h3 className="text-xl font-semibold text-dark-900 mb-2">No hay temas para mostrar</h3>
        <p className="text-dark-600">
          Publica el primer tema o ajusta los filtros para ampliar los resultados.
        </p>
      </div>
    );
  } else {
    postsSection = (
      <div className="space-y-4">
        {posts.map((post) => {
          const authorName = getAuthorName(post.author.full_name);
          const authorInitials = getInitials(authorName);
          const isExpanded = activePostId === post.id;
          const contentPreview = toContentPreview(post.content);
          const isTruncated = post.content.length > contentPreview.length;

          return (
            <article key={post.id} className="bg-white rounded-lg border border-dark-200 p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-dark-900 break-words">{post.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-dark-500">
                    <span className="inline-flex items-center gap-2">
                      <Avatar
                        src={post.author.photo_url}
                        initials={authorInitials}
                        size="sm"
                        alt={`Avatar de ${authorName}`}
                        className="shrink-0"
                      />
                      <span>por {authorName}</span>
                    </span>
                    <span>•</span>
                    <Badge variant="secondary" size="sm">
                      {getCategoryLabel(post.category)}
                    </Badge>
                    <span>•</span>
                    <span>{formatDateTime(post.created_at)}</span>
                    {post.updated_at !== post.created_at && (
                      <>
                        <span>•</span>
                        <span>Editado</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="info" size="sm">
                  {post.comment_count} comentario{post.comment_count === 1 ? '' : 's'}
                </Badge>
              </div>

              <p className="mt-4 text-dark-700 whitespace-pre-line break-words">{contentPreview}</p>
              {isTruncated && (
                <p className="mt-2 text-xs text-dark-500">
                  Contenido resumido para mejorar lectura. Abre la discusión para comentar y seguir el hilo.
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant={isExpanded ? 'secondary' : 'outline'}
                  onClick={() => toggleDiscussion(post.id)}
                >
                  {isExpanded ? 'Ocultar discusión' : 'Ver discusión'}
                </Button>
              </div>

              {isExpanded && (
                <section className="mt-5 pt-5 border-t border-dark-100 space-y-4">
                  <h4 className="text-base font-semibold text-dark-900">Comentarios</h4>

                  {createCommentMutation.isError && <Alert type="error" message={commentErrorMessage} />}

                  {renderCommentsContent()}

                  {totalCommentsPages > 1 && (
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCommentsPage((prev) => Math.max(1, prev - 1))}
                        disabled={commentsPage === 1 || commentsQuery.isLoading}
                      >
                        Anteriores
                      </Button>
                      <span className="text-xs text-dark-500">
                        Página {commentsPage} de {totalCommentsPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCommentsPage((prev) => Math.min(totalCommentsPages, prev + 1))}
                        disabled={commentsPage >= totalCommentsPages || commentsQuery.isLoading}
                      >
                        Siguientes
                      </Button>
                    </div>
                  )}

                  <form onSubmit={onCreateComment} className="space-y-3">
                    <TextArea
                      label="Escribe un comentario"
                      rows={3}
                      maxLength={1500}
                      required
                      value={newCommentContent}
                      onChange={(event) => setNewCommentContent(event.target.value)}
                      placeholder="Aporta una respuesta clara para mantener el debate ordenado."
                      disabled={createCommentMutation.isPending || !user}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={createCommentMutation.isPending}
                        disabled={!user}
                      >
                        <span className="inline-flex items-center gap-2">
                          <SendHorizontal className="w-4 h-4" aria-hidden />
                          Publicar comentario
                        </span>
                      </Button>
                    </div>
                  </form>
                </section>
              )}
            </article>
          );
        })}

        {totalPostsPages > 1 && (
          <div className="pt-2">
            <Pagination currentPage={page} totalPages={totalPostsPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Foro</h1>
        <p className="text-dark-600">
          Espacio de conversación entre integrantes. Diseñado para discusiones activas de toda la barra.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-dark-600">
            ¿Prefieren resolver un tema en vivo? Ingresen a la videollamada oficial del foro.
          </p>
          <Button type="button" variant="secondary" onClick={onJoinForumMeet}>
            <span className="inline-flex items-center gap-2">
              <Video className="h-4 w-4" aria-hidden />
              Unirse por Google Meet
            </span>
          </Button>
        </div>
        {forumMeetConfig.isFallback && (
          <p className="mt-2 text-xs text-dark-500">
            Para usar una sala fija del equipo, configura <code>VITE_FORUM_MEET_URL</code> con tu enlace
            de Meet.
          </p>
        )}
        <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/80 px-4 py-3 text-sm text-dark-800">
          <p className="font-medium text-dark-900">¿Conversación al instante?</p>
          <p className="mt-1 text-dark-700">
            El foro es para temas e hilos. Para mensajes rápidos entre integrantes usa el{' '}
            <Link to="/chat" className="font-semibold text-primary-600 underline-offset-2 hover:underline">
              chat en vivo
            </Link>
            .
          </p>
        </div>
      </div>

      {!user && (
        <Alert
          type="info"
          message="Debes iniciar sesión con una cuenta activa para publicar y comentar en el foro."
        />
      )}

      <div className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">Crear nuevo tema</h2>
        {user && (
          <div className="flex items-center gap-3 rounded-lg border border-dark-100 bg-dark-50 px-3 py-2">
            <Avatar
              src={user.photo_url}
              initials={getInitials(getAuthorName(user.full_name))}
              size="sm"
              alt={`Avatar de ${getAuthorName(user.full_name)}`}
            />
            <p className="text-sm text-dark-700">
              Publicarás como <span className="font-medium">{getAuthorName(user.full_name)}</span>
            </p>
          </div>
        )}
        {createPostMutation.isError && <Alert type="error" message={postErrorMessage} />}
        <form onSubmit={onCreatePost} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Título"
                value={newPostTitle}
                onChange={(event) => setNewPostTitle(event.target.value)}
                maxLength={140}
                required
                placeholder="Ej. Organización del próximo viaje"
                disabled={createPostMutation.isPending || !user}
              />
            </div>
            <Select
              label="Categoría"
              options={FORUM_POST_CATEGORY_OPTIONS}
              value={newPostCategory}
              onChange={(event) => setNewPostCategory(event.target.value)}
              disabled={createPostMutation.isPending || !user}
            />
          </div>

          <TextArea
            label="Contenido"
            value={newPostContent}
            onChange={(event) => setNewPostContent(event.target.value)}
            rows={5}
            maxLength={5000}
            required
            placeholder="Describe tu idea, duda o propuesta con el mayor contexto posible."
            disabled={createPostMutation.isPending || !user}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={createPostMutation.isPending} disabled={!user}>
              Publicar tema
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <SearchBar
              onSearch={onSearch}
              placeholder="Buscar temas por título o contenido…"
              debounceDelay={350}
            />
          </div>
          <Select
            label="Filtrar categoría"
            options={FORUM_FILTER_CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={onCategoryChange}
          />
        </div>
        <p className="text-sm text-dark-500">
          {totalPosts} tema{totalPosts === 1 ? '' : 's'} encontrado{totalPosts === 1 ? '' : 's'}.
        </p>
      </div>

      {postsQuery.isError && (
        <Alert
          type="error"
          message={
            postsQuery.error instanceof Error
              ? postsQuery.error.message
              : 'No se pudieron cargar los temas del foro.'
          }
        />
      )}

      {postsSection}
    </div>
  );
};
