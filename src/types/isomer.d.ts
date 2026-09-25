/**
 * `isomer` ships as a plain CommonJS bundle with no published types. This is
 * a minimal surface covering only what the network-isometric components use.
 */
declare module "isomer" {
  export class Point {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    static ORIGIN: Point;
    translate(dx?: number, dy?: number, dz?: number): Point;
    scale(origin: Point, dx: number, dy?: number, dz?: number): Point;
    rotateX(origin: Point, angle: number): Point;
    rotateY(origin: Point, angle: number): Point;
    rotateZ(origin: Point, angle: number): Point;
  }

  export class Color {
    constructor(r?: number, g?: number, b?: number, a?: number);
    r: number;
    g: number;
    b: number;
    a: number;
    lighten(percentage: number, lightColor?: Color): Color;
    toHex(): string;
  }

  export class Path {
    constructor(points: Point[]);
    points: Point[];
    translate(dx?: number, dy?: number, dz?: number): Path;
    reverse(): Path;
    static Rectangle(origin: Point, width?: number, height?: number): Path;
    static Circle(origin: Point, radius?: number, vertices?: number): Path;
    static Star(origin: Point, outerRadius?: number, innerRadius?: number, points?: number): Path;
  }

  export class Shape {
    constructor(paths?: Path[]);
    paths: Path[];
    push(path: Path): void;
    translate(dx?: number, dy?: number, dz?: number): Shape;
    rotateX(origin: Point, angle: number): Shape;
    rotateY(origin: Point, angle: number): Shape;
    rotateZ(origin: Point, angle: number): Shape;
    scale(origin: Point, dx: number, dy?: number, dz?: number): Shape;
    orderedPaths(): Path[];
    static extrude(path: Path, height?: number): Shape;
    static Prism(origin: Point, dx?: number, dy?: number, dz?: number): Shape;
    static Pyramid(origin: Point, dx?: number, dy?: number, dz?: number): Shape;
    static Cylinder(origin: Point, radius?: number, vertices?: number, height?: number): Shape;
  }

  export interface IsomerOptions {
    scale?: number;
    originX?: number;
    originY?: number;
    lightPosition?: { x: number; y: number; z: number };
    lightColor?: Color;
  }

  export default class Isomer {
    constructor(canvas: HTMLCanvasElement, options?: IsomerOptions);
    canvas: { clear(): void; width: number; height: number };
    scale: number;
    originX: number;
    originY: number;
    setLightPosition(x: number, y: number, z: number): void;
    add(item: Shape | Path | Array<Shape | Path>, baseColor?: Color): void;

    static Point: typeof Point;
    static Color: typeof Color;
    static Path: typeof Path;
    static Shape: typeof Shape;
  }
}
