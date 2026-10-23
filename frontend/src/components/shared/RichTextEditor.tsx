import React, { useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  onTitleChange?: (title: string) => void
  titlePlaceholder?: string
  showTitle?: boolean
  onSubmit?: () => void
  onCancel?: () => void
  submitLabel?: string
}

/**
 * Simple rich-text-like editor using a textarea.
 * For a full rich text experience, a library like TipTap would be used,
 * but a controlled textarea is sufficient here.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  title,
  onTitleChange,
  titlePlaceholder = 'Title',
  showTitle = false,
  onSubmit,
  onCancel,
  submitLabel = 'Publish',
}: RichTextEditorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 bg-card">
      {showTitle && (
        <div>
          <Label htmlFor="editor-title">Title</Label>
          <Input
            id="editor-title"
            value={title ?? ''}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder={titlePlaceholder}
            className="mt-1"
          />
        </div>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-32 resize-y"
      />
      {(onSubmit || onCancel) && (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onSubmit && (
            <Button type="button" onClick={onSubmit}>
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
