import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { CiCirclePlus } from "react-icons/ci";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Schedule from './Schedule';
import AddShedule from './AddShedule';

const TourScheduleManager = ({
  activeField,
  handleActiveField,
  values,
  sensors,
  handleDragEnd,
  deleteSchedule,
  onEditSchedule,
  setActiveField,
  confirmEditSchedule,
  addSchedule,
  editingSchedule
}) => {

  // values.itinerary.map(schedule => console.log("shedule day number: ", schedule.day_number));
  return (
    <Container fluid className="schedule-section">
      <Row>
        <Col md={9}>
          <h3>Lịch trình</h3>
        </Col>
        <Col md={3} className="d-flex justify-content-end">
          <Button 
            variant="dark" 
            className="d-flex align-items-center gap-2" 
            onClick={handleActiveField}
            disabled={values.duration === 0 || values.itinerary.length === values.duration}
          >
            <CiCirclePlus size={24}/>
            Thêm lịch trình 
          </Button>
        </Col>
      </Row>
      <Row className="mt-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
          >
            <SortableContext
              items={values.itinerary.map((schedule) => schedule.schedule_id)}
              strategy={verticalListSortingStrategy}
            >
              {values.itinerary.length > 0 ? (
                values.itinerary.map((schedule) => (
                  <Schedule 
                    key={schedule.schedule_id} 
                    schedule={schedule} 
                    onDeleteSchedule={deleteSchedule} 
                    onEditSchedule={onEditSchedule} 
                  />
                ))
              ) : (
                <div className="text-center p-3 mt-3 bg-light">
                  <p className="mb-0">Chưa có lịch trình nào được thêm vào</p>
                </div>
              )}
            </SortableContext>
          </DndContext>
          {activeField && (
            <AddShedule 
              setActiveField={setActiveField} 
              confirmEditSchedule={confirmEditSchedule} 
              addSchedule={addSchedule}  
              schedule={editingSchedule || { day_number: values.itinerary.length + 1, tour_route: '', description: '' }}
            />
          )}
      </Row>
    </Container>
  );
};

export default TourScheduleManager; 