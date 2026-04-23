
const PATTERN = {
    'username' : "^[A-Za-zÀ-Ỹà-ỹ]+(?:\\s[A-Za-zÀ-Ỹà-ỹ]+)*$",
    'phone' : "^(0[3\\|5\\|7\\|8\\|9])[0-9]{8,10}$",
    'email' : "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9]+(?:\\.[a-zA-Z0-9\\-]+)*\\.[a-zA-Z]{2,}$",
    'password' : '^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*?])[a-zA-Z0-9!@#$%^&*?]{8,20}$',
    'confirmPassword' : null,
}

export default PATTERN;