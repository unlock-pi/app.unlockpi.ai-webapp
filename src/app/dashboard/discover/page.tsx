import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import {
    BookOpenCheckIcon,
    FileTextIcon,
    FolderPlusIcon,
    GraduationCapIcon,
    MessageSquareMoreIcon,
    TargetIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type DiscoverCard = {
    Icon: React.ElementType
    name: string
    description: string
    href: string
    cta: string
    className: string
    background: React.ReactNode
}

function cardBackground(labels: string[], tint: string) {
    return (
        <div className="absolute inset-0">
            <div className={cn("absolute inset-0 bg-linear-to-br", tint)} />
            <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
                {labels.map((label) => (
                    <span
                        key={label}
                        className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur"
                    >
                        {label}
                    </span>
                ))}
            </div>
        </div>
    )
}

const features: DiscoverCard[] = [
    {
        Icon: FileTextIcon,
        name: "Start Guided Session",
        description:
            "Open intake instantly and scaffold a complete lesson with topic, goals, and agenda.",
        href: "/session/new",
        cta: "Create session",
        className: "col-span-1 md:col-span-2 xl:col-span-2",
        background: cardBackground(
            ["Topic", "Goals", "Lesson flow"],
            "from-accent/30 via-background to-background"
        ),
    },
    {
        Icon: FolderPlusIcon,
        name: "Create Project Folder",
        description: "Group sessions by class, unit, or term before you start teaching.",
        href: "/dashboard/discover?quickAction=new-project",
        cta: "Create project",
        className: "col-span-1",
        background: cardBackground(
            ["Class", "Unit", "Term"],
            "from-secondary/50 via-background to-background"
        ),
    },
    {
        Icon: BookOpenCheckIcon,
        name: "Revision Sprint",
        description: "Set up a high-focus revision session for exam prep in one click.",
        href: "/session/new?template=revision",
        cta: "Start revision",
        className: "col-span-1",
        background: cardBackground(
            ["Exam prep", "Recap", "Practice"],
            "from-muted via-background to-background"
        ),
    },
    {
        Icon: TargetIcon,
        name: "Diagnostic Check",
        description: "Create a diagnostic session to quickly identify student gaps.",
        href: "/session/new?template=diagnostic",
        cta: "Run diagnostic",
        className: "col-span-1",
        background: cardBackground(
            ["Baseline", "Misconceptions", "Next steps"],
            "from-accent/20 via-background to-background"
        ),
    },
    {
        Icon: GraduationCapIcon,
        name: "Concept Masterclass",
        description: "Build a deeper concept-first class with guided examples.",
        href: "/session/new?template=masterclass",
        cta: "Plan masterclass",
        className: "col-span-1",
        background: cardBackground(
            ["Concept", "Examples", "Checks"],
            "from-secondary/35 via-background to-background"
        ),
    },
    {
        Icon: MessageSquareMoreIcon,
        name: "Discussion Session",
        description: "Launch an oral discussion or viva-style teaching session quickly.",
        href: "/session/new?template=discussion",
        cta: "Start discussion",
        className: "col-span-1",
        background: cardBackground(
            ["Oral", "Reasoning", "Reflection"],
            "from-muted/80 via-background to-background"
        ),
    },
]

export default function BentoDemo() {
    return (
        <section className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6">
            <div className="mb-4 space-y-1">
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                    Discover Teaching Workflows
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    Pick any card to jump straight into creating a new session or project.
                </p>
            </div>

            <BentoGrid className="mx-auto max-w-6xl">
                {features.map((feature) => (
                    <BentoCard key={feature.name} {...feature} />
                ))}
            </BentoGrid>
        </section>
    )
}
