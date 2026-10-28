---
name: sql-review
description: Reviews SQL for safety, performance, clarity, and STAS compliance; proposes pragmatic, token-efficient fixes.
---

# SQL Review

Apply to any SQL directly or indirectly: queries, migrations, repositories, query builders, ORM SQL, views, SPs, triggers, indexes, and performance work.

Correctness and intent come first. For each finding: name it, explain the risk, propose a concrete fix, and state tradeoffs when the alternative is not universally better. Ask about intent only when unclear. Never let a veto pass silently.

## Binary vetoes

Fail-closed unless the documented exception applies.

- `SELECT *` / `alias.*`: veto in production objects. Require explicit columns. Allowed only in ad-hoc debugging or throwaway exploration.
- `COUNT(*)`: veto. Require `COUNT(campo)` unless the T2 exception applies.
- `LIKE '%x%'` / leading wildcard on large tables: veto unless part of a documented, bounded searcher.
- Global `##temp`: veto. Use local `#temp` with guarded `DROP` or a table variable.
- Physical `DELETE`: veto. Require logical status/deleted column.
- Versioned names (`_v2`, `_old`, `_bak`): veto unless prior versions are removed and justified.
- `UPDATE` / `DELETE` without restrictive `WHERE` or outside transaction: veto.

## COUNT(*) exception (T2)

`COUNT(*)` allowed only if all hold:

1. Engine-optimized or semantically required, ideally over filtered PK with supporting index.
2. Inline intent documented: `-- COUNT(*) intencional: ...` plus ticket/date when available.
3. Existence checks use `EXISTS`; hot paths use cached counters; analytics may use approximate counts.

Legacy `COUNT(*)`: flag, do not silently approve. Rewrite only when its file is touched and intent is revalidated.

## Patterns to flag

- `SELECT 1` in `EXISTS`; prefer `SELECT <PK>`.
- Existence checks via counts.
- Unbounded reads.
- N+1 queries.
- Implicit or unclear joins.
- Duplicated subqueries.
- Non-sargable predicates (functions on indexed columns).
- Missing indexes for filter/join/order columns.
- Expensive `ORDER BY`.
- Pagination without deterministic ordering.
- Unnecessary `DISTINCT`.
- Inefficient ORM/query-builder SQL.
- Dead commented SQL.

## Query rules

- Prefer explicit column lists: avoids over-fetching, clarifies contracts, prevents exposure of new columns.
- Use `EXISTS` for existence checks; prefer `SELECT <PK>` over `SELECT 1`.
- Remove commented-out executable SQL unless it has reason, date, author, or ticket.
- Guard temp tables before creation; drop inside the same `BEGIN/END` block.
- Prefer table variables for small, short-lived sets.

## Stored procedures

Use this base for SQL Server SPs:

```sql
USE [DB]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[spu_nombre]
AS
BEGIN
    SET XACT_ABORT ON;

    BEGIN TRY
        -- BEGIN TRAN only for writes; COMMIT here.
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
        THROW;
    END CATCH
END
GO

GRANT VIEW DEFINITION ON dbo.spu_nombre TO ROL_STAS_VIEW;
GO
GRANT EXECUTE ON dbo.spu_nombre TO PUBLIC;
GO
```

- Replace `spu_nombre` everywhere.
- `USE [DB]` must name the explicit target database; never assume `CLINIWIN`.
- Multi-clínica: repeat script per clinic DB, each with its own `USE [DB]` + `GO`.
- Preserve `CREATE OR ALTER`, `XACT_ABORT`, and correct `TRY/CATCH` rollback.
- Apply all vetoes and review rules to queries inside the SP.
- Do not reassign permissions on modify.

## Standards

- Objects: `<abreviacion>_<modulo>_<descriptivo>` with `spu_` / `fn_` / `tr_` / `vi_`.
- Tables: `MAYUSCULAS` with `_`; columns with 3-letter prefix, one per line, explicit type/null/default.
- Include unique/autoincremental ID key.
- Add `MS_Description` extended property per column.
- Ask whether tables require audit; audit tables mirror source fields + `AUD_TIPO`.
- Use `CREATE OR ALTER`; append `MODIFICADO POR / FECHA / OBSERVACIÓN` newest-last.
- Reserved words in full uppercase.
- Close scripts with `GO` and appropriate grants.
- Run locking/table-affecting changes off-hours; no Friday production passes.

## Searchers

Leading wildcards allowed only if:

- Search block is documented inline (start/end).
- Variable validated: `LEN(@var) >= 2` after stripping blanks/`%`/`_`.
- Applies to regular, temp, and system tables.
- Performance doubt: test in non-production with DBA.

## Manual DML

Requires email + authorization, explicit `USE [DB]`, transaction, restrictive `WHERE`, and execution only from versioned files.

Cursors require JP-endorsed justification and explicit authorization.

## Checklist

Reject load if any fails:

- `USE [DB]` + `GO` present and correct.
- `CREATE OR ALTER`, header, modification history.
- Naming and column standards met.
- No open veto (A1-A7) without documented exception.
- Searchers bounded and documented.
- Writes wrapped in `TRY/CATCH` + rollback + `WHERE`.
- Temp tables guarded and dropped in-block.
- Keywords uppercase, no dead comments.
- `GO` + grants present.
- Extended properties + audit decision defined.
