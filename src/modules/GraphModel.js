/**
 * Graph model that manages nodes and edges state
 */

// Create a new graph
const createGraph = () => {
  return {
    nodes: [],
    edges: []
  };
};

// Add a node to the graph if it doesn't exist
const addNode = (graph, nodeId) => {
  if (!graph.nodes.some(node => node.id === nodeId)) {
    graph.nodes.push({ id: nodeId });
  }
  return graph;
};

// Add an edge to the graph
const addEdge = (graph, fromNode, toNode, weight) => {
  // Ensure nodes exist
  addNode(graph, fromNode);
  addNode(graph, toNode);
  
  // Add edge
  graph.edges.push({
    from: fromNode,
    to: toNode,
    weight: weight
  });
  
  return graph;
};

// Get connected nodes for a specific node
const getConnectedNodes = (graph, nodeId) => {
  const connectedNodes = new Set();
  
  graph.edges.forEach(edge => {
    if (edge.from === nodeId) {
      connectedNodes.add(edge.to);
    }
    if (edge.to === nodeId) {
      connectedNodes.add(edge.from);
    }
  });
  
  return Array.from(connectedNodes);
};

// Get edges connected to a node
const getConnectedEdges = (graph, nodeId) => {
  return graph.edges.filter(edge => 
    edge.from === nodeId || edge.to === nodeId
  );
};

export {
  createGraph,
  addNode,
  addEdge,
  getConnectedNodes,
  getConnectedEdges
};
