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
  const { pending, action } = useFormStatus()

  const isPending = pending && action === props.formAction

  return (
    <Button {...props} type="submit" aria-disabled={pending}>
       {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isPending ? pendingText : children}
    </Button>
  )
}
