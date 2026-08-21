// ---- plugin:feishu_multitable_crud_agg_analysis_1 ----
// ============================================================
// 插件 feishu_multitable_crud_agg_analysis_1 (员工配置) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAggAnalysisOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '技能标签': string[];
      '角色标签': string[];
      '效率标签': string;
      '日均标准处理量': number;
      '班次权限': string[];
      '员工UID': string;
      '员工状态': string;
      '能力等级标签': string[];
      '欠工时天数': number;
      '是否单独排班': boolean;
      '产能等级': string;
      '所属部门': string;
      '入职时间': number;
      '富余工时天数': number;
      '产能系数': number;
      '员工姓名': string;
      '是否参与排班': boolean;
      '班次偏好': string[];
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_1').call<FeishuMultitableCrudAggAnalysisOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAggAnalysisOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '员工姓名': string;
      '入职时间': number;
      '是否参与排班': boolean;
      '效率标签': string;
      '日均标准处理量': number;
      '是否单独排班': boolean;
      '产能等级': string;
      '产能系数': number;
      '技能标签': string[];
      '员工状态': string;
      '角色标签': string[];
      '班次偏好': string[];
      '欠工时天数': number;
      '富余工时天数': number;
      '员工UID': string;
      '所属部门': string;
      '能力等级标签': string[];
      '班次权限': string[];
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_1').call<FeishuMultitableCrudAggAnalysisOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAggAnalysisOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_1').call<FeishuMultitableCrudAggAnalysisOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuMultitableCrudAggAnalysisOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuMultitableCrudAggAnalysisOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_1').call<FeishuMultitableCrudAggAnalysisOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"所属部门":"示例文本","角色标签":["示例文本"],"产能系数":0,"班次偏好":["示例文本"],"日均标准处理量":0,"欠工时天数":0,"是否单独排班":null,"班次权限":["示例文本"],"员工姓名":null,"员工状态":"示例文本","能力等级标签":["示例文本"],"产能等级":"示例文本","员工UID":{"text":"示例文本"},"技能标签":["示例文本"],"入职时间":0,"是否参与排班":null,"效率标签":"示例文本","富余工时天数":0}}
 */
export interface FeishuMultitableCrudAggAnalysisOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '所属部门': string;
    '角色标签': string[];
    '产能系数': number;
    '班次偏好': string[];
    '日均标准处理量': number;
    '欠工时天数': number;
    '是否单独排班': unknown;
    '班次权限': string[];
    '员工姓名': unknown;
    '员工状态': string;
    '能力等级标签': string[];
    '产能等级': string;
    '员工UID': {
      text: string;
    };
    '技能标签': string[];
    '入职时间': number;
    '是否参与排班': unknown;
    '效率标签': string;
    '富余工时天数': number;
  };
}

export interface FeishuMultitableCrudAggAnalysisOneSearchrecordsInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_1').call<FeishuMultitableCrudAggAnalysisOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"id":"示例文本","record":{"入职时间":0,"能力等级标签":[],"日均标准处理量":0,"员工姓名":null,"角色标签":[],"班次偏好":[],"班次权限":[],"是否单独排班":null,"欠工时天数":0,"富余工时天数":0,"员工UID":{},"技能标签":[],"员工状态":"示例文本","是否参与排班":null,"效率标签":"示例文本","所属部门":"示例文本","产能等级":"示例文本","产能系数":0}}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuMultitableCrudAggAnalysisOneSearchrecordsOutput {
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '入职时间': number;
      '能力等级标签': string[];
      '日均标准处理量': number;
      '员工姓名': unknown;
      '角色标签': string[];
      '班次偏好': string[];
      '班次权限': string[];
      '是否单独排班': unknown;
      '欠工时天数': number;
      '富余工时天数': number;
      '员工UID': {
        text: string;
      };
      '技能标签': string[];
      '员工状态': string;
      '是否参与排班': unknown;
      '效率标签': string;
      '所属部门': string;
      '产能等级': string;
      '产能系数': number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}
// ---- end:feishu_multitable_crud_agg_analysis_1 ----

