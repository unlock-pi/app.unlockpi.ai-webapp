import { HighlightWord, BoardPanel } from "@/components/board-panel";
import { BoardDocumentPanel } from "@/components/board-document-panel";
import type { BoardDocument } from "@/types/board";
import type { VisualPayload } from "@/types/visual";
import { TalkVisualStage } from "./talk-visual-stage";

interface TalkBoardStageProps {
  boardText: string;
  boardHighlights: HighlightWord[];
  boardDocument: BoardDocument;
  visualPayload: VisualPayload | null;
  transcriptSlot?: React.ReactNode;
}

export function TalkBoardStage({ boardText, boardHighlights, boardDocument, visualPayload, transcriptSlot }: TalkBoardStageProps) {
  const hasStructuredBoard = boardDocument.blocks.length > 0;

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden">
      {visualPayload ? (
        <TalkVisualStage visual={visualPayload} className="rounded-none border-x-0 border-b-0" />
      ) : hasStructuredBoard ? (
        <BoardDocumentPanel
          document={boardDocument}
          className="w-full h-full max-w-7xl mx-auto rounded-none border-x-0 border-b-0"
        />
      ) : boardText ? (
        <BoardPanel
          content={boardText}
          highlights={boardHighlights}
          className="w-full h-full max-w-7xl mx-auto rounded-none border-x-0 border-b-0"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[var(--color-darker-gray)] text-sm italic select-none">
          Board is empty - start talking to see content here
        </div>
      )}

      {transcriptSlot && (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center bg-gradient-to-t from-black/75 via-black/40 to-transparent pt-10 px-4 pb-3 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-3xl">{transcriptSlot}</div>
        </div>
      )}
    </div>
  );
}
