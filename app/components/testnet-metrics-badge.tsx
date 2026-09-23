import styles from "./testnet-metrics-badge.module.css"

/** Small, asset-free indicator for surfaces backed by testnet data. */
export function TestnetMetricsBadge({ label, size = "default" }: { label: string; size?: "default" | "compact" }) {
  return (
    <span className={size === "compact" ? `${styles.badge} ${styles.compact}` : styles.badge}>
      <span>{label}</span>
      <span aria-hidden="true" className={`${styles.sparkle} ${styles.sparkleOne}`}>
        ✦
      </span>
      <span aria-hidden="true" className={`${styles.sparkle} ${styles.sparkleTwo}`}>
        ✧
      </span>
      <span aria-hidden="true" className={`${styles.sparkle} ${styles.sparkleThree}`}>
        ✦
      </span>
    </span>
  )
}
