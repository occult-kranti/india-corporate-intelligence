import { useEffect, useRef } from 'react';

interface GlobalLocation {
  name: string;
  lat: number;
  lng: number;
  type: 'hq' | 'subsidiary' | 'office' | 'factory' | 'port';
  country: string;
}

interface Connection {
  from: string; // location name
  to: string;
  type: 'ownership' | 'trade' | 'investment' | 'supply';
  strength: number; // 0-1
}

interface WorldMapProps {
  locations: GlobalLocation[];
  connections: Connection[];
  centerOn?: string; // location name to center on
}

// Simplified world map paths (continent outlines)
const WORLD_PATHS = [
  // North America
  'M 50 80 Q 80 60 150 70 Q 200 80 220 120 Q 210 160 180 180 Q 150 170 120 150 Q 80 130 50 80 Z',
  // South America
  'M 180 200 Q 200 190 220 210 Q 230 250 220 300 Q 200 350 180 340 Q 160 300 170 250 Q 175 220 180 200 Z',
  // Europe
  'M 380 80 Q 420 70 460 80 Q 480 100 470 130 Q 450 140 420 135 Q 390 130 380 110 Q 375 90 380 80 Z',
  // Africa
  'M 380 160 Q 420 150 450 170 Q 470 210 460 260 Q 440 300 410 290 Q 380 270 375 230 Q 370 190 380 160 Z',
  // Asia
  'M 480 70 Q 550 60 620 80 Q 680 90 720 120 Q 730 160 710 190 Q 680 210 640 200 Q 600 190 560 170 Q 520 150 490 120 Q 480 90 480 70 Z',
  // Australia
  'M 650 280 Q 690 270 720 290 Q 730 320 720 350 Q 690 360 660 350 Q 640 330 645 300 Q 648 285 650 280 Z',
  // India
  'M 560 140 Q 580 135 590 150 Q 595 170 585 185 Q 575 195 565 185 Q 555 170 555 155 Q 558 145 560 140 Z',
];

export function WorldMap({ locations, connections, centerOn }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const width = 900;
    const height = 450;
    
    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Equirectangular projection
    const project = (lng: number, lat: number): [number, number] => {
      const x = ((lng + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      return [x, y];
    };

    // Draw world background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', width.toString());
    bg.setAttribute('height', height.toString());
    bg.setAttribute('fill', '#0c0c0e');
    svg.appendChild(bg);

    // Draw grid lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * height;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', y.toString());
      line.setAttribute('x2', width.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', 'rgba(244, 240, 232, 0.03)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }

    for (let lng = -180; lng <= 180; lng += 60) {
      const x = ((lng + 180) / 360) * width;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x.toString());
      line.setAttribute('y1', '0');
      line.setAttribute('x2', x.toString());
      line.setAttribute('y2', height.toString());
      line.setAttribute('stroke', 'rgba(244, 240, 232, 0.03)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }

    // Draw continent outlines
    WORLD_PATHS.forEach(pathData => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', '#161618');
      path.setAttribute('stroke', 'rgba(244, 240, 232, 0.06)');
      path.setAttribute('stroke-width', '1');
      svg.appendChild(path);
    });

    // Draw connections
    const locationMap = new Map(locations.map(l => [l.name, l]));
    
    connections.forEach(conn => {
      const from = locationMap.get(conn.from);
      const to = locationMap.get(conn.to);
      if (!from || !to) return;

      const [x1, y1] = project(from.lng, from.lat);
      const [x2, y2] = project(to.lng, to.lat);

      // Curved line
      const midX = (x1 + x2) / 2;
      const midY = Math.min(y1, y2) - 30 * conn.strength;
      const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', conn.type === 'ownership' ? '#c9a86c' : conn.type === 'trade' ? '#7a9e7e' : '#8b7ec4');
      path.setAttribute('stroke-width', (1 + conn.strength * 2).toString());
      path.setAttribute('stroke-opacity', '0.6');
      path.setAttribute('stroke-dasharray', conn.type === 'supply' ? '4,4' : '');
      svg.appendChild(path);
    });

    // Draw locations
    locations.forEach(loc => {
      const [x, y] = project(loc.lng, loc.lat);
      
      const colors: Record<string, string> = {
        hq: '#c9a86c',
        subsidiary: '#7a9e7e',
        office: '#3b82f6',
        factory: '#f59e0b',
        port: '#ec4899',
      };

      const color = colors[loc.type] || '#c9a86c';
      const size = loc.type === 'hq' ? 8 : 5;

      // Glow effect
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', x.toString());
      glow.setAttribute('cy', y.toString());
      glow.setAttribute('r', (size + 4).toString());
      glow.setAttribute('fill', color);
      glow.setAttribute('opacity', '0.2');
      svg.appendChild(glow);

      // Main circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', size.toString());
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', '#0c0c0e');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('class', 'cursor-pointer');
      svg.appendChild(circle);

      // Label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x.toString());
      label.setAttribute('y', (y + size + 12).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#9c9588');
      label.setAttribute('font-size', '8');
      label.textContent = loc.name;
      svg.appendChild(label);

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${loc.name} (${loc.type})\n${loc.country}`;
      circle.appendChild(title);
    });

  }, [locations, connections, centerOn]);

  return (
    <svg 
      ref={svgRef}
      className="w-full h-[400px] lg:h-[450px]"
      viewBox="0 0 900 450"
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
