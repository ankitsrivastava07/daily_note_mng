package com.daily_notes.notes.dto;

public class CreateWorkspaceNodeDto {
    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    // ROOT for top-level items,
    // otherwise folder id
    private String parentId;
    private String name;
    // FOLDER or FILE
    private String type;
    // only used for FILE
    private String content;
}