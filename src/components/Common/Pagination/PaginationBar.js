import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { Pagination } from 'react-bootstrap';
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import './PaginationBar.scss';

function PaginationBar({currentPage, totalPages, handlePageChange}) {


    return (
        <Pagination className='pagination-container d-flex justify-content-end'>
           <Button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
        >
        <SlArrowLeft size={15}/> Previous
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "primary" : "outline-primary"}
            onClick={() => handlePageChange(page)}
            className={currentPage === page ? "pagiationItem mx-1" : "pagiationItem__inactive mx-1"}
          >
            {page}
          </Button>
        ))}
        <Button
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Next <SlArrowRight />
        </Button>
        </Pagination>
    );
}

export default PaginationBar;