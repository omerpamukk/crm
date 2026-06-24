/** Kanal marka logoları — gerçek renkleriyle (lucide'de marka ikonu yok). */

type LogoProps = { className?: string };

export function InstagramLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0" stopColor="#fdf497" />
          <stop offset="0.05" stopColor="#fdf497" />
          <stop offset="0.45" stopColor="#fd5949" />
          <stop offset="0.6" stopColor="#d6249f" />
          <stop offset="0.9" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="#fff" />
    </svg>
  );
}

export function WhatsappLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        fill="#fff"
        d="M12 6.4a5.6 5.6 0 0 0-4.8 8.5l-.8 2.9 3-.78A5.6 5.6 0 1 0 12 6.4Zm3.27 7.78c-.14.39-.8.74-1.1.76-.28.03-.64.04-1.04-.07a8.3 8.3 0 0 1-3-1.84 6.8 6.8 0 0 1-1.35-1.86c-.14-.26-.02-.41.12-.55.13-.12.28-.31.42-.47.07-.1.09-.18.14-.3a.36.36 0 0 0-.02-.34c-.05-.1-.42-1-.57-1.37-.15-.36-.3-.3-.42-.31h-.35a.68.68 0 0 0-.49.23c-.17.18-.64.62-.64 1.52s.66 1.77.76 1.9c.09.12 1.3 2.03 3.17 2.79.44.19.79.3 1.06.39.44.14.85.12 1.17.07.36-.05 1.1-.45 1.25-.88.16-.43.16-.8.11-.88-.05-.07-.17-.12-.35-.2Z"
      />
    </svg>
  );
}

export function MessengerLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ms-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0099FF" />
          <stop offset="0.6" stopColor="#A033FF" />
          <stop offset="1" stopColor="#FF5280" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ms-grad)"
        d="M12 2C6.3 2 2 6.2 2 11.6c0 2.83 1.22 5.27 3.2 6.95.17.14.27.35.27.57l.06 1.78c.02.57.6.94 1.12.7l1.98-.87c.16-.08.35-.09.52-.04.83.23 1.72.35 2.65.35 5.7 0 10-4.2 10-9.6S17.7 2 12 2Z"
      />
      <path
        fill="#fff"
        d="m5.8 14.7 2.94-4.66c.47-.74 1.47-.92 2.17-.4l2.33 1.75c.21.16.5.16.72 0l3.15-2.39c.42-.32.97.18.69.63l-2.94 4.66c-.47.74-1.47.92-2.17.4l-2.33-1.75a.6.6 0 0 0-.72 0L6.49 15.3c-.42.32-.97-.18-.69-.63Z"
      />
    </svg>
  );
}

export function TiktokLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#25F4EE"
        d="M15.8 2.5c.3 2 1.5 3.7 3.6 4.1v2.5c-1.25 0-2.45-.4-3.5-1.05V14c0 3.07-2.46 5.55-5.5 5.55-1.05 0-2.03-.3-2.86-.82a5.45 5.45 0 0 0 3.66 1.42c3.04 0 5.5-2.48 5.5-5.55V8.45c1.05.65 2.25 1.05 3.5 1.05V6.6h-.04c-2.1-.4-3.32-1.6-3.62-3.6V2.5h-.2Z"
      />
      <path
        fill="#FE2C55"
        d="M14.9 2.5c.3 2 1.52 3.2 3.62 3.6V8.5c-1.25 0-2.45-.4-3.5-1.05V14c0 3.07-2.46 5.55-5.5 5.55-1.05 0-2.03-.3-2.86-.82a5.46 5.46 0 0 1-1.06-3.2c0-3.02 2.41-5.48 5.4-5.55v2.6a2.96 2.96 0 0 0-2.3 2.88 2.95 2.95 0 0 0 5.9.07V2.5h.3Z"
      />
      <path
        fill="#000"
        d="M14.6 2.5c.3 2 1.52 3.2 3.62 3.6v.1c-2.1-.4-3.32-1.6-3.62-3.6V2.5Zm-5.9 10.48a2.96 2.96 0 0 0-2 2.8 2.95 2.95 0 0 0 .58 1.76 2.96 2.96 0 0 1 1.42-5.16v.6Z"
      />
    </svg>
  );
}

export function FacebookLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.6 12.9h2l.4-2.5h-2.4V8.7c0-.7.3-1.4 1.4-1.4h1.1V5.2s-1-.2-2-.2c-2 0-3.3 1.2-3.3 3.4v1.9H8.5v2.5h2.3V19h2.8v-6.1Z"
      />
    </svg>
  );
}

export function EmailLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#EFF1F5" stroke="#94A3B8" strokeWidth="1.3" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" stroke="#94A3B8" strokeWidth="1.3" />
    </svg>
  );
}
