-- 001_common_schema.sql
-- 공통 기준 테이블: Plant, Line, ProductModel
-- 재적용 안전: IF NOT EXISTS 사용

-- ============================================================
-- Plant
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.Plant'))
BEGIN
    CREATE TABLE dbo.Plant (
        PlantId     int           NOT NULL,
        PlantCode   nvarchar(32)  NOT NULL,
        PlantName   nvarchar(100) NOT NULL,
        CreatedAt   datetime2     NOT NULL CONSTRAINT DF_Plant_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt   datetime2     NULL,
        CONSTRAINT PK_Plant PRIMARY KEY (PlantId)
    );
END;
GO

-- ============================================================
-- Line
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.Line'))
BEGIN
    CREATE TABLE dbo.Line (
        LineId      int           NOT NULL IDENTITY(1, 1),
        PlantId     int           NOT NULL,
        LineCode    nvarchar(32)  NOT NULL,
        LineName    nvarchar(100) NOT NULL,
        CreatedAt   datetime2     NOT NULL CONSTRAINT DF_Line_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Line PRIMARY KEY (LineId),
        CONSTRAINT FK_Line_Plant FOREIGN KEY (PlantId) REFERENCES dbo.Plant (PlantId)
    );
END;
GO

-- ============================================================
-- ProductModel
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.ProductModel'))
BEGIN
    CREATE TABLE dbo.ProductModel (
        ProductModelId   bigint        NOT NULL IDENTITY(1, 1),
        ProductModelCode nvarchar(64)  NOT NULL,
        ProductModelName nvarchar(200) NOT NULL,
        CreatedAt        datetime2     NOT NULL CONSTRAINT DF_ProductModel_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ProductModel PRIMARY KEY (ProductModelId)
    );
END;
GO
