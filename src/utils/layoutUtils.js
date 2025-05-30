/**
 * Utilities for smart graph layout calculations
 */

/**
 * Calculate importance score for each node in the graph
 * @param {Object} cy - Cytoscape instance
 * @returns {Object} - Map of node IDs to their importance scores
 */
export const calculateNodeImportance = (cy) => {
  const importanceScores = {};
  
  // Calculate for each node
  cy.nodes().forEach(node => {
    const connectedEdges = node.connectedEdges();
    const degree = connectedEdges.length;
    
    // Sum of all connected edge weights
    const totalWeight = connectedEdges.reduce((sum, edge) => {
      return sum + edge.data('weight');
    }, 0);
    
    // Average weight (avoid division by zero)
    const avgWeight = degree > 0 ? totalWeight / degree : 0;
    
    // Composite score: combination of degree and total weight
    // This formula can be adjusted based on preference
    const compositeScore = degree * (avgWeight || 1);
    
    importanceScores[node.id()] = {
      degree,
      totalWeight,
      avgWeight,
      compositeScore
    };
  });
  
  return importanceScores;
};

/**
 * Get normalized weights for layout calculations
 * @param {Object} scores - Node importance scores
 * @returns {Object} - Map of node IDs to normalized values (0-1)
 */
export const getNormalizedWeights = (scores) => {
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
};
