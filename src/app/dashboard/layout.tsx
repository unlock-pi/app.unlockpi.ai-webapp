"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/app/appwrite";
import { AppSidebar } from "@/components/app-sidebar";


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

    return <SidebarProvider
        style={
            {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
        }
    >
        {/* <AppSidebar variant="inset" /> */}
        <SidebarInset>
            <SiteHeader />
            <AppSidebar />

            {children}

            {/* <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <SectionCards />
                        <div className="px-4 lg:px-6">
                            <ChartAreaInteractive />
                        </div>
                        <DataTable data={data} />
                    </div>
                </div>
            </div> */}
        </SidebarInset>


    </SidebarProvider>;
}



import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import data from "./data.json"

// export default function Page() {
//     return (
//         <SidebarProvider
//             style={
//                 {
//                     "--sidebar-width": "calc(var(--spacing) * 72)",
//                     "--header-height": "calc(var(--spacing) * 12)",
//                 } as React.CSSProperties
//             }
//         >
//             {/* <AppSidebar variant="inset" /> */}
//             <SidebarInset>
//                 <SiteHeader />
//                 <div className="flex flex-1 flex-col">
//                     <div className="@container/main flex flex-1 flex-col gap-2">
//                         <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
//                             <SectionCards />
//                             <div className="px-4 lg:px-6">
//                                 <ChartAreaInteractive />
//                             </div>
//                             <DataTable data={data} />
//                         </div>
//                     </div>
//                 </div>
//             </SidebarInset>
//         </SidebarProvider>
//     )
// }
