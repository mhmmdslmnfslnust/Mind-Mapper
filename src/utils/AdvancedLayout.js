/**
 * Advanced layout utilities for optimizing Mind-Mapper graph visualization
 * Focusing on minimizing edge crossings and optimizing node placement
 */

/**
 * Apply an optimized layout that minimizes edge crossings and improves visual hierarchy
 * @param {Object} cy - Cytoscape instance
 * @param {Object} nodeImportance - Map of node IDs to their importance scores
 * @param {Object} options - Additional layout options
 * @returns {Object} - Layout object that can be run
 */
export const createOptimizedLayout = (cy, nodeImportance, options = {}) => {
  // Calculate crossings penalty matrix - nodes that would cause many crossings if placed near each other
  const crossingPenalties = calculateCrossingPenalties(cy);
  
  // Determine node tiers based on importance and centrality
  const nodeTiers = determineNodeTiers(nodeImportance);
  
  // Create a layout that combines multiple techniques
  return {
    name: 'fcose', // Using F-CoSE layout (Force-directed Compound Spring Embedder)
    
    // Core layout parameters for edge crossing minimization
    quality: 'proof',
    randomize: false,
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 50,
    
    // Positioning parameters
    nodeDimensionsIncludeLabels: true,
    uniformNodeDimensions: false,
    
    // Minimize edge crossings with specialized parameters
    samplingType: true,
    sampleSize: 100,
    nodeSeparation: 75,
    
    // Force-directed parameters
    gravity: 0.25,
    gravityRangeCompound: 1.5,
    gravityCompound: options.gravityCompound || 1.0,
    
    // Tier-based positioning
    idealEdgeLength: edge => {
      const sourceImportance = nodeImportance[edge.source().id()]?.compositeScore || 1;
      const targetImportance = nodeImportance[edge.target().id()]?.compositeScore || 1;
      const weight = edge.data('weight');
      
      // Shorter distances for stronger connections and more important nodes
      const baseLength = 200;
      const weightFactor = weight / 20; // Higher weight = shorter edge
      const importanceFactor = Math.max(sourceImportance, targetImportance) / 25;
      
      return Math.max(50, baseLength - (weightFactor * 70) - (importanceFactor * 50));
    },

    // Node forces based on importance
    nodeRepulsion: node => {
      const importance = nodeImportance[node.id()]?.compositeScore || 1;
      const normalizedImportance = nodeImportance[node.id()]?.normalized || 0.5;
      
      // Key technique: more important nodes get less repulsion to keep them central
      const baseRepulsion = 4500000;
      return baseRepulsion * (1.5 - (normalizedImportance * 0.8));
    },
    
    // Edge elasticity based on weight and importance
    edgeElasticity: edge => {
      const weight = edge.data('weight');
      // Stronger connections are more elastic (maintain ideal length better)
      return 100 + (weight * 3);
    },
    
    // Specialized options for different node tiers
    initialEnergyOnIncremental: 0.3,
    
    // Stability parameters to reduce jitter
    numIter: 5000,
    coolingFactor: 0.95,
    minTemp: 0.01,
    
    // Handle tier-based positioning after layout
    stop: function() {
      // Post-processing to further reduce crossings
      minimizeCrossingsByNodeAdjustment(cy, crossingPenalties, nodeTiers);
    },
    
    // Pass any additional options
    ...options
  };
};

/**
 * Calculate a matrix of penalties for node pairs that would cause many edge crossings
 * @param {Object} cy - Cytoscape instance
 * @returns {Object} - Map of penalties between node pairs
 */
