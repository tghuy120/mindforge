import { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import Box from '@mui/material/Box';
import type { GraphData, GraphNode, GraphLink } from '../types';
import { RELATION_COLORS } from '../theme';

interface GraphViewerProps {
  graphData: GraphData;
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode) => void;
  focusNodeId: string | null;
  onFocusHandled: () => void;
  panelOpen: boolean;
}

export default function GraphViewer({
  graphData,
  selectedNode,
  onNodeClick,
  focusNodeId,
  onFocusHandled,
  panelOpen,
}: GraphViewerProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight - 64 });

  useEffect(() => {
    const handleResize = () => {
      const w = panelOpen ? window.innerWidth - 350 : window.innerWidth;
      setDimensions({ width: w, height: window.innerHeight - 64 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panelOpen]);

  useEffect(() => {
    if (focusNodeId && fgRef.current) {
      const node = graphData.nodes.find((n) => n.id === focusNodeId);
      if (node) {
        fgRef.current.centerAt(
          (node as GraphNode & { x?: number }).x ?? 0,
          (node as GraphNode & { y?: number }).y ?? 0,
          800
        );
        fgRef.current.zoom(3, 800);
        onNodeClick(node);
      }
      onFocusHandled();
    }
  }, [focusNodeId, graphData.nodes, onNodeClick, onFocusHandled]);

  const highlightNodes = useCallback(() => {
    const set = new Set<string>();
    const target = hoverNode || selectedNode;
    if (!target) return set;
    set.add(target.id);
    graphData.links.forEach((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      if (src === target.id) set.add(tgt);
      if (tgt === target.id) set.add(src);
    });
    return set;
  }, [hoverNode, selectedNode, graphData.links]);

  const highlighted = highlightNodes();

  const nodeCanvasObject = useCallback(
    (node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = Math.sqrt(node.val) * 1.5;
      const isHighlighted = highlighted.has(node.id);
      const isSelected = selectedNode?.id === node.id;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.globalAlpha = isHighlighted || highlighted.size === 0 ? 1 : 0.25;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (globalScale > 1.5 || isHighlighted) {
        const fontSize = Math.max(10 / globalScale, 1.5);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#333';
        ctx.globalAlpha = isHighlighted || highlighted.size === 0 ? 1 : 0.3;
        ctx.fillText(node.title, x, y + r + 2);
      }

      ctx.globalAlpha = 1;
    },
    [highlighted, selectedNode]
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const src = typeof link.source === 'string' ? link.source : link.source.id;
      const tgt = typeof link.target === 'string' ? link.target : link.target.id;
      if (highlighted.size > 0 && !highlighted.has(src) && !highlighted.has(tgt)) {
        return 'rgba(200,200,200,0.15)';
      }
      return RELATION_COLORS[link.relation_type] || RELATION_COLORS.untyped;
    },
    [highlighted]
  );

  return (
    <Box sx={{ position: 'relative', flex: 1, bgcolor: '#fafafa' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: GraphNode & { x?: number; y?: number }, color, ctx) => {
          const r = Math.sqrt(node.val) * 1.5;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
          ctx.fill();
        }}
        linkColor={linkColor}
        linkWidth={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={(node) => onNodeClick(node as GraphNode)}
        onNodeHover={(node) => setHoverNode((node as GraphNode) || null)}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </Box>
  );
}
