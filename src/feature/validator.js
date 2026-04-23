
import  PATTERN  from '../utils/pattern';


function validator(value, typeInput){
    const regex = new RegExp(PATTERN[typeInput]);
    return regex.test(value);
}
export default validator;