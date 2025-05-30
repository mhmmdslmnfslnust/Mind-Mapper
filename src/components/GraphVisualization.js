import React, { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { calculateNodeImportance, getNormalizedWeights } from '../utils/layoutUtils';
import './GraphVisualization.css';

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
        // Calculate importance for each node
        const importanceScores = calculateNodeImportance(cy);
        const normalizedWeights = getNormalizedWeights(importanceScores);
        
        // Apply layout with smart positioning
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
              selector: 'edge',
              style: {
                // Enhanced weight visualization with wider range and min width
                'width': 'mapData(weight, 1, 99, 2, 12)',
                'line-color': 'mapData(weight, 1, 99, #555555, #eeeeee)',
                'curve-style': 'bezier',
                'opacity': 0.8,
                'label': 'data(weight)',  // Show weight as label
                'font-size': 10,
                'color': '#ffffff',
                'text-outline-width': 1,
                'text-outline-color': '#000000',
                'text-background-opacity': 0.5,
                'text-background-color': '#333333',
                'text-background-padding': 2
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
            // First-degree connections (direct)
            {
              selector: '.connected-1',
              style: {
                'background-color': '#78e08f',
                'line-color': '#78e08f',
                'opacity': 1,
                'z-index': 9,
                'font-size': 14
              }
            },
            // Second-degree connections
            {
              selector: '.connected-2',
              style: {
                'background-color': '#38ada9',
                'line-color': '#38ada9',
                'opacity': 0.7,
                'z-index': 8
              }
            },
            // Third-degree connections
            {
              selector: '.connected-3',
              style: {
                'background-color': '#3c6382',
                'line-color': '#3c6382',
                'opacity': 0.4,
                'z-index': 7
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
          Reset
        </button>
      </div>
    </div>
  );
};

export default GraphVisualization;
