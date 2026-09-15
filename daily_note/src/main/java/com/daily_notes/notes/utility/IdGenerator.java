package com.daily_notes.notes.utility;

import cn.hutool.core.util.IdUtil;

public class IdGenerator {

    public static String generateId() {
        return IdUtil.getSnowflakeNextIdStr();
    }
}