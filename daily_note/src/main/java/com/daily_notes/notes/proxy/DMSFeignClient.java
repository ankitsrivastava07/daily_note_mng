package com.daily_notes.notes.proxy;

import com.daily_notes.notes.records.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "dms-service", url = "${dms-service-url}")
public interface DMSFeignClient {

    String DMS_BASE_PATH = "/api/v1/{referenceId}/dms";

    @GetMapping(DMS_BASE_PATH)
    ResponseEntity<ApiResponse> getAllDocumentsByShortNoteId(@PathVariable String referenceId);
}
