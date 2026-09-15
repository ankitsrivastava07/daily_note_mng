package com.daily_notes.notes.records;

import java.util.List;

public record CreateNoteDtoRecord(String title,
                                  String priority,
                                  String statusId,
                                  String projectIdBandId,
                                  String visibilityId,
                                  String assigneeOwnerId,
                                  String location,
                                  String version,
                                  String createdAt,
                                  String dueDateTime,
                                  String estTime,
                                  String remainderAlterId,
                                  String repeatNoteAutomaticallyId,
                                  String categoryId,
                                  String keyTakeAwaysHighLights,
                                  String description,
                                  List<String> checkList,
                                  List<String> tags,
                                  String referenceURL,
                                  String userId,
                                  String subCategoryId) {
}
