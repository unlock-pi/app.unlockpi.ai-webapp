"use client";

import { Puck } from "@puckeditor/core";
import { useState } from "react";
import { defaultPointsListItems } from "@/components/data-structure/points-list";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { canvasPuckOverrides } from "@/features/canvas/components/canvas-puck-overrides";
import { createCanvasId, createCanvasTemplate } from "@/features/canvas/lib/canvas-templates";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

function withPrePlacedPointsList(document: CanvasDocument): CanvasDocument {
  const frame = document.content[0];
  if (!frame || frame.type !== "SlideBlock") return document;

  return {
    ...document,
    content: [
      {
        ...frame,
        props: {
          ...frame.props,
          content: [
            {
              type: "PointsListBlock",
              props: {
                id: createCanvasId("points"),
                points: defaultPointsListItems(),
                listStyle: "bullet",
                defaultExpanded: false,
                quickAdd: "",
              },
            },
            ...(frame.props.content ?? []),
          ],
        },
      },
      ...document.content.slice(1),
    ],
  };
}

export default function PointsDemoClient() {
  const [data, setData] = useState<CanvasDocument>(() =>
    withPrePlacedPointsList(createCanvasTemplate("empty").document),
  );

  return (
    <div style={{ height: "100vh" }}>
      <Puck
        config={canvasPuckConfig}
        data={data}
        overrides={canvasPuckOverrides}
        onChange={(next) => {
          setData(next);
          (window as unknown as { __pointsDemoData?: CanvasDocument }).__pointsDemoData = next;
        }}
        onPublish={() => {}}
      />
    </div>
  );
}
