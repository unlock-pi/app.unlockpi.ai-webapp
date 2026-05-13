"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as d3 from "d3";
import ReactFlow, { Background, Controls, Edge, MarkerType, Node } from "reactflow";
import cytoscape, { type Core } from "cytoscape";
import { cn } from "@/lib/utils";
import type { VisualPayload } from "@/types/visual";
import "mapbox-gl/dist/mapbox-gl.css";
import "reactflow/dist/style.css";

interface TalkVisualStageProps {
  visual: VisualPayload;
  className?: string;
}

function getThemeColor(token: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

export function TalkVisualStage({ visual, className }: TalkVisualStageProps) {
  return (
    <div
      className={cn(
        "w-full h-full max-w-7xl mx-auto p-4",
        "bg-[var(--color-darkest-gray)] border border-[var(--color-darker-gray)]",
        className
      )}
    >
      <div className="w-full h-full rounded-lg overflow-hidden bg-[var(--color-dark-gray)]/50">
        {visual.type === "map" && <MapboxRenderer data={visual} />}
        {visual.type === "chart" && <D3Renderer data={visual} />}
        {visual.type === "flow" && (
          <ReactFlowRenderer
            key={`flow-${visual.nodes.map((node) => node.id).join("-")}-${visual.edges.map((edge) => `${edge.from}-${edge.to}`).join("-")}`}
            data={visual}
          />
        )}
        {visual.type === "graph" && <CytoscapeRenderer data={visual} />}
      </div>
    </div>
  );
}

function MapboxRenderer({ data }: { data: Extract<VisualPayload, { type: "map" }> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const accentColor = useMemo(() => getThemeColor("--color-red", "#ef4444"), []);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    mapboxgl.accessToken = accessToken;

    if (!containerRef.current) return;

    const first = data.locations[0] ?? { lat: 20.5937, lng: 78.9629 };
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [first.lng, first.lat],
      zoom: data.locations.length > 1 ? 3 : 5,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      const bounds = new mapboxgl.LngLatBounds();
      data.locations.forEach((location) => {
        bounds.extend([location.lng, location.lat]);
        new mapboxgl.Marker({ color: accentColor })
          .setLngLat([location.lng, location.lat])
          .setPopup(new mapboxgl.Popup().setText(location.name))
          .addTo(map);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 48, duration: 600 });
      }

      const route = data.connections.map(([lat, lng]) => [lng, lat]);
      if (route.length > 1) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [route[0]],
            },
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": accentColor,
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });

        let pointer = 1;
        const interval = window.setInterval(() => {
          const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
          if (!source) return;

          source.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: route.slice(0, pointer + 1),
            },
          });

          pointer += 1;
          if (pointer >= route.length) {
            window.clearInterval(interval);
          }
        }, Math.max(100, data.animation.speed));

        map.once("remove", () => {
          window.clearInterval(interval);
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [data, accentColor, accessToken]);

  if (!accessToken) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-[var(--color-light-gray)]">
        Map rendering needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}

