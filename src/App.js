import React, { useState, useCallback } from 'react';
import './App.css';
import InputPanel from './components/InputPanel';
import GraphVisualization from './components/GraphVisualization';
import InfoBar from './components/InfoBar';
import { parseText, toCytoscapeFormat } from './modules/Parser';
import { getConnectedNodes } from './modules/GraphModel';
import { saveToJsonFile, loadFromJsonFile } from './utils/fileUtils';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [elements, setElements] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [connectedNodes, setConnectedNodes] = useState([]);
  
  // Handle parsing the input text
  const handleParse = useCallback((text) => {
    const parsedData = parseText(text);
    setGraphData(parsedData);
    setElements(toCytoscapeFormat(parsedData));
    setSelectedNode(null);
    setConnectedNodes([]);
  }, []);
  
  // Handle node selection
  const handleNodeSelect = useCallback((nodeId) => {
    setSelectedNode(nodeId);
    if (nodeId) {
      const connected = getConnectedNodes(graphData, nodeId);
      setConnectedNodes(connected);
    } else {
      setConnectedNodes([]);
    }
  }, [graphData]);
  
  // Handle saving the current graph
  const handleSave = useCallback(() => {
    saveToJsonFile(graphData);
  }, [graphData]);
  
  // Handle loading a graph from file
  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (file) {
          const loadedData = await loadFromJsonFile(file);
          setGraphData(loadedData);
          setElements(toCytoscapeFormat(loadedData));
          setSelectedNode(null);
          setConnectedNodes([]);
        }
      } catch (error) {
        alert(`Error loading file: ${error.message}`);
      }
    };
    input.click();
  }, []);
  
  return (
    <div className="app">
      <header>
        <h1>Mind Mapper</h1>
      </header>
      
      <main>
        <InputPanel 
          onParse={handleParse} 
          onLoadExample={handleParse} 
        />
        
        <div className="visualization-container">
          <div className="toolbar">
            <button onClick={handleSave} className="btn">Save</button>
            <button onClick={handleLoad} className="btn">Load</button>
          </div>
          
          <GraphVisualization 
            elements={elements} 
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
          />
          
          <InfoBar 
            selectedNode={selectedNode} 
            connectedNodes={connectedNodes} 
          />
        </div>
      </main>
      
      <footer>
        <p>Mind Mapper - A visual idea-mapping tool</p>
      </footer>
    </div>
  );
}

export default App;
