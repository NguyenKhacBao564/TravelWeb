import { useState, useCallback } from 'react';
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

export const useScheduleManager = (values, setValues) => {
  const [activeField, setActiveField] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Setup sensors for desktop and mobile drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  // Toggle the schedule form and reset editing state
  const handleActiveField = () => {
    console.log("values active: ", values);
    setActiveField(!activeField);
    setEditingSchedule(null);
  };

  // Handle drag end event for reordering schedules
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = values.itinerary.findIndex((item) => item.schedule_id === active.id);
    const newIndex = values.itinerary.findIndex((item) => item.schedule_id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const updatedList = arrayMove(values.itinerary, oldIndex, newIndex);
      
      // Renumber day_number for all items
      const newScheduleList = updatedList.map((item, index) => ({
        ...item,
        day_number: index + 1,
      }));
      
      setValues({...values, itinerary: newScheduleList});
    }
  };

  // Add a new schedule
  const addSchedule = useCallback((schedule) => {
    const newSchedule = {
      schedule_id: uuidv4().replace(/-/g, '').slice(0, 10),
      day_number: values.itinerary.length + 1,
      tour_route: schedule.tour_route,
      detail: schedule.detail,
    };
    
    setValues((prev) => ({
      ...prev,
      itinerary: [...prev.itinerary, newSchedule],
    }));
    
    setActiveField(false);
  }, [values.itinerary.length, setValues]);

  // Delete a schedule by ID
  const deleteSchedule = useCallback((id) => {
    const updatedList = values.itinerary
      .filter((schedule) => schedule.schedule_id !== id)
      .map((schedule, index) => ({ 
        ...schedule, 
        day_number: index + 1 
      }));
      
    setValues({...values, itinerary: updatedList});
  }, [values, setValues]);

  // Set a schedule for editing
  const onEditSchedule = useCallback((schedule) => {
    setEditingSchedule(schedule);
    setActiveField(true);
  }, []);

  // Confirm edits to a schedule
  const confirmEditSchedule = useCallback((schedule) => {
    setValues((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((item) =>
        item.schedule_id === schedule.schedule_id 
          ? { ...schedule, day_number: item.day_number } 
          : item
      ),
    }));
    
    setActiveField(false);
    setEditingSchedule(null);
  }, [setValues]);

  return {
    activeField,
    setActiveField,
    editingSchedule,
    setEditingSchedule,
    sensors,
    handleActiveField,
    handleDragEnd,
    addSchedule,
    deleteSchedule,
    onEditSchedule,
    confirmEditSchedule
  };
}; 