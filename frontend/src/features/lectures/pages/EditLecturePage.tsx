import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Minus, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@/components/ui/form'
import { lectureFormSchema, type LectureFormValues } from '@/lib/schemas'
import {
  useGetLectureQuery,
  useGetSectionTitlesQuery,
  useUpdateLectureMutation,
} from '../lecturesApiSlice'

export function EditLecturePage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const navigate = useNavigate()
  const { data: sectionTitles = [] } = useGetSectionTitlesQuery()
  const { data, isLoading } = useGetLectureQuery(lectureId ?? '', { skip: !lectureId })
  const [updateLecture, { isLoading: isUpdating }] = useUpdateLectureMutation()
  const lecture = data?.lectureData
  const [newSection, setNewSection] = useState('')
  const [sections, setSections] = useState<string[]>([])

  const form = useForm<LectureFormValues>({
    resolver: zodResolver(lectureFormSchema),
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
    if (lecture) {
      form.reset({
        name: lecture.title,
        description: lecture.description,
        tagsInput: Array.isArray(lecture.tags) ? lecture.tags.join(', ') : '',
        section: '',
        youtubeLink: lecture.videoLink || '',
        notesLink: lecture.notes || '',
        slidesLink: lecture.slides || '',
        demos: lecture.demos?.length ? lecture.demos : [{ title: '', url: '' }],
        extras: lecture.shorts?.length ? lecture.shorts : [{ title: '', url: '' }],
      })
    }
  }, [lecture, form])

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

  const onSubmit = async (data: LectureFormValues) => {
    if (!lectureId) return
    try {
      await updateLecture({
        lectureId,
        data: {
          name: data.name,
          description: data.description,
          tags: (data.tagsInput ?? '').split(',').map((t) => t.trim()).filter(Boolean),
          section: data.section ?? '',
          youtubeLink: data.youtubeLink ?? '',
          notesLink: data.notesLink ?? '',
          slidesLink: data.slidesLink ?? '',
          demos: data.demos.filter((d) => d.url),
          extras: data.extras.filter((e) => e.url),
        },
      }).unwrap()
      toast.success('Lecture updated!')
      navigate(`/lectures/${lectureId}`)
    } catch {
      toast.error('Failed to update lecture')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link to={`/lectures/${lectureId}`}><ArrowLeft className="size-4 mr-2" />Back</Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Lecture</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lecture Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Textarea {...field} />
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
                  <Input {...field} />
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
                <FormLabel>Section</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring"
                    >
                      <option value="">Select a section</option>
                      {sections.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </FormControl>
                  <Input placeholder="New section" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
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
                  <Input type="url" {...field} />
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
                  <Input type="url" {...field} />
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
                  <Input type="url" {...field} />
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
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/lectures/${lectureId}`)}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
