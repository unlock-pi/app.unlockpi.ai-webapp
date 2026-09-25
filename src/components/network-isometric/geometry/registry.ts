import type { ComponentType } from "../model";
import {
  buildDesktop,
  buildLaptop,
  buildMainframe,
  buildMonitor,
  buildPrinter,
  buildServer,
  buildSmartphone,
  type Geometry,
} from "./end-devices";
import { NETWORK_DEVICE_BUILDERS } from "./network-devices";
import { ARROW_BUILDERS, DATA_OBJECT_BUILDERS } from "./data-objects";

const FIXED_BUILDERS: Partial<Record<ComponentType, () => Geometry>> = {
  desktop: buildDesktop,
  laptop: buildLaptop,
  monitor: buildMonitor,
  mainframe: buildMainframe,
  server: buildServer,
  printer: buildPrinter,
  smartphone: buildSmartphone,
  ...DATA_OBJECT_BUILDERS,
  ...ARROW_BUILDERS,
};

const PORTED_BUILDERS: Partial<Record<ComponentType, (portCount?: number) => Geometry>> = NETWORK_DEVICE_BUILDERS;

/**
 * Every device/object type is modeled exactly once. This cache is the whole
 * "reuse, don't regenerate" contract: a diagram with 40 desktops still only
 * builds the desktop geometry a handful of times (once per distinct port
 * count, which desktops don't even vary).
 */
const cache = new Map<string, Geometry>();

export function getComponentGeometry(type: ComponentType, portCount?: number): Geometry {
  const key = portCount ? `${type}:${portCount}` : type;
  const cached = cache.get(key);
  if (cached) return cached;

  const fixed = FIXED_BUILDERS[type];
  const geometry = fixed ? fixed() : PORTED_BUILDERS[type]?.(portCount);
  if (!geometry) {
    throw new Error(`No geometry registered for component type "${type}"`);
  }
  cache.set(key, geometry);
  return geometry;
}

export type { Geometry };
