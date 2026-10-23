import { zodResolver } from '@hookform/resolvers/zod'
import { replyFormSchema, type ReplyFormValues } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  useForm,
} from '@/components/ui/form'

interface ReplyFormProps {
  onSubmit: (body: string) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function ReplyForm({ onSubmit, onCancel, isLoading }: ReplyFormProps) {
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: { body: '' },
  })

  const handleSubmit = (data: ReplyFormValues) => {
    onSubmit(data.body.trim())
    form.reset({ body: '' })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="rounded-lg border bg-card p-4 space-y-3">
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea placeholder="Write your answer…" className="min-h-28" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Posting…' : 'Post Reply'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
