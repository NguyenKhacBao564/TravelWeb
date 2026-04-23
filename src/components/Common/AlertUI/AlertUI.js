import React from 'react';
import Alert from 'react-bootstrap/Alert';

function AlertUI(props) {

    const {variant , text , show} = props;
    return (
        <>
            <Alert key={variant} variant={variant} transition={true} show={show}>{text}</Alert>
        </>
    );
}

export default AlertUI;