// ---- plugin:feishu_multitable_crud_agg_analysis_2 ----
// ============================================================
// 插件 feishu_multitable_crud_agg_analysis_2 (排班结果) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAggAnalysisTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '结束时间': string;
      '排班来源': string;
      '是否人工调整': boolean;
      '例外说明': string;
      '日期': number;
      '开始时间': string;
      '岗位': string;
      '是否夜班': boolean;
      '是否锁定': boolean;
      '命中规则': string;
      '排班记录编号': string;
      '部门': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_2').call<FeishuMultitableCrudAggAnalysisTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAggAnalysisTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '日期': number;
      '部门': string;
      '岗位': string;
      '开始时间': string;
      '是否锁定': boolean;
      '命中规则': string;
      '例外说明': string;
      '排班记录编号': string;
      '结束时间': string;
      '是否夜班': boolean;
      '排班来源': string;
      '是否人工调整': boolean;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_2').call<FeishuMultitableCrudAggAnalysisTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAggAnalysisTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_2').call<FeishuMultitableCrudAggAnalysisTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuMultitableCrudAggAnalysisTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuMultitableCrudAggAnalysisTwoSearchrecordsInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_2').call<FeishuMultitableCrudAggAnalysisTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"record":{"开始时间":null,"结束时间":null,"是否夜班":null,"命中规则":null,"例外说明":null,"排班记录编号":{},"部门":"示例文本","岗位":"示例文本","是否人工调整":null,"日期":0,"排班来源":"示例文本","是否锁定":null},"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisTwoSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '开始时间': unknown;
      '结束时间': unknown;
      '是否夜班': unknown;
      '命中规则': unknown;
      '例外说明': unknown;
      '排班记录编号': {
        text: string;
      };
      '部门': string;
      '岗位': string;
      '是否人工调整': unknown;
      '日期': number;
      '排班来源': string;
      '是否锁定': unknown;
    };
    id: string;
  }[];
}
// ---- end:feishu_multitable_crud_agg_analysis_2 ----

// ---- plugin:shift_config_feishu_multitable_crud_agg_analysis_3 ----
// ============================================================
// 插件 shift_config_feishu_multitable_crud_agg_analysis_3 (班次配置) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '所需岗位': string[];
      '是否夜班': boolean;
      '是否通宵班': boolean;
      '是否需要主管': boolean;
      '任务名称': string;
      '班次代码': string;
      '班次名称': string;
      '标准工时': number;
      '所需最少人数': number;
      '是否启用': boolean;
      '班次编号': string;
      '结束时间': string;
      '说明': string;
      '班次优先级': string;
      '适用部门': string[];
      '开始时间': string;
      '所需最多人数': number;
      '所需技能': string[];
      '是否需要新老搭配': boolean;
      '班次类型': string;
      '是否跨日': boolean;
    };
  }[];
}

/**
 * capabilityClient.load('shift_config_feishu_multitable_crud_agg_analysis_3').call<ShiftConfigFeishuMultitableCrudAggAnalysisThreeBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '是否夜班': boolean;
      '班次优先级': string;
      '开始时间': string;
      '是否跨日': boolean;
      '标准工时': number;
      '是否需要新老搭配': boolean;
      '任务名称': string;
      '班次代码': string;
      '班次名称': string;
      '所需最少人数': number;
      '是否启用': boolean;
      '说明': string;
      '是否通宵班': boolean;
      '是否需要主管': boolean;
      '班次类型': string;
      '所需最多人数': number;
      '所需技能': string[];
      '所需岗位': string[];
      '班次编号': string;
      '适用部门': string[];
      '结束时间': string;
    };
  }[];
}

/**
 * capabilityClient.load('shift_config_feishu_multitable_crud_agg_analysis_3').call<ShiftConfigFeishuMultitableCrudAggAnalysisThreeBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('shift_config_feishu_multitable_crud_agg_analysis_3').call<ShiftConfigFeishuMultitableCrudAggAnalysisThreeDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('shift_config_feishu_multitable_crud_agg_analysis_3').call<ShiftConfigFeishuMultitableCrudAggAnalysisThreeGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"所需技能":["示例文本"],"是否需要新老搭配":null,"任务名称":null,"开始时间":null,"所需岗位":["示例文本"],"结束时间":null,"标准工时":0,"是否夜班":null,"班次代码":null,"是否启用":null,"说明":null,"是否跨日":null,"班次优先级":null,"适用部门":["示例文本"],"班次类型":"示例文本","所需最少人数":0,"所需最多人数":0,"是否通宵班":null,"是否需要主管":null,"班次编号":{"text":"示例文本"},"班次名称":null}}
 */
