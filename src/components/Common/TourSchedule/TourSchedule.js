import React from 'react';
import Accordion from 'react-bootstrap/Accordion';
import "./TourSchedule.scss";

function TourSchedule(props) {
    const {schedules} = props;


    return (
        <Accordion alwaysOpen>
        {schedules.map((schedule, index) => (
            <Accordion.Item eventKey={index.toString()} key={index}>
                <Accordion.Header><strong>Ngày {index + 1}: {schedule.tour_route}</strong></Accordion.Header>
                <Accordion.Body>
                    {schedule.detail}
                </Accordion.Body>
            </Accordion.Item>
        ))}
        </Accordion>
    );
}



export default TourSchedule;