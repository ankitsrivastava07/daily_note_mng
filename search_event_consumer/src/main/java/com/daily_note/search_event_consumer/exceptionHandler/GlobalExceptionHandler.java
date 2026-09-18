package com.daily_note.search_event_consumer.exceptionHandler;

import com.daily_note.search_event_consumer.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    private Logger logger = LoggerFactory.getLogger("");

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception exp) {
        logger.info("Exception has occurred {}", exp.getLocalizedMessage());
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setMsg(exp.getLocalizedMessage());
        apiResponse.setFlag(Boolean.FALSE);
        return new ResponseEntity<>(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

}
