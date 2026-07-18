import Image from "next/image";

export default async function BrandPage() {
  return (
    <div className="flex min-h-screen mx-auto max-w-5xl bg-background">
      <h1 className="text-3xl font-bold">Brand Page</h1>
      <Image 
      
        src="/brand/canvas-nomenclature.png"
        alt="Brand Logo"
        fill
        className="mt-8 max-w-5xl"
      />
    </div>
  );
}