function calculateCrossingPenalties(cy) {
  const penalties = {};
  const edges = cy.edges().toArray();
  
  // Build a map of edge connections for quick lookup
  const nodeConnections = {};
  edges.forEach(edge => {
    const source = edge.source().id();
    const target = edge.target().id();
    
    if (!nodeConnections[source]) nodeConnections[source] = [];
    if (!nodeConnections[target]) nodeConnections[target] = [];
    
    nodeConnections[source].push(target);
    nodeConnections[target].push(source);
  });
  
  // For each pair of nodes, estimate potential crossings
  const nodes = cy.nodes().toArray();
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i].id();
    
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j].id();
      
      // If nodes share connections, they might cause crossings if placed far apart
      const connectionsA = nodeConnections[nodeA] || [];
      const connectionsB = nodeConnections[nodeB] || [];
      
      // Count shared connections
      const shared = connectionsA.filter(conn => connectionsB.includes(conn)).length;
      
      // Also consider connections that would cross if these nodes were adjacent
      let potentialCrossings = 0;
      
      connectionsA.forEach(connA => {
        if (connA === nodeB) return; // Skip direct connection
        
        connectionsB.forEach(connB => {
          if (connB === nodeA) return; // Skip direct connection
          if (connA === connB) return; // Skip shared connection
          
          // These connections might cross
          potentialCrossings++;
        });
      });
      
      // Calculate penalty - higher means these nodes should be kept apart
      const penalty = potentialCrossings - (shared * 2);
      
      if (!penalties[nodeA]) penalties[nodeA] = {};
      if (!penalties[nodeB]) penalties[nodeB] = {};
      
      penalties[nodeA][nodeB] = penalty;
      penalties[nodeB][nodeA] = penalty;
    }
  }
  
  return penalties;
}

/**
 * Determine hierarchy tiers for nodes based on importance
 * @param {Object} nodeImportance - Map of node IDs to their importance scores
 * @returns {Object} - Map of node IDs to their tier level (0 = most important)
 */
function determineNodeTiers(nodeImportance) {
  const tiers = {};
  const nodes = Object.keys(nodeImportance);
  
  // Sort nodes by composite score, descending
  const sortedNodes = nodes.sort((a, b) => {
    return nodeImportance[b].compositeScore - nodeImportance[a].compositeScore;
  });
  
  // Assign tiers based on importance percentiles
  sortedNodes.forEach((nodeId, index) => {
    const percentile = index / sortedNodes.length;
    
    // Tier 0: Top 10% most important nodes (central)
    // Tier 1: Next 20% important nodes (inner ring)
    // Tier 2: Next 30% important nodes (middle ring)
    // Tier 3: Bottom 40% important nodes (outer ring)
    if (percentile < 0.1) {
      tiers[nodeId] = 0;
    } else if (percentile < 0.3) {
      tiers[nodeId] = 1;
    } else if (percentile < 0.6) {
      tiers[nodeId] = 2;
    } else {
      tiers[nodeId] = 3;
    }
  });
  
  return tiers;
}

/**
 * Post-process the layout to further minimize edge crossings
 * @param {Object} cy - Cytoscape instance
 * @param {Object} crossingPenalties - Map of penalties between node pairs
 * @param {Object} nodeTiers - Map of node IDs to their tier level
 */
function minimizeCrossingsByNodeAdjustment(cy, crossingPenalties, nodeTiers) {
  const centerX = cy.width() / 2;
  const centerY = cy.height() / 2;
  
  // Get all nodes in order of importance tier (most important first)
  const tierGroups = {};
  Object.entries(nodeTiers).forEach(([nodeId, tier]) => {
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(nodeId);
  });
  
  // Start with tier 0 (most important) nodes and position near center
  const tier0 = tierGroups[0] || [];
  if (tier0.length > 0) {
    // Position tier 0 nodes in a small circle around center
    const radius = 100;
    const angleStep = (2 * Math.PI) / tier0.length;
    
    tier0.forEach((nodeId, index) => {
      const node = cy.getElementById(nodeId);
      if (!node) return;
      
      const angle = angleStep * index;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      node.animate({
        position: { x, y },
        duration: 500,
        easing: 'ease-out'
      });
    });
  }
  
  // For remaining tiers, consider crossing penalties when adjusting positions
  [1, 2, 3].forEach(tier => {
    const tierNodes = tierGroups[tier] || [];
    if (tierNodes.length === 0) return;
    
    tierNodes.forEach(nodeId => {
      const node = cy.getElementById(nodeId);
      if (!node) return;
      
      const position = node.position();
      
      // Calculate "better" position with less crossings
      let adjustX = 0;
      let adjustY = 0;
      
      // Consider penalties with all other positioned nodes
      Object.entries(crossingPenalties[nodeId] || {}).forEach(([otherId, penalty]) => {
        const otherNode = cy.getElementById(otherId);
        if (!otherNode) return;
        
        const otherPos = otherNode.position();
        const dx = position.x - otherPos.x;
        const dy = position.y - otherPos.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // If penalty is positive, nodes should be kept apart to reduce crossings
        // If penalty is negative, nodes should be closer to reduce crossings
        if (distance > 0) {
          // Normalize direction vector
          const nx = dx / distance;
          const ny = dy / distance;
          
          // Apply force based on penalty
          const force = penalty / 20;
          adjustX += nx * force;
          adjustY += ny * force;
        }
      });
      
      // Apply the adjustment as a small correction
      const correctionFactor = 0.3;
      const newX = position.x + adjustX * correctionFactor;
      const newY = position.y + adjustY * correctionFactor;
      
      node.animate({
        position: { x: newX, y: newY },
        duration: 300,
        easing: 'ease-out'
      });
    });
  });
}

