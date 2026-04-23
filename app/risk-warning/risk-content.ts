/**
 * Static copy for the risk warning page. Keeping all content in one place makes
 * legal/compliance updates a single-file edit and lets the page shell stay layout-only.
 */

export type RiskAccordionLink = {
  href: string
  label: string
}

export type RiskAccordionItem = {
  id: string
  question: string
  paragraphs: string[]
  links?: RiskAccordionLink[]
  /** Extra classes on the link row (e.g. top margin when it follows body copy). */
  linksClassName?: string
}

export const keyRisks: RiskAccordionItem[] = [
  {
    id: "loss",
    question: "You could lose all the money you invest",
    paragraphs: [
      "The performance of most cryptoassets can be highly volatile, with their value dropping as quickly as it can rise. You should be prepared to lose all the money you invest in cryptoassets.",
      "The cryptoasset market is largely unregulated. There is a risk of losing money or any cryptoassets you purchase due to risks such as cyber-attacks, financial crime and firm failure.",
    ],
  },
  {
    id: "protection",
    question: "You should not expect to be protected if something goes wrong",
    paragraphs: [
      "The Financial Services Compensation Scheme (FSCS) doesn't protect this type of investment because it's not a 'specified investment' under the UK regulatory regime.",
    ],
    links: [
      { href: "https://www.fscs.org.uk/check/investment-protection-checker", label: "FSCS Protection Checker" },
      { href: "https://www.financial-ombudsman.org.uk/consumers", label: "FOS Protection" },
    ],
  },
  {
    id: "liquidity",
    question: "You may not be able to sell your investment when you want to",
    paragraphs: [
      "There is no guarantee that investments in cryptoassets can be easily sold at any given time. The ability to sell a cryptoasset depends on various factors, including the supply and demand in the market at that time.",
      "Operational failings such as technology outages, cyber-attacks and comingling of funds could cause unwanted delay and you may be unable to sell your cryptoassets at the time you want.",
    ],
  },
  {
    id: "complexity",
    question: "Cryptoasset investments can be complex",
    paragraphs: [
      "Investments in cryptoassets can be complex, making it difficult to understand the risks associated with the investment.",
      "You should do your own research before investing. If something sounds too good to be true, it probably is.",
    ],
  },
  {
    id: "diversification",
    question: "Don't put all your eggs in one basket",
    paragraphs: [
      "Putting all your money into a single type of investment is risky. Spreading your money across different investments makes you less dependent on any one to do well.",
      "A good rule of thumb is not to invest more than 10% of your money in high-risk investments.",
    ],
    links: [{ href: "https://www.fca.org.uk/investsmart", label: "Learn more on FCA website" }],
    linksClassName: "mt-4",
  },
]

export const cryptoRiskBullets = [
  "No central authority exists to stabilize prices",
  "Decentralized systems face risks from operational failures, hacks, and security breaches",
  "Transactions may be irreversible, leading to losses from errors or fraud",
  "Regulatory changes could affect cryptocurrency availability and legality",
  "Cryptocurrencies are speculative and should only involve funds you can afford to lose",
] as const

export const blockchainRiskCopy =
  'Avana does not control blockchain protocols that govern cryptocurrency operations. Changes ("Forks") may affect functionality, availability, or value. Blockchain errors, updates, or failures could disrupt transactions and security.'

export const importantNoticeCopy = {
  title: "Important notice for UK retail clients",
  body:
    "Please be informed that certain services offered on this platform are not accessible to Retail Clients based in the UK. Our commitment to regulatory compliance means that certain offerings are reserved exclusively for UK Professional Clients.",
} as const
