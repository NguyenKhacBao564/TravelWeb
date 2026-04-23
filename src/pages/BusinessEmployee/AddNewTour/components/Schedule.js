import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { GiHamburgerMenu } from "react-icons/gi";
import { AiFillEdit } from "react-icons/ai";
import { RiDeleteBin2Fill } from "react-icons/ri";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./Schedule.scss";

function Schedule(props) {

    const {schedule, onDeleteSchedule, onEditSchedule} = props;

    const { attributes, listeners, setNodeRef, transition, transform, isDragging } = useSortable({ 
      id: schedule.schedule_id,
      // Prevent auto-scrolling during drag
      resizeObserverConfig: { disabled: true }
    });

    // Chỉ áp dụng transform nếu tồn tại
    const style = {
      transition,
      transform: transform ? CSS.Transform.toString(transform) : null,
      opacity: isDragging ? 0.8 : 1, // Hiệu ứng khi kéo
      zIndex: isDragging ? 1000 : 1, // Higher z-index when dragging
    };

    return ( 
       <div
      className={`schedule mt-3 ${isDragging ? 'dragging' : ''}`}
      ref={setNodeRef}
      {...attributes}
      style={style}
    >
      <GiHamburgerMenu 
        size={30} 
        className="schedule-icon" 
        {...listeners} 
        onMouseDown={(e) => {
          // Prevent text selection during drag
          e.preventDefault();
          // Call original listeners
          if (listeners.onMouseDown) listeners.onMouseDown(e);
        }}
      />
      <Container className="schedule-content">
        <p className="day">Ngày {schedule.day_number}</p>
        <p className="schedule-content-name">{schedule.tour_route}</p>
        <Button variant="light" className="bg-white">
          <AiFillEdit size={30} color="#F49B33" onClick= {() => onEditSchedule(schedule)}/>
        </Button>
        <Button variant="danger" className="bg-white" onClick={() => onDeleteSchedule(schedule.schedule_id)}>
          <RiDeleteBin2Fill size={30} color="#EB5757" />
        </Button>
      </Container>
    </div>
    );
}

export default Schedule;