import { v4 as uuidv4 } from 'uuid';


const generateId = () => {
    return uuidv4().replace(/-/g, '').slice(0, 10);
}

export default generateId;



