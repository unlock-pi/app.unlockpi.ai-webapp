"use client";

import dynamic from "next/dynamic";

const PointsDemoClient = dynamic(() => import("./points-demo-client"), { ssr: false });

export default function PointsDemoPage() {
  return <PointsDemoClient />;
}
