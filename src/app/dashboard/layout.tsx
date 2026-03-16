"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/app/appwrite";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const verifyAuth = async () => {
            try {
                await account.get();
            } catch {
                router.replace("/login");
                return;
            } finally {
                if (isMounted) {
                    setIsCheckingAuth(false);
                }
            }
        };

        verifyAuth();

        return () => {
            isMounted = false;
        };
    }, [router]);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-[var(--color-black)] text-[var(--color-white)] flex items-center justify-center">
                <span className="text-sm text-[var(--color-gray)]">Checking authentication...</span>
            </div>
        );
    }

    return <>{children}</>;
}
