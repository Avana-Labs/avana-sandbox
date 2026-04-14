import { PageIntro } from "../components/page-intro"
import { RiskAcknowledgmentCard } from "../components/risk-acknowledgment-card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Clock, ExternalLink, Shield, AlertCircle } from "lucide-react"

export default function RiskWarningPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <PageIntro
            title={
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" aria-hidden />
                Risk warning
              </span>
            }
            description={
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Estimated reading time: 2 mins</span>
              </span>
            }
          />

          {/* Important Notice Card */}
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="h-5 w-5" />
                Important Notice for UK Retail Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please be informed that certain services offered on this platform are not accessible to Retail Clients
                based in the UK. Our commitment to regulatory compliance means that certain offerings are reserved
                exclusively for UK Professional Clients.
              </p>
            </CardContent>
          </Card>

          {/* Key Risks Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold">Key Risks</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>You could lose all the money you invest</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground mb-4">
                    The performance of most cryptoassets can be highly volatile, with their value dropping as quickly as
                    it can rise. You should be prepared to lose all the money you invest in cryptoassets.
                  </p>
                  <p className="text-muted-foreground">
                    The cryptoasset market is largely unregulated. There is a risk of losing money or any cryptoassets
                    you purchase due to risks such as cyber-attacks, financial crime and firm failure.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>You should not expect to be protected if something goes wrong</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground mb-4">
                    The Financial Services Compensation Scheme (FSCS) doesn't protect this type of investment because
                    it's not a 'specified investment' under the UK regulatory regime.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <a
                        href="https://www.fscs.org.uk/check/investment-protection-checker"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        FSCS Protection Checker
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <a
                        href="https://www.financial-ombudsman.org.uk/consumers"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        FOS Protection
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>You may not be able to sell your investment when you want to</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground mb-4">
                    There is no guarantee that investments in cryptoassets can be easily sold at any given time. The
                    ability to sell a cryptoasset depends on various factors, including the supply and demand in the
                    market at that time.
                  </p>
                  <p className="text-muted-foreground">
                    Operational failings such as technology outages, cyber-attacks and comingling of funds could cause
                    unwanted delay and you may be unable to sell your cryptoassets at the time you want.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Cryptoasset investments can be complex</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground mb-4">
                    Investments in cryptoassets can be complex, making it difficult to understand the risks associated
                    with the investment.
                  </p>
                  <p className="text-muted-foreground">
                    You should do your own research before investing. If something sounds too good to be true, it
                    probably is.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Don't put all your eggs in one basket</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground mb-4">
                    Putting all your money into a single type of investment is risky. Spreading your money across
                    different investments makes you less dependent on any one to do well.
                  </p>
                  <p className="text-muted-foreground">
                    A good rule of thumb is not to invest more than 10% of your money in high-risk investments.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <a href="https://www.fca.org.uk/investsmart" target="_blank" rel="noopener noreferrer">
                        Learn more on FCA website
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Additional Risk Categories */}
          <div className="grid gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Cryptocurrency Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-2">
                  <li>No central authority exists to stabilize prices</li>
                  <li>Decentralized systems face risks from operational failures, hacks, and security breaches</li>
                  <li>Transactions may be irreversible, leading to losses from errors or fraud</li>
                  <li>Regulatory changes could affect cryptocurrency availability and legality</li>
                  <li>Cryptocurrencies are speculative and should only involve funds you can afford to lose</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Blockchain and Protocol Risks</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Avana does not control blockchain protocols that govern cryptocurrency operations. Changes
                  ("Forks") may affect functionality, availability, or value. Blockchain errors, updates, or failures
                  could disrupt transactions and security.
                </p>
              </CardContent>
            </Card>
          </div>

          <RiskAcknowledgmentCard />
        </div>
      </main>
    </div>
  )
}
