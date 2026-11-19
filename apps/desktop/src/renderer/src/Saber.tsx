// Blade and hilt previews. Pure presentation; colours come from the look's arguments.

import type { CSSProperties } from 'react';

export function Hilt({ crystal }: { crystal?: string | null }) {
  return (
    <svg className="hilt" viewBox="0 0 64 20" aria-hidden="true">
      <defs>
        <linearGradient id="hilt-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a9488" /><stop offset=".45" stopColor="#4d4840" /><stop offset="1" stopColor="#1e1b17" /></linearGradient>
        <linearGradient id="hilt-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#48433b" /><stop offset="1" stopColor="#16130f" /></linearGradient>
        <filter id="hilt-glow" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>
      <rect x="0" y="5" width="5" height="10" fill="url(#hilt-metal)" stroke="#a39c8e" strokeWidth=".6" />
      <rect x="5" y="4" width="3" height="12" fill="url(#hilt-dark)" />
      <rect x="8" y="3" width="24" height="14" fill="url(#hilt-metal)" stroke="#a39c8e" strokeWidth=".6" />
      {crystal ? (
        <>
          <rect x="11" y="5" width="20" height="10" fill="#0b0907" />
          <polygon points="13,10 16,7 26,7 29,10 26,13 16,13" fill={crystal} opacity=".55" filter="url(#hilt-glow)" />
          <polygon points="13,10 16,7 26,7 29,10 26,13 16,13" fill={crystal} />
          <polygon points="16,7 26,7 21,10" fill="#fff" opacity=".55" />
          <polygon points="13,10 16,13 26,13 29,10" fill="#000" opacity=".2" />
          <rect x="11" y="5" width="20" height="10" fill="none" stroke="#a39c8e" strokeWidth=".6" />
        </>
      ) : (
        <path d="M12 3v14M16 3v14M20 3v14M24 3v14M28 3v14" stroke="#14110d" strokeWidth="1.4" />
      )}
      <rect x="32" y="2" width="14" height="16" fill="url(#hilt-metal)" stroke="#a39c8e" strokeWidth=".6" />
      <rect x="35" y="0" width="7" height="3" fill="#14110d" />
      <rect x="36" y=".6" width="5" height="1.8" fill="#e0733a" />
      <rect x="46" y="4" width="4" height="12" fill="url(#hilt-dark)" />
      <path d="M50 1h8l6 3v12l-6 3h-8z" fill="url(#hilt-metal)" stroke="#a39c8e" strokeWidth=".6" />
      <path d="M55 1v18" stroke="#14110d" strokeWidth="1.2" />
      <rect x="62" y="5" width="2" height="10" fill="#14110d" />
    </svg>
  );
}

export function Crystal({ color, h = 40, lit = true }: { color: string; h?: number; lit?: boolean }) {
  const id = `cg-${color.replace('#', '')}-${lit ? 'on' : 'off'}`;
  const w = Math.round(h * 0.6);
  return (
    <svg className={`crystal ${lit ? '' : 'off'}`} viewBox="0 0 24 40" width={w} height={h} style={{ '--c': color } as CSSProperties} aria-hidden="true">
      <defs>
        {lit
          ? <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".55" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity=".75" /></linearGradient>
          : <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a4f3f" /><stop offset="1" stopColor="#27221b" /></linearGradient>}
      </defs>
      <polygon points="12,1 20,10 20,30 12,39 4,30 4,10" fill={`url(#${id})`} />
      <polygon points="12,1 12,39 4,30 4,10" fill="#fff" opacity={lit ? 0.28 : 0.06} />
      <polygon points="12,1 20,10 12,14" fill="#fff" opacity={lit ? 0.5 : 0.1} />
      <polygon points="12,39 20,30 12,26" fill="#000" opacity=".2" />
      <polygon points="12,1 20,10 20,30 12,39 4,30 4,10" fill="none" stroke="#fff" strokeOpacity={lit ? 0.6 : 0.15} strokeWidth=".8" />
    </svg>
  );
}

export type Fx = 'off' | 'on' | 'clash' | 'blast' | 'lockup';

export function BladeBar({ color, fx = 'on', thin, ms = 300, style }: { color: string; fx?: Fx; thin?: boolean; ms?: number; style?: CSSProperties }) {
  const cls = ['blade', 'anim', thin ? 'thin' : '', fx === 'off' ? 'off' : '', fx === 'clash' ? 'clash' : '', fx === 'blast' ? 'blast' : '', fx === 'lockup' ? 'lockup' : ''].join(' ');
  return (
    <div className="bladewrap" style={{ height: thin ? 6 : 12, ...style }}>
      <div className={cls} style={{ '--c': color, '--t': `${ms}ms` } as CSSProperties} />
    </div>
  );
}
