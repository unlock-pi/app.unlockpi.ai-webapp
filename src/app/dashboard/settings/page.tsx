"use client"
import Link from "next/link"
import { UserCircleGearIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    AlertDialog,
    AlertDialogClose,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
    return (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 flex  gap-2 ">
                    <UserCircleGearIcon size={64} weight="duotone" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                        <p className="text-sm text-muted-foreground">
                            Update your profile defaults and workspace preferences.
                        </p>
                    </div>
                </div>

                <Button variant="outline" render={<Link href="/dashboard/discover" />} nativeButton={false}>
                    Back to discover
                </Button>
            </div>

            <div className="grid gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                            These values are used as defaults when new teaching sessions are created.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="settings-display-name">Display name</Label>
                            <Input id="settings-display-name" placeholder="Aisha Khan" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="settings-email">Email</Label>
                            <Input id="settings-email" type="email" placeholder="aisha@school.edu" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="settings-bio">Teaching focus</Label>
                            <Textarea
                                id="settings-bio"
                                className="min-h-28"
                                placeholder="Classes, topics, and teaching outcomes you focus on most."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Session Defaults</CardTitle>
                        <CardDescription>
                            Quick defaults for pacing and structure used in the New Session flow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="settings-default-goals">Default learning goals</Label>
                            <Textarea
                                id="settings-default-goals"
                                className="min-h-24"
                                placeholder="Explain goals you want prefilled for each new session."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="settings-default-structure">Default lesson structure</Label>
                            <Textarea
                                id="settings-default-structure"
                                className="min-h-24"
                                placeholder="Warm-up -> Guided explanation -> Practice -> Reflection"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline">Cancel</Button>
                            <Button>Save changes</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Danger Zone</CardTitle>
                        <CardDescription>
                            Use carefully. These actions can clear local preferences.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="destructive">Reset UI preferences</Button>} />
                            <AlertDialogContent className="max-w-md">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reset preferences?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This resets local UI preferences for this browser and cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogClose render={<Button variant="outline">Cancel</Button>} />
                                    <AlertDialogClose render={<Button variant="destructive">Reset now</Button>} />
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