function D3Renderer({ data }: { data: Extract<VisualPayload, { type: "chart" }> }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const accentColor = useMemo(() => getThemeColor("--color-red", "#ef4444"), []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 920;
    const height = svgRef.current.clientHeight || 520;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 24, right: 24, bottom: 42, left: 56 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    if (data.chartType === "pie") {
      const radius = Math.min(chartWidth, chartHeight) / 2;
      const pieRoot = root
        .append("g")
        .attr("transform", `translate(${chartWidth / 2},${chartHeight / 2})`);

      const palette = data.values.map((_, index) => d3.interpolateTurbo(index / Math.max(1, data.values.length - 1)));
      const pie = d3.pie<number>().sort(null)(data.values);
      const arc = d3.arc<d3.PieArcDatum<number>>().innerRadius(0).outerRadius(radius);

      pieRoot
        .selectAll("path")
        .data(pie)
        .enter()
        .append("path")
        .attr("fill", (_, i) => palette[i % palette.length])
        .transition()
        .duration(data.animation.duration)
        .attrTween("d", (datum) => {
          const interpolator = d3.interpolate({ startAngle: datum.startAngle, endAngle: datum.startAngle }, datum);
          return (t) => arc(interpolator(t)) ?? "";
        });

      return;
    }

    const maxValue = Math.max(0, ...data.values);
    const x = d3.scaleBand().domain(data.labels).range([0, chartWidth]).padding(0.25);
    const y = d3.scaleLinear().domain([0, maxValue * 1.2 || 1]).range([chartHeight, 0]);

    root
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .attr("color", "var(--color-light-gray)");

    root.append("g").call(d3.axisLeft(y)).attr("color", "var(--color-light-gray)");

    if (data.chartType === "bar") {
      root
        .selectAll("rect")
        .data(data.values)
        .enter()
        .append("rect")
        .attr("x", (_, i) => x(data.labels[i]) ?? 0)
        .attr("y", chartHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", accentColor)
        .transition()
        .duration(data.animation.duration)
        .attr("y", (value) => y(value))
        .attr("height", (value) => chartHeight - y(value));
      return;
    }

    const points = data.values.map((value, index) => ({ label: data.labels[index], value }));
    const line = d3
      .line<{ label: string; value: number }>()
      .x((item) => (x(item.label) ?? 0) + x.bandwidth() / 2)
      .y((item) => y(item.value));

    const path = root
      .append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", accentColor)
      .attr("stroke-width", 3)
      .attr("d", line);

    const pathNode = path.node();
    if (!pathNode) return;

    const totalLength = pathNode.getTotalLength();
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(data.animation.duration)
      .attr("stroke-dashoffset", 0);
  }, [data, accentColor]);

  return <svg ref={svgRef} className="w-full h-full" role="img" aria-label="chart visualization" />;
}

function ReactFlowRenderer({ data }: { data: Extract<VisualPayload, { type: "flow" }> }) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= data.nodes.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, Math.max(120, data.animation.delay));

    return () => window.clearInterval(timer);
  }, [data]);

  const { nodes, edges } = useMemo(() => {
    const nodePositions = data.nodes.map((node, index) => ({
      id: node.id,
      data: { label: node.label },
      position: { x: 80 + index * 220, y: 140 + (index % 2) * 120 },
      hidden: index >= visibleCount,
    } as Node));

    const visibleNodeSet = new Set(nodePositions.filter((node) => !node.hidden).map((node) => node.id));

    const edgeItems = data.edges.map((edge, index) => ({
      id: `e-${index}`,
      source: edge.from,
      target: edge.to,
      markerEnd: { type: MarkerType.ArrowClosed },
      hidden: !(visibleNodeSet.has(edge.from) && visibleNodeSet.has(edge.to)),
    } as Edge));

    return { nodes: nodePositions, edges: edgeItems };
  }, [data, visibleCount]);

  return (
    <div className="w-full h-full">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function CytoscapeRenderer({ data }: { data: Extract<VisualPayload, { type: "graph" }> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const accentColor = useMemo(() => getThemeColor("--color-red", "#ef4444"), []);
  const textColor = useMemo(() => getThemeColor("--color-white", "#ffffff"), []);
  const edgeColor = useMemo(() => getThemeColor("--color-light-gray", "#9ca3af"), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...data.nodes.map((node) => ({ data: { id: node.id, label: node.label } })),
        ...data.edges.map((edge, index) => ({ data: { id: `ge-${index}`, source: edge.source, target: edge.target } })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": accentColor,
            label: "data(label)",
            color: textColor,
            "font-size": 12,
            "text-valign": "center",
            "text-halign": "center",
            width: 46,
            height: 46,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": edgeColor,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": edgeColor,
          },
        },
      ],
      layout: { name: "cose", animate: true },
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    cyRef.current = cy;
    cy.nodes().style("opacity", 0);
    cy.edges().style("opacity", 0);

    if (data.animation.type === "expand") {
      cy.nodes().animate({ style: { opacity: 1 } }, { duration: 500 });
      cy.edges().animate({ style: { opacity: 1 } }, { duration: 700 });
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, accentColor, textColor, edgeColor]);

  return <div ref={containerRef} className="w-full h-full" />;
}
