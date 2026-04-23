import React, { use, useContext, useEffect } from 'react';
import ManagerLayout from '../../layouts/SystemManager/ManagerLayout';
import { AuthContext } from '../../context/AuthContext';

function ConsultantEmployee(props) {
    const { user } = useContext(AuthContext);
    console.log("User in Consultant_Business: ", user);
    useEffect(() => {
        console.log("reload ", user);
    }
        , [user]);
    return (
        <ManagerLayout />
    );
}

export default ConsultantEmployee;