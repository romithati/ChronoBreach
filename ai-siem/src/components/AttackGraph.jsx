"use client";

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User, Server, Terminal, FileText, Mail, Network } from 'lucide-react';
import dagre from '@dagrejs/dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Choose Lucide icons based on entity types
const getEntityIcon = (type) => {
  const normalizedType = type?.toString().toLowerCase().trim() || '';
  switch (normalizedType) {
    case 'user': return <User size={16} className="text-blue-400 shrink-0" />;
    case 'ip': return <Network size={16} className="text-emerald-400 shrink-0" />;
    case 'hostname': 
    case 'system': return <Server size={16} className="text-purple-400 shrink-0" />;
    case 'file': return <FileText size={16} className="text-amber-400 shrink-0" />;
    case 'process': return <Terminal size={16} className="text-rose-400 shrink-0" />;
    default: return <Mail size={16} className="text-cyan-400 shrink-0" />;
  }
};

const nodeWidth = 220;
const nodeHeight = 55;

// Auto-calculate horizontal timeline graph positions
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'left',
      sourcePosition: 'right',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

export default function AttackGraph({ activeStep, dynamicGraph }) {
  // Use dynamicGraph if available, otherwise fallback to empty arrays
  const sourceGraph = dynamicGraph || { nodes: [], edges: [] };

  const { nodes, edges } = useMemo(() => {
    if (!sourceGraph?.nodes || !sourceGraph?.edges) {
      return { nodes: [], edges: [] };
    }

    const transformedNodes = sourceGraph.nodes.map((node) => ({
      id: node.id,
      data: { 
        label: (
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-100">
            {getEntityIcon(node.type)}
            <span className="truncate">{node.label}</span>
          </div>
        ), 
      },
      style: {
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        width: nodeWidth,
      },
    }));

    const transformedEdges = sourceGraph.edges.map((edge, index) => ({
      id: `e-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.action,
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95 },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
    }));

    return getLayoutedElements(transformedNodes, transformedEdges);
  }, [sourceGraph]);

  // Determine how many nodes should be visible based on the active step
  const visibleNodesCount = Math.min(nodes.length, Math.max(4, (activeStep + 1) * 3));
  
  // Keep ALL nodes in the DOM so fitView works perfectly, but fade them in!
  const animatedNodes = nodes.map((node, index) => ({
    ...node,
    style: {
      ...node.style,
      opacity: index < visibleNodesCount ? 1 : 0,
      transition: 'opacity 0.8s ease-in-out',
      pointerEvents: index < visibleNodesCount ? 'all' : 'none',
    }
  }));

  const animatedEdges = edges.map((edge) => {
    const sourceVisible = animatedNodes.find(n => n.id === edge.source)?.style.opacity === 1;
    const targetVisible = animatedNodes.find(n => n.id === edge.target)?.style.opacity === 1;
    return {
      ...edge,
      style: {
        ...edge.style,
        opacity: sourceVisible && targetVisible ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out',
      }
    };
  });

  return (
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={animatedNodes}
        edges={animatedEdges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 fill-slate-300" />
      </ReactFlow>
    </div>
  );
}