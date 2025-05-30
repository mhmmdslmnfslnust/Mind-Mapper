/**
 * Parser module for converting custom syntax into graph data
 */

// Parse input text to extract nodes and edges
const parseText = (text) => {
  const nodes = new Set();
  const edges = [];
  
  // Split input by lines
  const lines = text.trim().split('\n');
  
  lines.forEach(line => {
    // Skip empty lines
    if (!line.trim()) return;
    
    // Match pattern {Node A}(weight){Node B}
    const regex = /\{([^{}]+)\}\(([0-9]{1,2})\)\{([^{}]+)\}/;
    const match = line.match(regex);
    
    if (match) {
      const nodeA = match[1].trim();
      const weight = parseInt(match[2], 10);
      const nodeB = match[3].trim();
      
      // Add nodes to set (automatically handles duplicates)
      nodes.add(nodeA);
      nodes.add(nodeB);
      
      // Add edge
      edges.push({
        from: nodeA,
        to: nodeB,
        weight: weight
      });
    }
  });
  
  return {
    nodes: Array.from(nodes).map(id => ({ id })),
    edges
  };
};

// Convert parsed data to Cytoscape format
const toCytoscapeFormat = (parsedData) => {
  const elements = [];
  
  // Add nodes
  parsedData.nodes.forEach(node => {
    elements.push({
      data: { id: node.id }
    });
  });
  
  // Add edges with unique IDs based on both nodes and index
  parsedData.edges.forEach((edge, index) => {
    elements.push({
      data: {
        // Create truly unique edge ID using both node names and index
        id: `edge-${edge.from}-${edge.to}-${index}`,
        source: edge.from,
        target: edge.to,
        weight: edge.weight
      }
    });
  });
  
  return elements;
};

export { parseText, toCytoscapeFormat };
