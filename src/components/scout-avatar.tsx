import styles from './scout-avatar.module.css';

/** A stable illustrated identity; no name, email or phone is sent to an avatar service. */
export function ScoutAvatar({ seed, size = 40 }: { seed: string; size?: number }) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const skin = ['#ddb28e', '#b87d56', '#845537', '#e8c6a4', '#a66b49'][hash % 5];
  const hat = ['#566746', '#475b45', '#66734c', '#686543'][(hash >>> 4) % 4];
  const shirt = ['#657456', '#475e4b', '#727556', '#526b67'][(hash >>> 8) % 4];
  const background = ['#23362b', '#293b37', '#343d2b', '#263a40'][(hash >>> 12) % 4];
  const mouth = ['M41 66Q48 70 55 66', 'M42 67H54', 'M41 65Q48 73 55 65'][(hash >>> 16) % 3];
  const face = [
    'M28 40Q48 30 68 40V55Q67 75 48 77Q29 75 28 55Z',
    'M26 40Q48 31 70 40V56Q66 76 48 76Q30 76 26 56Z',
    'M30 40Q48 29 66 40V57Q63 77 48 78Q33 77 30 57Z',
  ][(hash >>> 20) % 3];
  return (
    <svg
      className={styles.avatar}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
      data-scout-avatar="true"
    >
      <circle cx="48" cy="48" r="47" fill={background} />
      <path d="M12 91Q15 72 36 72H60Q81 72 84 91Q48 101 12 91" fill={shirt} />
      <path d="M39 68V78L48 84L57 78V68" fill={skin} />
      <path d="M31 74L42 86L37 94M65 74L54 86L59 94" fill="none" stroke="#344533" strokeWidth="3" />
      <ellipse cx="27" cy="52" rx="5" ry="7" fill={skin} />
      <ellipse cx="69" cy="52" rx="5" ry="7" fill={skin} />
      <path d={face} fill={skin} stroke="#243027" strokeWidth="1.5" />
      <g fill="none" stroke="#29322b" strokeWidth="2" strokeLinecap="round">
        <path d={(hash >>> 24) % 2 ? 'M35 48L42 47M54 47L61 48' : 'M35 47H42M54 47H61'} />
        <path d="M48 53L46 60H50" strokeOpacity=".45" />
        <path d={mouth} />
      </g>
      <circle cx="39" cy="53" r="2" fill="#17221b" />
      <circle cx="57" cy="53" r="2" fill="#17221b" />
      {(hash >>> 26) % 4 === 0 && (
        <g fill="none" stroke="#24342b" strokeWidth="2">
          <rect x="32" y="49" width="13" height="10" rx="4" />
          <rect x="51" y="49" width="13" height="10" rx="4" />
          <path d="M45 52H51M28 51H32M64 51H68" />
        </g>
      )}
      {(hash >>> 28) % 4 === 0 && (
        <path d="M39 64Q43 59 48 63Q53 59 57 64L51 65L48 64L45 65Z" fill="#3b342b" />
      )}
      <g className={styles.hat} stroke="#253727" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M24 35L29 18Q48 10 67 18L72 35Z" fill={hat} />
        <path d="M29 19L40 16L43 27L35 31Z" fill="#78825b" stroke="none" />
        <path d="M55 16L65 19L68 31L59 29Z" fill="#354d39" stroke="none" />
        <path d="M26 31Q48 27 70 31L72 37Q48 33 24 37Z" fill="#3b5039" />
        <path d="M16 36Q48 29 80 36L85 43Q48 53 11 43Z" fill={hat} />
        <path d="M21 40Q48 35 75 40" fill="none" stroke="#8b9670" strokeWidth="1" />
        <path d="M45 21H52L48 27H44L47 23H43Z" fill="#bdc99e" stroke="none" />
      </g>
    </svg>
  );
}
