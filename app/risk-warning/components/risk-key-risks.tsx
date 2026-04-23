import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { keyRisks } from "../risk-content"

/** FCA-style accordion of primary risk disclosures. */
export function RiskKeyRisks() {
  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-[18px] font-medium tracking-tight text-foreground">Key risks</h2>
      <Accordion type="single" collapsible className="w-full">
        {keyRisks.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              {item.paragraphs.map((paragraph, index) => (
                <p key={index} className={`text-muted-foreground ${index < item.paragraphs.length - 1 ? "mb-4" : ""}`}>
                  {paragraph}
                </p>
              ))}
              {item.links?.length ? (
                <div className={`flex flex-wrap items-center gap-2 ${item.linksClassName ?? ""}`}>
                  {item.links.map((link) => (
                    <Button key={link.href} variant="outline" size="sm" className="text-xs" asChild>
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
