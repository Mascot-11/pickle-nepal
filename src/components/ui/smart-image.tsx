import Image from "next/image";

/**
 * Images come from seed data and user uploads. `next.config.ts` allows any
 * https source plus local paths; this wrapper just standardises the box.
 */
export function SmartImage({
  src,
  alt,
  className = "",
  fallbackLabel,
  priority = false,
}: {
  src?: string | null | undefined;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  seed?: string;
  priority?: boolean;
}) {
  if (!src || src.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-brand-100 text-2xl ${className}`}
        aria-hidden="true"
      >
        {fallbackLabel ?? "🎾"}
      </div>
    );
  }

  if (src.startsWith("/uploads/") || src.startsWith("/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`object-cover ${className}`} loading={priority ? "eager" : "lazy"} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={500}
      className={`object-cover ${className}`}
      unoptimized
    />
  );
}