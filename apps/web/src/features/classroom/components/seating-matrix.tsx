/**
 * Seating matrix component — displays the 3x3 classroom layout.
 * Styled with Pi AI's dark + orange theme.
 * 
 * Must match the student matrix in the agent instructions:
 *   [7-Karan, 8-Meera, 9-Zaid]       (Back row)
 *   [4-Aarav, 5-Siddharth, 6-Priya]   (Middle row)
 *   [1-Nikhil, 2-Sneha, 3-Ananya]     (Front row)
 *
 * The focusedStudentId prop can be a student name or seat number string,
 * matching what the agent sends via RPC.
 */

import { cn } from "@/lib/utils";

interface Student {
    seatNumber: string;
    name: string;
    row: number;
    col: number;
}

// 3x3 matrix matching agent instructions layout (rendered top-to-bottom = back-to-front)
const STUDENTS: Student[] = [
    // Back row (row 3 in classroom, displayed at top)
    { seatNumber: "7", name: "Karan", row: 0, col: 0 },
    { seatNumber: "8", name: "Meera", row: 0, col: 1 },
    { seatNumber: "9", name: "Zaid", row: 0, col: 2 },
    // Middle row
    { seatNumber: "4", name: "Aarav", row: 1, col: 0 },
    { seatNumber: "5", name: "Siddharth", row: 1, col: 1 },
    { seatNumber: "6", name: "Priya", row: 1, col: 2 },
    // Front row (closest to instructor)
    { seatNumber: "1", name: "Nikhil", row: 2, col: 0 },
    { seatNumber: "2", name: "Sneha", row: 2, col: 1 },
    { seatNumber: "3", name: "Ananya", row: 2, col: 2 },
];

interface SeatingMatrixProps {
    focusedStudentId?: string | null;
}

export function SeatingMatrix({ focusedStudentId }: SeatingMatrixProps) {
    return (
        <div className="bg-[var(--color-darkest-gray)] p-6 rounded-xl border border-[var(--color-darker-gray)]">
            <h3 className="text-[var(--color-gray)] text-sm font-medium mb-4 uppercase tracking-wider">
                Classroom Layout
            </h3>

            {/* Row labels + 3x3 Grid */}
            <div className="space-y-2">
                <span className="text-[10px] text-[var(--color-dark-gray)] uppercase tracking-widest font-[var(--font-jb-mono)]">
                    Back
                </span>
                <div className="grid grid-cols-3 gap-3">
                    {STUDENTS.map((student) => {
                        // Match by name (case-insensitive) or seat number
                        const isFocused =
                            focusedStudentId !== null &&
                            focusedStudentId !== undefined &&
                            (student.name.toLowerCase() ===
                                focusedStudentId.toLowerCase() ||
                                student.seatNumber === focusedStudentId);

                        return (
                            <div
                                key={student.seatNumber}
                                className={cn(
                                    "h-20 rounded-lg flex flex-col items-center justify-center transition-all duration-500 border-2",
                                    isFocused
                                        ? "bg-[rgba(255,77,0,0.15)] border-[var(--color-orange)] shadow-[0_0_20px_rgba(255,77,0,0.4)] scale-105"
                                        : "bg-[var(--color-darker-gray)]/50 border-[var(--color-dark-gray)]/50 text-[var(--color-gray)] hover:border-[var(--color-dark-gray)]"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 font-[var(--font-jb-mono)]",
                                        isFocused
                                            ? "bg-[var(--color-orange)] text-black"
                                            : "bg-[var(--color-dark-gray)] text-[var(--color-lighter-gray)]"
                                    )}
                                >
                                    {student.seatNumber}
                                </div>
                                <span
                                    className={cn(
                                        "text-xs font-medium",
                                        isFocused
                                            ? "text-[var(--color-white)]"
                                            : "text-[var(--color-lighter-gray)]"
                                    )}
                                >
                                    {student.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="pt-2 border-t border-[var(--color-darker-gray)] text-center text-[10px] text-[var(--color-dark-gray)] uppercase tracking-widest font-[var(--font-jb-mono)]">
                    Front of Class — Instructor &amp; Pi
                </div>
            </div>
        </div>
    );
}
