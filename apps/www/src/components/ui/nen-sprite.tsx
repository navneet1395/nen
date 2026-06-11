import React from "react";

/**
 * Renders a pixel-art sprite from a string grid. Each char maps to a palette
 * colour; "." (or space) is transparent. Rendered as crisp SVG rects so it
 * stays sharp at any scale.
 */
export const NenSprite: React.FC<{
  grid: string[];
  palette: Record<string, string>;
  pixel?: number; // size of one pixel, in px
  style?: React.CSSProperties;
  className?: string;
}> = ({ grid, palette, pixel = 8, style, className }) => {
  const rows = grid.length;
  const cols = Math.max(...grid.map((r) => r.length));
  const rects: React.ReactNode[] = [];

  for (let y = 0; y < rows; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill) continue; // "." / space / unknown = transparent
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />,
      );
    }
  }

  return (
    <svg
      width={cols * pixel}
      height={rows * pixel}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      style={style}
      className={className}
    >
      {rects}
    </svg>
  );
};
