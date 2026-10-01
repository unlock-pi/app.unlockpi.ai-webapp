'use client'

import { useRouter } from 'next/navigation'
import { LogOutIcon } from "lucide-react"
import type { ComponentProps } from "react"

import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'

type LogoutButtonProps = ComponentProps<typeof Button>

export function LogoutButton({
  children,
  onClick,
  ...props
}: LogoutButtonProps) {
  const { replace, refresh } = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    replace('/auth/login')
    refresh()
  }

  return (
    <Button
      onClick={async (event) => {
        onClick?.(event)
        if (event.defaultPrevented) {
          return
        }

        await logout()
      }}
      {...props}
    >
      {children ?? (
        <>
          <LogOutIcon className="size-4" />
          Logout
        </>
      )}
    </Button>
  )
}
