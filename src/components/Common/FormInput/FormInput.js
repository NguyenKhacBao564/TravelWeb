import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./FormInput.module.scss"; // Import CSS Module
import validator from "../../../feature/validator";
import  PATTERN  from '../../../utils/pattern';

function FormInput(props) {
    const { label, errorMessage, onChange, id, type, value, ...inputProps } = props;
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // Hiển thị/ẩn mật khẩu
    const [isValid, setIsValid] = useState(true);


    const handleFocus = (e) => {
        setFocused(true);
        checkValid(e);
    };
    const checkValid = (e) => {
        console.log(isValid)
        console.log(e.target.value)
        console.log("value confirm", inputProps.valueconfirm)
        if (inputProps.name === "confirmPassword" ) {
            if (inputProps.valueconfirm !== e.target.value || e.target.value === "") {
                setIsValid(false);
                e.target.setCustomValidity("Mật khẩu không khớp!");
            } else {
                setIsValid(true);
                e.target.setCustomValidity("");
            }
        }else{
            setIsValid(validator(e.target.value, inputProps.name));
        }
    }
    const hasErrorNotify = Object.keys(errorMessage).length > 1; // Kiểm tra có thông báo lỗi hay không
    const [errorType, setErrorType] = useState(Object.keys(errorMessage).length > 1 ? "Default" : "");
    
    const checkTypeError = (e) => {
        if (errorType !== "") {
            setErrorType(e.target.value === "" ? "Default" : "Constraint");
        }
    };

    return (
        <div className={styles.inputDiv}>
            <label htmlFor={id}>{label}</label>
            <div className={styles.inputWrapper}>
                <input
                    {...inputProps}
                    id={id}
                    value={value}
                    pattern={inputProps.usepattern? PATTERN[inputProps.name]:null}
                    type={type === "password" ? (showPassword ? "text" : "password") : type}
                    onChange={(e) => {
                        checkValid(e);
                        onChange(e);
                        checkTypeError(e);
                    }}
                    // onFocus={(e) => inputProps.name === "confirmPassword" && setFocused(true)}
                    onBlur={(e) => handleFocus(e)}
                    focused={focused.toString()}
                    isvalid = {isValid.toString()}
                />
                {type === "password" && (
                    <span className={styles.icon} onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                )}
            </div>
            {hasErrorNotify && !isValid && focused && (
                <div className={styles.errorField}>
                    <p className={styles.errorText}>{errorMessage[errorType]}</p>
                </div>
            )}
        </div>
    );
}

export default FormInput;