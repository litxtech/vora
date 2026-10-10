import Link from 'next/link';
import { IconBubble, IconPin, IconRepeat, IconShare } from '@/components/app-icons';
import { OfflineLike, OfflineSave } from '@/components/offline/offline-engage';
import { displayName, type PublicPost } from '@/lib/data';
import { cityById } from '@/lib/cities';

function feedTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} g`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

export function FeedCard({ post, heading = 'h2' }: { post: PublicPost; heading?: 'h1' | 'h2' }) {
  const name = displayName(post.author_name, post.author_username);
  const city = cityById(post.region_id)?.name;
  const Title = heading;
  const text = post.content.trim();
  return (
    <article className="feed-card">
      <Link href={`/u/${post.author_username}`} className="feed-avatar" aria-hidden="true">
        {post.author_avatar ? <img src={post.author_avatar} alt="" /> : name.slice(0, 1).toUpperCase()}
      </Link>
      <div className="feed-main">
        <header className="feed-head">
          <Link href={`/u/${post.author_username}`} className="feed-name">
            {name}
          </Link>
          <span className="feed-meta">
            @{post.author_username} · <time dateTime={post.created_at}>{feedTime(post.created_at)}</time>
          </span>
        </header>
        {city || (post.category && post.category !== 'general') ? (
          <p className="feed-chips">
            {post.category && post.category !== 'general' ? <span>{post.category}</span> : null}
            {city ? (
              <Link href={`/city/${post.region_id}`}>
                <IconPin />
                {city}
              </Link>
            ) : null}
          </p>
        ) : null}
        {post.title ? (
          <Title className="feed-title">
            <Link href={`/p/${post.id}`}>{post.title}</Link>
          </Title>
        ) : text ? (
          <Title className="feed-title">
            <Link href={`/p/${post.id}`}>{text}</Link>
          </Title>
        ) : null}
        {post.title && text ? <p className="feed-copy">{text}</p> : null}
        {post.media_urls[0] ? (
          <Link href={`/p/${post.id}`} className="feed-media">
            <img src={post.media_urls[0]} alt="" />
          </Link>
        ) : null}
        <div className="feed-actions">
          <Link href={`/p/${post.id}`} aria-label="Yorum">
            <IconBubble />
          </Link>
          <Link href="/login" aria-label="Alıntıla">
            <IconRepeat />
          </Link>
          <OfflineLike postId={post.id} />
          <span className="feed-actions-end">
            <OfflineSave postId={post.id} />
            <Link href={`/p/${post.id}`} aria-label="Paylaş">
              <IconShare />
            </Link>
          </span>
        </div>
      </div>
    </article>
  );
}
