import React, { useState } from 'react';
import './InputPanel.css';

const InputPanel = ({ onParse, onLoadExample }) => {
  const [inputText, setInputText] = useState('');
  
  const handleParseClick = () => {
    onParse(inputText);
  };
  
  const handleLoadExample = () => {
    const example = "{toxic shame}(08){addictions}\n{self-worth}(06){relationships}\n{childhood trauma}(09){anxiety}\n{anxiety}(07){addictions}\n{toxic shame}(09){self-worth}";
    setInputText(example);
    onLoadExample(example);
  };
  
  return (
    <div className="input-panel">
      <textarea
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder="Enter relationships in format: {Idea A}(weight){Idea B}
Example: {toxic shame}(08){addictions}"
        rows={5}
      />
      <div className="button-container">
        <button onClick={handleParseClick} className="btn btn-primary">Parse & Visualize</button>
        <button onClick={handleLoadExample} className="btn">Load Example</button>
      </div>
    </div>
  );
};

export default InputPanel;
