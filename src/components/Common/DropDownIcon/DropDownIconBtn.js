import React, {useState, useEffect} from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import './DropDownIconBtn.scss';
import Dropdown from 'react-bootstrap/Dropdown';

function DropDownIconBtn(props) {
    const {optionList, label, value, onChange, icon, name, required = false} = props;

    const [selectedItem, setSelectedItem] = useState(value || '');
    
    // Update internal state when prop value changes
    useEffect(() => {
        if (value !== undefined) {
            setSelectedItem(value);
        }
    }, [value]);

    const handleSelect = (eventKey) => {
        setSelectedItem(eventKey);
        if (onChange) {
            // Create a synthetic event object similar to native form events
            const syntheticEvent = {
                target: {
                    name: name,
                    value: eventKey
                }
            };
            onChange(syntheticEvent);
        }
    };
    
    const Icon = icon;
    
    return (  
        <Dropdown className='drop-down-icon-btn' required={required}>
            <Form.Label className="drop-down-icon-btn--label">{label}</Form.Label>
            <InputGroup>
                <Dropdown.Toggle id="dropdown-basic" className='drop-down-icon-btn--toggle'>
                    <span className="icon-text-wrapper">
                        <Icon size={20} className="icon-custom "/>
                        <span className="dropdown-text">{selectedItem}</span>
                    </span>
                </Dropdown.Toggle>
            </InputGroup>
            <Dropdown.Menu>
                {optionList.map((item, index) => (
                <Dropdown.Item onClick={() => handleSelect(item.value)} key={index}>
                    {item.value} 
                </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
}

export default DropDownIconBtn;