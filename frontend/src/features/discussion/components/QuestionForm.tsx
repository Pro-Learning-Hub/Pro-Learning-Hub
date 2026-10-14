import { zodResolver } from '@hookform/resolvers/zod'
import { questionFormSchema, type QuestionFormValues } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form'

interface QuestionFormProps {
  onSubmit: (title: string, body: string) => void
  onCancel: () => void
  isLoading?: boolean
  defaultTitle?: string
  defaultBody?: string
  submitLabel?: string
}

export function QuestionForm({
  onSubmit,
  onCancel,
  isLoading,
  defaultTitle = '',
  defaultBody = '',
  submitLabel = 'Post Question',
}: QuestionFormProps) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: { title: defaultTitle, body: defaultBody },
  })

  const handleSubmit = (data: QuestionFormValues) => {
    onSubmit(data.title.trim(), (data.body ?? '').trim())
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="rounded-lg border bg-card p-4 space-y-3">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Title *</FormLabel>
              <FormControl>
                <Input placeholder="What do you want to ask?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide more context…" className="min-h-24" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
