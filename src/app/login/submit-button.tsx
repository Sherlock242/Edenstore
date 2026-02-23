'use client'

import { useFormStatus } from 'react-dom'
import { type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type Props = ComponentProps<'button'> & {
  pendingText?: string,
  children: React.ReactNode,
}

export function SubmitButton({ children, pendingText, ...props }: Props) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} type="submit" aria-disabled={pending}>
       {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </Button>
  )
}
