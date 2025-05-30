import React, { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import './GraphVisualization.css';

const GraphVisualization = ({ 
  elements, 
  selectedNode,
  onNodeSelect 
}) => {
  const cyRef = useRef(null);
  
  // Apply styling and layout when elements change
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      
      // Reset selection
      cy.elements().removeClass('selected connected-1 connected-2 connected-3');
      
      // Apply layout
      cy.layout({
        name: 'cose', // force-directed layout
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }).run();
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
    <div className="graph-container">
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => {
          cyRef.current = cy;
          
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
      />
    </div>
  );
};

export default GraphVisualization;