export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '所需技能': string[];
    '是否需要新老搭配': unknown;
    '任务名称': unknown;
    '开始时间': unknown;
    '所需岗位': string[];
    '结束时间': unknown;
    '标准工时': number;
    '是否夜班': unknown;
    '班次代码': unknown;
    '是否启用': unknown;
    '说明': unknown;
    '是否跨日': unknown;
    '班次优先级': unknown;
    '适用部门': string[];
    '班次类型': string;
    '所需最少人数': number;
    '所需最多人数': number;
    '是否通宵班': unknown;
    '是否需要主管': unknown;
    '班次编号': {
      text: string;
    };
    '班次名称': unknown;
  };
}

export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
    conjunction: string;
  };
}

/**
 * capabilityClient.load('shift_config_feishu_multitable_crud_agg_analysis_3').call<ShiftConfigFeishuMultitableCrudAggAnalysisThreeSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"开始时间":null,"结束时间":null,"班次类型":"示例文本","标准工时":0,"所需最多人数":0,"所需技能":[],"是否启用":null,"说明":null,"班次名称":null,"适用部门":[],"班次优先级":null,"所需最少人数":0,"是否夜班":null,"是否需要新老搭配":null,"任务名称":null,"班次代码":null,"班次编号":{},"是否跨日":null,"所需岗位":[],"是否通宵班":null,"是否需要主管":null}}]}
 */
export interface ShiftConfigFeishuMultitableCrudAggAnalysisThreeSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '开始时间': unknown;
      '结束时间': unknown;
      '班次类型': string;
      '标准工时': number;
      '所需最多人数': number;
      '所需技能': string[];
      '是否启用': unknown;
      '说明': unknown;
      '班次名称': unknown;
      '适用部门': string[];
      '班次优先级': unknown;
      '所需最少人数': number;
      '是否夜班': unknown;
      '是否需要新老搭配': unknown;
      '任务名称': unknown;
      '班次代码': unknown;
      '班次编号': {
        text: string;
      };
      '是否跨日': unknown;
      '所需岗位': string[];
      '是否通宵班': unknown;
      '是否需要主管': unknown;
    };
  }[];
}
// ---- end:shift_config_feishu_multitable_crud_agg_analysis_3 ----

// ---- plugin:feishu_multitable_crud_agg_analysis_6 ----
// ============================================================
// 插件 feishu_multitable_crud_agg_analysis_6 (排班冲突) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAggAnalysisSixBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '部门': string;
      '冲突类型': string;
      '冲突说明': string;
      '建议处理': string;
      '处理状态': string;
      '冲突编号': string;
      '日期': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_6').call<FeishuMultitableCrudAggAnalysisSixBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisSixBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAggAnalysisSixBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    record: {
      '冲突编号': string;
      '日期': number;
      '部门': string;
      '冲突类型': string;
      '冲突说明': string;
      '建议处理': string;
      '处理状态': string;
    };
    id: string;
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_6').call<FeishuMultitableCrudAggAnalysisSixBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAggAnalysisSixBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAggAnalysisSixDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_6').call<FeishuMultitableCrudAggAnalysisSixDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuMultitableCrudAggAnalysisSixDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuMultitableCrudAggAnalysisSixGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_6').call<FeishuMultitableCrudAggAnalysisSixGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"冲突类型":"示例文本","冲突说明":null,"建议处理":null,"处理状态":"示例文本","冲突编号":{"text":"示例文本"},"日期":0,"部门":"示例文本"}}
 */
export interface FeishuMultitableCrudAggAnalysisSixGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '冲突类型': string;
    '冲突说明': unknown;
    '建议处理': unknown;
    '处理状态': string;
    '冲突编号': {
      text: string;
    };
    '日期': number;
    '部门': string;
  };
}

export interface FeishuMultitableCrudAggAnalysisSixSearchrecordsInput {
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('feishu_multitable_crud_agg_analysis_6').call<FeishuMultitableCrudAggAnalysisSixSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"冲突类型":"示例文本","冲突说明":null,"建议处理":null,"处理状态":"示例文本","冲突编号":{},"日期":0,"部门":"示例文本"}}]}
 */
export interface FeishuMultitableCrudAggAnalysisSixSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '冲突类型': string;
      '冲突说明': unknown;
      '建议处理': unknown;
      '处理状态': string;
      '冲突编号': {
        text: string;
      };
      '日期': number;
      '部门': string;
    };
  }[];
}
// ---- end:feishu_multitable_crud_agg_analysis_6 ----