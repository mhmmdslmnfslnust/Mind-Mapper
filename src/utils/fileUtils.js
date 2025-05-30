import { saveAs } from 'file-saver';

// Save graph data to a JSON file
export const saveToJsonFile = (graphData) => {
  const blob = new Blob([JSON.stringify(graphData, null, 2)], {
    type: 'application/json'
  });
  saveAs(blob, 'mind-map.json');
};

// Load graph data from a file
export const loadFromJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const graphData = JSON.parse(event.target.result);
        resolve(graphData);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};