/**
 * Enhanced importance calculation that considers global graph properties
 * @param {Object} cy - Cytoscape instance 
 * @returns {Object} - Enhanced importance scores
 */
export const calculateEnhancedImportance = (cy) => {
  const importanceScores = {};
  
  // Calculate basic metrics first
  cy.nodes().forEach(node => {
    const connectedEdges = node.connectedEdges();
    const degree = connectedEdges.length;
    
    // Sum of all connected edge weights
    const totalWeight = connectedEdges.reduce((sum, edge) => {
      return sum + edge.data('weight');
    }, 0);
    
    // Average weight (avoid division by zero)
    const avgWeight = degree > 0 ? totalWeight / degree : 0;
    
    // Basic composite score: combination of degree and total weight
    const compositeScore = degree * (avgWeight || 1);
    
    importanceScores[node.id()] = {
      degree,
      totalWeight,
      avgWeight,
      compositeScore
    };
  });
  
  // Calculate betweenness centrality as an additional factor
  // This measures how often a node acts as a bridge along the shortest path between other nodes
  const betweenness = {};
  
  try {
    // Use Cytoscape's built-in centrality algorithm if available
    const centrality = cy.elements().betweennessCentrality();
    cy.nodes().forEach(node => {
      betweenness[node.id()] = centrality.betweenness(node);
    });
  } catch (e) {
    // Fallback: simple approximation
    cy.nodes().forEach(node => {
      betweenness[node.id()] = 0;
    });
  }
  
  // Incorporate betweenness into the importance scores
  Object.keys(importanceScores).forEach(nodeId => {
    const betweennessValue = betweenness[nodeId] || 0;
    const normalizedBetweenness = betweennessValue * 5; // Scale up for visibility
    
    importanceScores[nodeId].betweenness = betweennessValue;
    
    // Enhance the composite score with betweenness
    importanceScores[nodeId].compositeScore += normalizedBetweenness;
  });
  
  // Normalize the composite scores
  const normalizedScores = getNormalizedWeights(importanceScores);
  
  // Add normalized scores to the importance scores object
  Object.keys(importanceScores).forEach(nodeId => {
    importanceScores[nodeId].normalized = normalizedScores[nodeId];
  });
  
  return importanceScores;
}

/**
 * Get normalized weights for layout calculations (copied from layoutUtils)
 * @param {Object} scores - Node importance scores
 * @returns {Object} - Map of node IDs to normalized values (0-1)
 */
function getNormalizedWeights(scores) {
  const normalized = {};
  
  // Find min and max composite scores
  let minScore = Infinity;
  let maxScore = -Infinity;
  
  Object.values(scores).forEach(score => {
    minScore = Math.min(minScore, score.compositeScore);
    maxScore = Math.max(maxScore, score.compositeScore);
  });
  
  // Normalize scores between 0 and 1
  // If all scores are the same, default to 0.5
  const scoreRange = maxScore - minScore;
  
  Object.entries(scores).forEach(([nodeId, score]) => {
    normalized[nodeId] = scoreRange > 0 
      ? (score.compositeScore - minScore) / scoreRange 
      : 0.5;
  });
  
  return normalized;
}
