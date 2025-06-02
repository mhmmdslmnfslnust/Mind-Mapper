import React, { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { calculateNodeImportance, getNormalizedWeights } from '../utils/layoutUtils';
import { calculateEnhancedImportance, createOptimizedLayout } from '../utils/AdvancedLayout';
import './GraphVisualization.css';

// Register cytoscape-fcose extension if needed
// You'll need to add this package to your dependencies
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';

// Register the fcose layout extension
try {
  cytoscape.use(fcose);
} catch (e) {
  console.warn("Note: fcose registration issue - the layout may fallback to default:", e.message);
}

const GraphVisualization = ({ 
  elements, 
  selectedNode,
  onNodeSelect 
}) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  
  // Apply styling and layout when elements change
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      
      // Reset selection
      cy.elements().removeClass('selected connected-1 connected-2 connected-3');
      
      // Apply smart layout only if we have nodes
      if (cy.nodes().length > 0) {
        try {
          // Use enhanced importance calculation
          const importanceScores = calculateEnhancedImportance(cy);
          
          // Create and run optimized layout
          const layout = createOptimizedLayout(cy, importanceScores);
          layout.run();
        } catch (e) {
          console.warn("Error applying optimized layout, falling back to standard layout:", e);
          
          // Fallback to basic layout
          const importanceScores = calculateNodeImportance(cy);
          const normalizedWeights = getNormalizedWeights(importanceScores);
          
          cy.layout({
            name: 'cose',
            // Core layout parameters
            idealEdgeLength: edge => {
              // Shorter distances for stronger connections
              return 150 - (edge.data('weight') * 1.2);
            },
            nodeOverlap: 25,
            refresh: 20,
            fit: true,
            padding: 40,
            randomize: false,
            
            // Gravity effect - central force pulling nodes inward
            gravity: 80,
            gravityRangeCompound: 1.2,
            gravityCompound: 1.0,
            
            // Forces controlling node positioning
            nodeRepulsion: node => {
              // More important nodes have less repulsion (stay more central)
              const importance = normalizedWeights[node.id()];
              return 500000 * (1.5 - (importance * 0.8)); // Scale from 0.7 to 1.5 times base value
            },
            edgeElasticity: edge => {
              // Stronger connections (higher weight) have more elasticity
              return 180 * (edge.data('weight') / 50 + 0.5); // Scale from 0.5 to 2.5 times base value
            },
            
            // Specialized positioning optimization
            nestingFactor: 5,
            numIter: 3000, // More iterations for better convergence
            initialTemp: 150,
            coolingFactor: 0.97, // Slower cooling for better equilibrium
            minTemp: 0.5, // Lower minimum temperature
            
            // Prevent excessive movement after stabilization
            animate: true,
            animationDuration: 1500,
            animationEasing: 'ease-out',
            
            // Stop animation after layout is done
            stop: function() {
              // Add additional positions fine-tuning here if needed
              // For example, ensure central nodes are really central
              const centerX = cy.width() / 2;
              const centerY = cy.height() / 2;
              
              // Optional: Move the highest importance nodes slightly more to center
              cy.nodes().forEach(node => {
                const importance = normalizedWeights[node.id()] || 0;
                if (importance > 0.8) { // For the most important nodes
                  const position = node.position();
                  const dx = centerX - position.x;
                  const dy = centerY - position.y;
                  
                  // Move 10-20% more toward center based on importance
                  const moveRatio = 0.1 + (importance - 0.8) * 0.25; // 0.1 to 0.2
                  
                  node.animate({
                    position: {
                      x: position.x + dx * moveRatio,
                      y: position.y + dy * moveRatio
                    },
                    duration: 500,
                    easing: 'ease-out'
                  });
                }
              });
            }
          }).run();
        }
      }
    }
  }, [elements]);
  
  // Highlight selected node and connected elements with cascading effect
  useEffect(() => {
    if (cyRef.current && selectedNode) {
      const cy = cyRef.current;
      
      // Reset classes first
      cy.elements().removeClass('selected connected-1 connected-2 connected-3');
      
      // Get the selected node and highlight it
      const selectedNodeEle = cy.getElementById(selectedNode);
      selectedNodeEle.addClass('selected');
      
      // Track which nodes have been processed to avoid duplicates
      const processedNodes = new Set([selectedNode]);
      
      // First-degree connections
      const firstDegreeNodes = new Set();
      const firstDegreeEdges = selectedNodeEle.connectedEdges();
      
      firstDegreeEdges.forEach(edge => {
        edge.addClass('connected-1');
        
        // Get connected nodes
        const connectedNodes = edge.connectedNodes().filter(node => 
          node.id() !== selectedNode
        );
        
        connectedNodes.forEach(node => {
          node.addClass('connected-1');
          firstDegreeNodes.add(node.id());
          processedNodes.add(node.id());
        });
      });
      
      // Second-degree connections
      const secondDegreeNodes = new Set();
      firstDegreeNodes.forEach(nodeId => {
        const node = cy.getElementById(nodeId);
        const edges = node.connectedEdges().filter(edge => 
          !edge.hasClass('connected-1') && 
          !edge.hasClass('selected')
        );
        
        edges.forEach(edge => {
          edge.addClass('connected-2');
          
          // Get connected nodes that haven't been processed yet
          const connectedNodes = edge.connectedNodes().filter(n => 
            !processedNodes.has(n.id())
          );
          
          connectedNodes.forEach(connNode => {
            connNode.addClass('connected-2');
            secondDegreeNodes.add(connNode.id());
            processedNodes.add(connNode.id());
          });
        });
      });
      
      // Third-degree connections
      secondDegreeNodes.forEach(nodeId => {
        const node = cy.getElementById(nodeId);
        const edges = node.connectedEdges().filter(edge => 
          !edge.hasClass('connected-1') && 
          !edge.hasClass('connected-2') && 
          !edge.hasClass('selected')
        );
        
        edges.forEach(edge => {
          edge.addClass('connected-3');
          
          // Get connected nodes that haven't been processed yet
          const connectedNodes = edge.connectedNodes().filter(n => 
            !processedNodes.has(n.id())
          );
          
          connectedNodes.forEach(connNode => {
            connNode.addClass('connected-3');
            processedNodes.add(connNode.id());
          });
        });
      });
    }
  }, [selectedNode]);
  
  return (
    <div className="graph-container-wrapper" ref={containerRef}>
      <div className="graph-container">
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%' }}
          cy={(cy) => {
            cyRef.current = cy;
            
            // Revert to simpler zoom/pan configuration
            cy.userZoomingEnabled(true); // Enable built-in zoom
            cy.userPanningEnabled(true);  // Enable built-in panning
            cy.zoomingEnabled(true);
            cy.boxSelectionEnabled(false);
            
            // Configure reasonable zoom limits
            cy.minZoom(0.1);
            cy.maxZoom(3.0);
            
            // Reset viewport on double click
            cy.on('dbltap', event => {
              if (event.target === cy) {
                cy.animate({
                  fit: {
                    eles: cy.elements(),
                    padding: 50
                  },
                  duration: 500,
                  easing: 'ease-in-out'
                });
              }
            });
            
            // Set up node click handler
            cy.on('tap', 'node', function(evt) {
              const node = evt.target;
              onNodeSelect(node.id());
            });
            
            cy.on('tap', function(evt) {
              if (evt.target === cy) {
                // Clicked on background
                onNodeSelect(null);
              }
            });
          }}
          stylesheet={[
            {
              selector: 'node',
              style: {
                'background-color': '#666',
                'label': 'data(id)',
                'color': '#fff',
                'text-outline-color': '#222',
                'text-outline-width': 2,
                'font-size': 14
              }
            },
            {
              // Base edge style that applies to ALL edges regardless of selection
              selector: 'edge',
              style: {
                // Dramatically enhanced weight visualization 
                'width': function(edge) {
                  // More dramatic thickness variation
                  const weight = edge.data('weight');
                  // Thinner minimum, much thicker maximum
                  const minWidth = 1;
                  const maxWidth = 20;
                  
                  // Use cubic scaling for extreme differentiation
                  const normalizedWeight = (weight - 1) / 98; // 0-1 range
                  const scaledWeight = Math.pow(normalizedWeight, 2); // Quadratic growth
                  return minWidth + scaledWeight * (maxWidth - minWidth);
                },
                'line-color': function(edge) {
                  // Clear color progression with dramatic blue gradient
                  const weight = edge.data('weight');
                  
                  // Get a color along gradient from dark blue to bright cyan
                  // Map weights 1-99 to hues from 220 to 180
                  const hue = 220 - ((weight - 1) / 98) * 40; 
                  
                  // Increase saturation and brightness with weight
                  const saturation = 70 + ((weight - 1) / 98) * 30; // 70-100%
                  const lightness = 25 + ((weight - 1) / 98) * 50;  // 25-75%
                  
                  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                },
                'curve-style': 'bezier',
                'opacity': 0.8, // Default opacity
                'label': 'data(weight)',  // Show weight as label
                'font-size': function(edge) {
                  // Make labels on stronger edges more prominent
                  const weight = edge.data('weight');
                  // Progressive size increase
                  if (weight < 25) return 9;
                  if (weight < 50) return 10;
                  if (weight < 75) return 11;
                  return 12;
                },
                'color': '#ffffff',
                'text-outline-width': 1,
                'text-outline-color': '#000000',
                'text-background-opacity': 0.5,
                'text-background-color': function(edge) {
                  // Match background to edge color but darker
                  const weight = edge.data('weight');
                  const hue = 220 - ((weight - 1) / 98) * 40;
                  return `hsla(${hue}, 70%, 20%, 0.8)`;
                },
                'text-background-padding': 2,
                'text-rotation': 'autorotate', // Align text with edges
                'arrow-scale': 0, // No arrows for undirected graph
                'text-margin-y': -5 // Position text above line
              }
            },
            // Add special style for strongest edges
            {
              selector: 'edge[weight >= 80]',
              style: {
                'shadow-blur': 10,
                'shadow-color': function(edge) {
                  const weight = edge.data('weight');
                  const hue = 220 - ((weight - 1) / 98) * 40;
                  const saturation = 70 + ((weight - 1) / 98) * 30;
                  const lightness = 45;
                  return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
                },
                'shadow-opacity': function(edge) {
                  const weight = edge.data('weight');
                  return (weight - 80) / 20 * 0.8; // 0-0.8 range based on weight 80-99
                }
              }
            },
            // Style for selected node
            {
              selector: '.selected',
              style: {
                'background-color': '#f8c291',
                'border-width': 3,
                'border-color': '#e55039',
                'text-outline-color': '#444',
                'color': '#fff',
                'z-index': 10,
                'font-weight': 'bold',
                'font-size': 16
              }
            },
            // First-degree connections (direct) - preserve weight-based styling
            {
              selector: '.connected-1',
              style: {
                'background-color': '#78e08f',
                'z-index': 9,
                'font-size': 14,
                'opacity': 1
              }
            },
            // Second-degree connections - preserve weight-based styling
            {
              selector: '.connected-2',
              style: {
                'background-color': '#38ada9',
                'opacity': 0.7,
                'z-index': 8
              }
            },
            // Third-degree connections - preserve weight-based styling
            {
              selector: '.connected-3',
              style: {
                'background-color': '#3c6382',
                'opacity': 0.4,
                'z-index': 7
              }
            },
            // Style for edges in selected state - use edge-specific selectors
            {
              selector: 'edge.connected-1',
              style: {
                'line-color': '#78e08f',
                'opacity': 1
              }
            },
            {
              selector: 'edge.connected-2',
              style: {
                'line-color': '#38ada9',
                'opacity': 0.7
              }
            },
            {
              selector: 'edge.connected-3',
              style: {
                'line-color': '#3c6382',
                'opacity': 0.4
              }
            }
          ]}
          // Use default zoom settings that were working initially
          wheelSensitivity={0.3}
          panningEnabled={true}
          zoomingEnabled={true}
          userZoomingEnabled={true}
          userPanningEnabled={true}
          boxSelectionEnabled={false}
          autoungrabify={false}
          autounselectify={false}
        />
      </div>
      
      <div className="zoom-controls">
        <button 
          onClick={() => {
            if (cyRef.current) {
              try {
                const cy = cyRef.current;
                cy.zoom(cy.zoom() * 1.2);
              } catch (error) {
                console.warn("Error zooming in:", error);
              }
            }
          }}
          className="zoom-button"
        >
          +
        </button>
        <button 
          onClick={() => {
            if (cyRef.current) {
              try {
                const cy = cyRef.current;
                cy.zoom(cy.zoom() * 0.8);
              } catch (error) {
                console.warn("Error zooming out:", error);
              }
            }
          }}
          className="zoom-button"
        >
          -
        </button>
        <button 
          onClick={() => {
            if (cyRef.current) {
              try {
                const cy = cyRef.current;
                cy.fit(undefined, 50);
              } catch (error) {
                console.warn("Error resetting view:", error);
              }
            }
          }}
          className="zoom-button"
        >
          ↻
        </button>
      </div>
    </div>
  );
};

export default GraphVisualization;
