import { LightbulbIcon, MessageSquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function FeedbackPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-center gap-3">
        <MessageSquareIcon className="size-10 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Collect product notes, bugs, and teaching workflow feedback here.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share what should improve</CardTitle>
          <CardDescription>
            This is a placeholder surface for your feedback workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-notes">Feedback notes</Label>
            <Textarea
              id="feedback-notes"
              className="min-h-32"
              placeholder="What felt confusing, what broke, or what should be smoother?"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <LightbulbIcon className="size-4" />
              Submission wiring can be added here next.
            </div>
            <Button disabled>Send feedback</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
