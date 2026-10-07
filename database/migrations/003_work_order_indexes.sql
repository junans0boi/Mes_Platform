-- 003_work_order_indexes.sql
-- WorkOrder 목록 index 대응표 (database design §4.2 전체 구현)
-- 재적용 안전: IF NOT EXISTS 사용

-- ① sort=plannedStartAt (기본 -plannedStartAt), plannedFrom·plannedTo 범위 필터
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'IX_WorkOrder_PlantId_PlannedStartAt_WorkOrderId')
    CREATE INDEX IX_WorkOrder_PlantId_PlannedStartAt_WorkOrderId
        ON dbo.WorkOrder (PlantId, PlannedStartAt DESC, WorkOrderId DESC);
GO

-- ② sort=workOrderNumber, workOrderNumberPrefix 접두 일치
--    UNIQUE (PlantId, WorkOrderNumber) — clustered key WorkOrderId가 암묵 포함
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'UQ_WorkOrder_PlantId_WorkOrderNumber')
    CREATE UNIQUE INDEX UQ_WorkOrder_PlantId_WorkOrderNumber
        ON dbo.WorkOrder (PlantId, WorkOrderNumber);
GO

-- ③ sort=status
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'IX_WorkOrder_PlantId_Status_WorkOrderId')
    CREATE INDEX IX_WorkOrder_PlantId_Status_WorkOrderId
        ON dbo.WorkOrder (PlantId, Status, WorkOrderId);
GO

-- ④ status 필터 + 기본 정렬(plannedStartAt)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'IX_WorkOrder_PlantId_Status_PlannedStartAt_WorkOrderId')
    CREATE INDEX IX_WorkOrder_PlantId_Status_PlannedStartAt_WorkOrderId
        ON dbo.WorkOrder (PlantId, Status, PlannedStartAt DESC, WorkOrderId DESC);
GO

-- ⑤ sort=priority
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'IX_WorkOrder_PlantId_Priority_WorkOrderId')
    CREATE INDEX IX_WorkOrder_PlantId_Priority_WorkOrderId
        ON dbo.WorkOrder (PlantId, Priority, WorkOrderId);
GO

-- ⑥ lineId 필터
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'IX_WorkOrder_PlantId_LineId_PlannedStartAt_WorkOrderId')
    CREATE INDEX IX_WorkOrder_PlantId_LineId_PlannedStartAt_WorkOrderId
        ON dbo.WorkOrder (PlantId, LineId, PlannedStartAt DESC, WorkOrderId DESC);
GO

-- ⑦ productModelId 필터
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrder') AND name = N'IX_WorkOrder_PlantId_ProductModelId_PlannedStartAt_WorkOrderId')
    CREATE INDEX IX_WorkOrder_PlantId_ProductModelId_PlannedStartAt_WorkOrderId
        ON dbo.WorkOrder (PlantId, ProductModelId, PlannedStartAt DESC, WorkOrderId DESC);
GO

-- WorkOrderStatusHistory 조회용 index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.WorkOrderStatusHistory') AND name = N'IX_WorkOrderStatusHistory_WorkOrderId_ChangedAt')
    CREATE INDEX IX_WorkOrderStatusHistory_WorkOrderId_ChangedAt
        ON dbo.WorkOrderStatusHistory (WorkOrderId, ChangedAt DESC);
GO
