import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';

function AddShedule(props) {
    const {setActiveField, addSchedule,  confirmEditSchedule ,schedule } = props;

    const [error, setError] = useState('');
    const [valueForm, setValueForm] = useState(schedule);
    
    // Cập nhật form khi schedule thay đổi (chỉnh sửa)
    useEffect(() => {
      setValueForm({
        schedule_id: schedule.schedule_id || '',
        day_number: schedule.day_number,
        tour_route: schedule.tour_route || '',
        detail: schedule.detail || '',
      });
    }, [schedule]);

    const handleChange = (e) => {
      setValueForm({...valueForm, [e.target.name]: e.target.value});
      setError(''); // Xóa lỗi khi người dùng nhập
    }


    const handleSubmit = () => {
        // Basic validation
        if (!valueForm.tour_route.trim() || !valueForm.detail.trim()) {
            setError('Vui lòng nhập đầy đủ tên lịch trình và mô tả');
            return;
        }

       // Chuẩn bị dữ liệu lịch trình
        const scheduleData = {
          ...valueForm,
          tour_route: valueForm.tour_route.trim(),
          detail: valueForm.detail.trim(),
        };

        // Thêm hoặc chỉnh sửa lịch trình
        if (valueForm.schedule_id) {
          confirmEditSchedule(scheduleData);
        } else {
          addSchedule(scheduleData);
        }
        // Reset form và đóng modal
        setValueForm({ schedule_id: '', day_number: schedule.day_number + 1, tour_route: '', detail: '' });
        setActiveField(false);
    }
    
    return (
        <Container className="add-schedule-area" >
        <Form.Group className="flex-center flex-column">
          <h1 >Lịch trình ngày {valueForm.day_number}</h1>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="w-100">
            <Form.Label htmlFor='inputDestination'>Tên lịch trình<span className="text-danger">*</span></Form.Label>
            <Form.Control 
                name="tour_route" 
                type="text" 
                onChange={handleChange}  
                id="inputDestination" 
                placeholder="Nhập tên điểm tham quan"
                value={valueForm.tour_route}
            />
          </Form.Group>
          <Form.Group className="w-100 mt-3">
            <Form.Label htmlFor='inputDescription'>Mô tả lịch trình<span className="text-danger">*</span></Form.Label>
            <Form.Control 
                name="detail" 
                id="inputDescription" 
                as="textarea" 
                rows={6} 
                onChange={handleChange} 
                placeholder="Nhập mô tả lịch trình"
                value={valueForm.detail}
            />
          </Form.Group>
          <Form.Group className="w-100 mt-3 d-flex justify-content-end gap-3">
            <Button variant="secondary" className="px-4 py-2" onClick={() => setActiveField(false)}>Hủy</Button>
            <Button variant="primary" className="px-5 py-2" onClick={handleSubmit}>{valueForm.id ? 'Cập nhật' : 'Thêm'}</Button>
          </Form.Group>
        </Form.Group>
      </Container>
    );
}

export default AddShedule;