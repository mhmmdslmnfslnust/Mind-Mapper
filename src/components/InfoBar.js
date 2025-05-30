import React from 'react';
import './InfoBar.css';

const InfoBar = ({ selectedNode, connectedNodes }) => {
  if (!selectedNode) {
    return (
      <div className="info-bar">
        <p>Click on a node to see its connections</p>
      </div>
    );
  }
  
  return (
    <div className="info-bar">
      <div className="selected-node">
        <strong>Selected:</strong> {selectedNode}
      </div>
      <div className="connected-nodes">
        <strong>Connected to:</strong> {
          connectedNodes.length > 0 
            ? connectedNodes.join(', ')
            : 'No connections'
        }
      </div>
    </div>
  );
};

export default InfoBar;
