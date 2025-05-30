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
      cy.elements().removeClass('selected connected');
      
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
  
  // Highlight selected node and connected elements
  useEffect(() => {
    if (cyRef.current && selectedNode) {
      const cy = cyRef.current;
      
      // Reset classes first
      cy.elements().removeClass('selected connected');
      
      // Get the selected node and highlight it
      const node = cy.getElementById(selectedNode);
      node.addClass('selected');
      
      // Get connected edges and nodes and highlight them
      const connectedEdges = node.connectedEdges();
      connectedEdges.addClass('connected');
      
      const connectedNodes = node.neighborhood('node');
      connectedNodes.addClass('connected');
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
              'width': 'mapData(weight, 1, 99, 1, 8)',
              'line-color': '#999',
              'curve-style': 'bezier'
            }
          },
          {
            selector: '.selected',
            style: {
              'background-color': '#f8c291',
              'line-color': '#f8c291',
              'text-outline-color': '#444',
              'color': '#fff',
              'z-index': 10
            }
          },
          {
            selector: '.connected',
            style: {
              'background-color': '#78e08f',
              'line-color': '#78e08f',
              'z-index': 9
            }
          }
        ]}
      />
    </div>
  );
};

export default GraphVisualization;
