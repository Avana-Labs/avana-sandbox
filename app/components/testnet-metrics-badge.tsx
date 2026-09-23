import styles from "./testnet-metrics-badge.module.css"

/** Small, asset-free indicator for TVL figures backed by testnet data. */
export function TestnetMetricsBadge({ label }: { label: string }) {
  return (
    <span className={styles.badge}>
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
