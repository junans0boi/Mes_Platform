-- 002_work_order.sql
-- WorkOrder, WorkOrderStatusHistory
-- 재적용 안전: IF NOT EXISTS 사용
-- WorkOrder.Status는 nvarchar; CHECK 제약 없음(BE-06 전이 규칙은 Application 계층이 적용)

-- ============================================================
-- WorkOrder
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.WorkOrder'))
BEGIN
    CREATE TABLE dbo.WorkOrder (
        -- 식별자
        WorkOrderId             bigint        NOT NULL IDENTITY(1, 1),
        PlantId                 int           NOT NULL,
        WorkOrderNumber         nvarchar(64)  NOT NULL,

        -- 계획·참조
        LineId                  int           NULL,
        ProductModelId          bigint        NULL,
        Priority                int           NULL,
        PlannedQuantity         bigint        NOT NULL,
        PlannedStartAt          datetime2     NULL,
        PlannedEndAt            datetime2     NULL,

        -- 상태·수량 (Status: CHECK 없음, 허용 값은 Application 계층이 적용)
        Status                  nvarchar(32)  NOT NULL,
        CompletedQuantity       bigint        NOT NULL CONSTRAINT DF_WorkOrder_CompletedQuantity DEFAULT 0,
        GoodQuantity            bigint        NOT NULL CONSTRAINT DF_WorkOrder_GoodQuantity      DEFAULT 0,
        DefectQuantity          bigint        NOT NULL CONSTRAINT DF_WorkOrder_DefectQuantity    DEFAULT 0,

        -- 실적
        ActualStartAt           datetime2     NULL,
        ActualEndAt             datetime2     NULL,

        -- 상세 필드
        ProductionOrderNumber   nvarchar(64)  NULL,
        ProductionLotNumber     nvarchar(64)  NULL,
        Remark                  nvarchar(1000) NULL,
        AssignedTo              nvarchar(100) NULL,

        -- 감사
        CreatedAt               datetime2     NOT NULL CONSTRAINT DF_WorkOrder_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy               nvarchar(100) NULL,
        UpdatedAt               datetime2     NULL,

        -- 낙관적 동시성 (Base64로 직렬화하여 API에서 expectedVersion으로 사용)
        RowVersion              rowversion    NOT NULL,

        CONSTRAINT PK_WorkOrder PRIMARY KEY (WorkOrderId),
        CONSTRAINT FK_WorkOrder_Plant        FOREIGN KEY (PlantId)        REFERENCES dbo.Plant (PlantId),
        CONSTRAINT FK_WorkOrder_Line         FOREIGN KEY (LineId)         REFERENCES dbo.Line (LineId),
        CONSTRAINT FK_WorkOrder_ProductModel FOREIGN KEY (ProductModelId) REFERENCES dbo.ProductModel (ProductModelId)
    );
END;
GO

-- ============================================================
-- WorkOrderStatusHistory
-- BE-06: 모든 상태 전이를 기록한다
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.WorkOrderStatusHistory'))
BEGIN
    CREATE TABLE dbo.WorkOrderStatusHistory (
        WorkOrderStatusHistoryId bigint           NOT NULL IDENTITY(1, 1),
        WorkOrderId              bigint           NOT NULL,
        PlantId                  int              NOT NULL,
        PreviousStatus           nvarchar(32)     NOT NULL,
        NewStatus                nvarchar(32)     NOT NULL,
        Reason                   nvarchar(1000)   NULL,
        OperationId              uniqueidentifier NULL,
        ChangedBy                nvarchar(100)    NOT NULL,
        ChangedAt                datetime2        NOT NULL CONSTRAINT DF_WorkOrderStatusHistory_ChangedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_WorkOrderStatusHistory PRIMARY KEY (WorkOrderStatusHistoryId),
        CONSTRAINT FK_WorkOrderStatusHistory_WorkOrder FOREIGN KEY (WorkOrderId) REFERENCES dbo.WorkOrder (WorkOrderId)
    );
END;
GO
