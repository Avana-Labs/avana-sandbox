import styles from "./testnet-metrics-badge.module.css"

/** Small, asset-free indicator for TVL figures backed by testnet data. */
export function TestnetMetricsBadge() {
  return (
    <span className={styles.badge}>
      <span aria-hidden="true" className={styles.indicator} />
      <span>Testnet</span>
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
