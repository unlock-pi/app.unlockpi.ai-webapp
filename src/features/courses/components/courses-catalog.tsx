import Link from "next/link";
import { ArrowRight, Clock3, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseDefinition } from "@/features/courses/types/course";

interface CoursesCatalogProps {
  courses: CourseDefinition[];
}

export function CoursesCatalog({ courses }: CoursesCatalogProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="space-y-3">
        <Badge variant="secondary">Courses</Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Interactive lessons</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Start with Arrays. The course system is built to scale, so we can plug in
            more lessons, richer visuals, and voice guidance without rebuilding the route structure.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.slug} className="border-border/70 bg-card/70">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{course.difficulty}</Badge>
                <Badge variant="secondary">{course.heroMetric}</Badge>
              </div>
              <div>
                <CardTitle className="text-2xl">{course.title}</CardTitle>
                <CardDescription className="mt-2">{course.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4" />
                <span>{course.estimatedMinutes} minute lesson</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers3 className="size-4" />
                <span>{course.steps.length} guided steps</span>
              </div>
              <ul className="space-y-2 leading-6">
                {course.learningOutcomes.slice(0, 2).map((outcome) => (
                  <li key={outcome}>- {outcome}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button render={<Link href={`/dashboard/courses/${course.slug}`} />} className="w-full gap-2">
                Open lesson
                <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
