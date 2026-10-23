import type { Section } from '@/types/api.types'
import { LectureCard } from './LectureCard'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

interface SectionAccordionProps {
  sections: Section[]
}

export function SectionAccordion({ sections }: SectionAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="rounded-lg border bg-card px-4 shadow-sm"
        >
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              {section.title}
              <Badge variant="outline" className="text-xs font-normal">
                {section.lectures?.length ?? 0} lectures
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2 pt-2">
              {section.lectures?.length > 0 ? (
                section.lectures.map((lecture) => (
                  <LectureCard key={lecture.id} lecture={lecture} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No lectures in this section yet.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
