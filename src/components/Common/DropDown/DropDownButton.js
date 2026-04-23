import Dropdown from 'react-bootstrap/Dropdown';
import React, { useState } from 'react';
import "./DropDownButton.scss"

function DropDownButton(props) {
  const {onChange} = props;
  const {title , dropitem} = props;

  const [selectedItem, setSelectedItem] = useState(title);

  const handleSelect = (name, key) => {
      setSelectedItem(name);
      if (onChange) {
          onChange(key);
      }
  }

  return (
    <Dropdown className='dropdown-btn'>
      <Dropdown.Toggle  id="dropdown-basic" >
        {selectedItem}
      </Dropdown.Toggle>

      <Dropdown.Menu className="scrollable-menu">
        {dropitem.map((item, index) => (
          <Dropdown.Item onClick={() => handleSelect(item.name, item.key)} key={index} href={item.link}>
            {item.name} 
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default DropDownButton;