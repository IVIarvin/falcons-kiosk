import styles from './scout-avatar.module.css';

/** A stable illustrated identity; no name, email or phone is sent to an avatar service. */
export function ScoutAvatar({ seed, size = 40 }: { seed: string; size?: number }) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const skin = ['#ddb28e', '#b87d56', '#845537', '#e8c6a4', '#a66b49'][hash % 5];
  const hat = ['#566746', '#475b45', '#66734c'][hash % 3];
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
      <circle cx="48" cy="48" r="47" fill="#23362b" />
      <path d="M12 91Q15 72 36 72H60Q81 72 84 91Q48 101 12 91" fill="#657456" />
      <path d="M39 68V78L48 84L57 78V68" fill={skin} />
      <path d="M31 74L42 86L37 94M65 74L54 86L59 94" fill="none" stroke="#344533" strokeWidth="3" />
      <ellipse cx="27" cy="52" rx="5" ry="7" fill={skin} />
      <ellipse cx="69" cy="52" rx="5" ry="7" fill={skin} />
      <path
        d="M28 40Q48 30 68 40V55Q67 75 48 77Q29 75 28 55Z"
        fill={skin}
        stroke="#243027"
        strokeWidth="1.5"
      />
      <g fill="none" stroke="#29322b" strokeWidth="2" strokeLinecap="round">
        <path d={hash % 2 ? 'M35 48L42 47M54 47L61 48' : 'M35 47H42M54 47H61'} />
        <path d="M48 53L46 60H50" strokeOpacity=".45" />
        <path d={hash % 3 ? 'M41 66Q48 70 55 66' : 'M42 67H54'} />
      </g>
      <circle cx="39" cy="53" r="2" fill="#17221b" />
      <circle cx="57" cy="53" r="2" fill="#17221b" />
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
