/* Logo2D — flat 2D Academix brandmark (pure SVG).
 * The brutalist-toon identity of the earlier 3D mark, flattened into vector
 * letters: navy block caps with a hard gold offset edge behind and a thick
 * contour outline, set in Bricolage Grotesque with hand-lettered per-glyph
 * wobble (rotate lists). Crisp at any size, zero WebGL, no canvas. */
export default function Logo2D({ className = '', label = 'Academix — La Consolacion College Bacolod' }) {
  const sticker = {
    paintOrder: 'stroke',
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  };
  return (
    <svg className={className} viewBox="0 0 318 88" role="img" aria-label={label}>
      {/* LCCB stamp */}
      <g transform="rotate(-2 20 12)">
        <text
          x="7" y="18" {...sticker}
          fontFamily='"Bricolage Grotesque", sans-serif' fontWeight="800"
          fontSize="15" letterSpacing="2.5"
          stroke="#0f2942" strokeWidth="2.6" fill="#d4ac0d"
          rotate="2 -2 2 -1"
        >LCCB</text>
        <text
          x="7" y="18" {...sticker}
          fontFamily='"Bricolage Grotesque", sans-serif' fontWeight="800"
          fontSize="15" letterSpacing="2.5"
          stroke="#0f2942" strokeWidth="0.8" fill="#0f2942"
          rotate="2 -2 2 -1"
        >LCCB</text>
      </g>

      {/* ACADEMIX — gold offset edge behind, navy sticker letters in front */}
      <g>
        <text
          x="9" y="84" {...sticker}
          fontFamily='"Bricolage Grotesque", sans-serif' fontWeight="800"
          fontSize="62" letterSpacing="-1.5" textLength="302" lengthAdjust="spacing"
          stroke="#0f2942" strokeWidth="3.4" fill="#d4ac0d"
          rotate="-3 2 -1 3 -2 2 -1 2"
        >ACADEMIX</text>
        <text
          x="4" y="80" {...sticker}
          fontFamily='"Bricolage Grotesque", sans-serif' fontWeight="800"
          fontSize="62" letterSpacing="-1.5" textLength="302" lengthAdjust="spacing"
          stroke="#0f2942" strokeWidth="4.2" fill="#0f2942"
          rotate="-3 2 -1 3 -2 2 -1 2"
        >ACADEMIX</text>
      </g>
    </svg>
  );
}
