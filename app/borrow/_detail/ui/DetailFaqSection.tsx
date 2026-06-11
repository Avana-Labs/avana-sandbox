"use client"

import * as React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { SectionCard } from "./SectionCard"
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
    <SectionCard id={id} title={title} className={className} bodyClassName="p-0">
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, index) => (
          <AccordionItem
            key={item.question}
            value={`faq-${index}`}
            className={cn(index === 0 ? "border-t-0" : "", "px-5 md:px-7")}
          >
            <AccordionTrigger className="py-5 text-left text-[17px] font-medium tracking-[-0.03em] text-foreground transition-colors hover:text-foreground dark:text-white/92 dark:hover:text-white md:py-6 md:text-[19px]">
              <span className="max-w-[calc(100%-20px)]">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-[13px] leading-6 text-muted-foreground dark:text-white/68 md:text-[14px]">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionCard>
  )
}
