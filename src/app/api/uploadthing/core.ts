import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { createClient } from "@/lib/server";

const f = createUploadthing();

export const ourFileRouter = {
  avatarUploader: f(
    {
      image: { maxFileSize: "2MB", maxFileCount: 1 },
    },
    // The profile update happens client-side (Supabase user metadata), so the
    // client shouldn't block on our server callback. Without this, dev uploads
    // hang on "Uploading..." forever: the file reaches UploadThing but their
    // callback into localhost never resolves, and the client waits for it.
    { awaitServerData: false },
  )
    .middleware(async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { userId: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
