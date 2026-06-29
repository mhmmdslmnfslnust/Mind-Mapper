import React, { useEffect, useState } from 'react';
import './InputPanel.css';

const InputPanel = ({ onParse, onLoadExample }) => {
  const example = `
{envy}(09){social comparison}
{envy}(08){insecurity}
{social comparison}(09){curated feeds}
{social comparison}(08){upward comparison}
{curated feeds}(08){social media use}
{upward comparison}(08){insecurity}
{social media use}(07){dopamine loops}
{social media use}(06){FOMO}
{FOMO}(07){anxiety}
{insecurity}(09){self-worth}
{insecurity}(08){confidence}
{confidence}(08){self-worth}
{self-worth}(07){authenticity}
{confidence}(06){boundary setting}
{authenticity}(06){online relationships}
{online relationships}(07){belonging}
{online relationships}(08){loneliness}
{belonging}(05){support}
{loneliness}(08){isolation}
{research}(07){confirmation bias}
{research}(08){algorithmic amplification}
{algorithmic amplification}(08){curated feeds}
{research}(06){self-awareness}
{self-awareness}(08){self-compassion}
{self-compassion}(08){resilience}
{resilience}(07){confidence}
{peer pressure}(06){social media use}
{peer pressure}(07){online relationships}
{perfectionism}(08){curated feeds}
{perfectionism}(07){confidence}
{imposter syndrome}(08){insecurity}
{imposter syndrome}(07){research}
{vulnerability}(08){authenticity}
{vulnerability}(07){support}
`.trim();
  const [inputText, setInputText] = useState(example);

  useEffect(() => {
    onLoadExample(example);
  }, [example, onLoadExample]);
  
  const handleParseClick = () => {
    onParse(inputText);
  };
  
  const handleLoadExample = () => {
    setInputText(example);
    onLoadExample(example);
  };
  
  return (
    <div className="input-panel">
      <textarea
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder="Enter relationships in format: {Idea A}(weight){Idea B}
Example: {envy}(09){social comparison}"
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
