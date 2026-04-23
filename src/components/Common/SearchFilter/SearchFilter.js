import { Form, InputGroup } from "react-bootstrap";
import { CiSearch } from "react-icons/ci";
import { useState, useEffect } from "react";



const SearchFilter = ({ onSearch, placeholder, initialValue = ''}) => {

  const [searchValue, setSearchValue] = useState(initialValue);

  // Đồng bộ initialValue với state
  useEffect(() => {
    setSearchValue(initialValue);
  }, [initialValue]);

  // Đồng bộ initialValue với state
  useEffect(() => {
    setSearchValue(initialValue);
  }, [initialValue]);

  // Xử lý thay đổi input
  const handleChange = (e) => {
    setSearchValue(e.target.value);
  };

  // Xử lý click vào icon tìm kiếm
  const handleSearchClick = () => {
    onSearch(searchValue.trim());
  };

  return (
    <InputGroup >
      <Form.Control
        type="text"
        placeholder={placeholder}
        onChange={handleChange}
        value={searchValue}
        className="search-type-light p-2"
      />
      <InputGroup.Text style={{cursor: "pointer"}}>
        <CiSearch onClick={handleSearchClick}/>
      </InputGroup.Text>
    </InputGroup>
  );
};

export default SearchFilter;
