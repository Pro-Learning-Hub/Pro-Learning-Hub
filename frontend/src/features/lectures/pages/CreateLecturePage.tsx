import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form'
import { createLectureFormSchema, type CreateLectureFormValues } from '@/lib/schemas'
import { useGetSectionTitlesQuery, useCreateLectureMutation } from '../lecturesApiSlice'

export function CreateLecturePage() {
  const navigate = useNavigate()
  const { data: sectionTitles = [] } = useGetSectionTitlesQuery()
  const [createLecture, { isLoading }] = useCreateLectureMutation()
  const [newSection, setNewSection] = useState('')
  const [sections, setSections] = useState<string[]>([])

  const form = useForm<CreateLectureFormValues>({
    resolver: zodResolver(createLectureFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tagsInput: '',
      section: '',
      youtubeLink: '',
      notesLink: '',
      slidesLink: '',
      demos: [{ title: '', url: '' }],
      extras: [{ title: '', url: '' }],
    },
  })

  const demos = useFieldArray({ control: form.control, name: 'demos' })
  const extras = useFieldArray({ control: form.control, name: 'extras' })

  useEffect(() => {
    setSections(sectionTitles)
  }, [sectionTitles])

  const addSection = () => {
    if (newSection && !sections.includes(newSection)) {
      setSections([...sections, newSection])
      form.setValue('section', newSection)
    }
    setNewSection('')
  }

  const onSubmit = async (data: CreateLectureFormValues) => {
    try {
      await createLecture({
        name: data.name,
        description: data.description,
        tags: (data.tagsInput ?? '').split(',').map((t) => t.trim()).filter(Boolean),
        section: data.section,
        youtubeLink: data.youtubeLink ?? '',
        notesLink: data.notesLink ?? '',
        slidesLink: data.slidesLink ?? '',
        demos: data.demos.filter((d) => d.url),
        extras: data.extras.filter((e) => e.url),
      }).unwrap()
      toast.success('Lecture created!')
      navigate('/lectures')
    } catch {
      toast.error('Failed to create lecture')
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Create Lecture</h1>
      <p className="text-muted-foreground mb-6">Add a new lecture to the course.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lecture Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Lecture Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Brief description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tagsInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="react, hooks, state" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section *</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring"
                    >
                      <option value="" disabled>Select a section</option>
                      {sections.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </FormControl>
                  <Input
                    placeholder="New section name"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addSection}>Add</Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <FormField
            control={form.control}
            name="youtubeLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>YouTube Link</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://youtube.com/watch?v=..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notesLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes Link</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slidesLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slides Link</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <div>
            <FormLabel className="mb-2">Demos</FormLabel>
            {demos.fields.map((demo, i) => (
              <div key={demo.id} className="flex gap-2 mb-2">
                <FormField
                  control={form.control}
                  name={`demos.${i}.title`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Demo name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`demos.${i}.url`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Demo URL" type="url" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => demos.remove(i)}>
                  <Minus className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => demos.append({ title: '', url: '' })}>
              <Plus className="size-4 mr-1" />Add Demo
            </Button>
          </div>

          <div>
            <FormLabel className="mb-2">Shorts/Extras</FormLabel>
            {extras.fields.map((extra, i) => (
              <div key={extra.id} className="flex gap-2 mb-2">
                <FormField
                  control={form.control}
                  name={`extras.${i}.title`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Extra title" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`extras.${i}.url`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Extra URL" type="url" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => extras.remove(i)}>
                  <Minus className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => extras.append({ title: '', url: '' })}>
              <Plus className="size-4 mr-1" />Add Extra
            </Button>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create Lecture'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/lectures')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
