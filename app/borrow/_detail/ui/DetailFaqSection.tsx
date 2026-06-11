"use client"

import * as React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

export type DetailFaqItem = {
  question: string
  answer: React.ReactNode
}

type DetailFaqSectionProps = {
  title: React.ReactNode
  items: DetailFaqItem[]
  className?: string
  id?: string
}

export function DetailFaqSection({ title, items, className, id }: DetailFaqSectionProps) {
  if (items.length === 0) return null

  return (
    <section id={id} className={cn("min-w-0 space-y-5", className)}>
      <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-[hsl(var(--brand))]">{title}</h2>

      <Accordion type="single" collapsible className="w-full">
        {items.map((item, index) => (
          <AccordionItem key={item.question} value={`faq-${index}`} className={cn("border-border", index === 0 ? "border-t" : "")}>
            <AccordionTrigger className="py-6 text-left text-[15px] font-medium tracking-[-0.03em] text-foreground transition-colors hover:text-foreground dark:text-white/92 dark:hover:text-white md:py-7 md:text-[18px]">
              <span className="max-w-[calc(100%-20px)]">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-[13px] leading-6 text-muted-foreground dark:text-white/68 md:text-[14px]">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
