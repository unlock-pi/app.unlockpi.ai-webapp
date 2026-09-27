import { CircleHelpIcon, MailQuestionIcon } from "lucide-react";

import { CircleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
export default function HelpPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-center gap-3">
        <CircleHelpIcon className="size-10 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
          <p className="text-sm text-muted-foreground">
            Quick guidance for navigating your workspace and teaching flows.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <CardFrame className="w-full max-w-2xl">
          <CardFrameHeader>
            <CardFrameTitle>Where to manage work</CardFrameTitle>
            <CardFrameDescription>
              The sidebar is now only for navigation. Projects and sessions live
              in dedicated pages.{" "}
            </CardFrameDescription>
          </CardFrameHeader>
          <Card className="rounded-b-none!">
            <CardPanel>
              <p>Open `Projects` to browse your teaching workspaces.</p>
              <p>Open a project to view, edit, and launch its sessions.</p>
              <p>
                Use `New session` to create a fresh session inside any project.
              </p>
            </CardPanel>
          </Card>
          {/* <CardFrameFooter>
                  <div className="flex gap-1 text-muted-foreground text-xs">
                    <CircleAlertIcon className="size-3 h-lh shrink-0" />
                    <p>This will take a few seconds to complete.</p>
                  </div>
                </CardFrameFooter> */}
        </CardFrame>
        
        <Alert>
          <AlertTitle>Need more help?</AlertTitle>
          <AlertDescription>
            <p>
             
              This can later connect to docs, contact, or guided onboarding.
            </p>
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <MailQuestionIcon className="size-4" />A fuller support surface
              can plug in here next.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </section>
  );
}
