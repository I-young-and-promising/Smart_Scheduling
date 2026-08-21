import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { scheduleEntry } from "@server/database/schema";
import type { ScheduleCell, ShiftCode } from "@shared/api.interface";
import dayjs from "dayjs";
import {
  buildCellKey,
  scheduleCellToEntry,
  type ScheduleResultRepository,
} from "./schedule-result.repository";

interface ScheduleEntryRow {
  id: string;
  scheduleDate: string;
  employeeId: string;
  shiftCode: string;
  source: string;
  taskId: string | null;
  workLoadTags: string[];
}

@Injectable()
export class ScheduleResultDrizzleRepository
  implements ScheduleResultRepository
{
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findByDateRange(
    first: string,
    last: string,
    options?: { source?: string; department?: string },
  ): Promise<ScheduleCell[]> {
    const conditions = [
      gte(scheduleEntry.scheduleDate, first),
      lte(scheduleEntry.scheduleDate, last),
    ];
    if (options?.source) {
      conditions.push(eq(scheduleEntry.source, options.source));
    }
    if (options?.department) {
      conditions.push(eq(scheduleEntry.department, options.department));
    }
    const rows: ScheduleEntryRow[] = await this.db
      .select({
        id: scheduleEntry.id,
        scheduleDate: scheduleEntry.scheduleDate,
        employeeId: scheduleEntry.employeeId,
        shiftCode: scheduleEntry.shiftCode,
        source: scheduleEntry.source,
        taskId: scheduleEntry.taskId,
        workLoadTags: scheduleEntry.workLoadTags,
      })
      .from(scheduleEntry)
      .where(and(...conditions));

    return rows.map((row: ScheduleEntryRow): ScheduleCell => ({
      employeeId: row.employeeId,
      employeeName: "",
      employeeNo: "",
      date: row.scheduleDate,
      shiftCode: row.shiftCode as ShiftCode,
      taskId: row.taskId,
      workLoadTags: row.workLoadTags,
    }));
  }

  async replaceMonth(
    month: string,
    cells: ScheduleCell[],
    department: string,
  ): Promise<number> {
    const first: string = `${month}-01`;
    const last: string = `${month}-${String(dayjs(`${month}-01`).daysInMonth()).padStart(2, "0")}`;

    await this.db.transaction(async (tx) => {
      await tx
        .delete(scheduleEntry)
        .where(
          and(
            gte(scheduleEntry.scheduleDate, first),
            lte(scheduleEntry.scheduleDate, last),
            eq(scheduleEntry.department, department),
          ),
        );
      if (cells.length > 0) {
        const source: string = cells[0]?.source ?? "generated";
        await tx
          .insert(scheduleEntry)
          .values(
            cells.map((cell: ScheduleCell) =>
              scheduleCellToEntry(cell, source, department),
            ),
          )
          .onConflictDoUpdate({
            target: [scheduleEntry.scheduleDate, scheduleEntry.employeeId],
            set: {
              shiftCode: scheduleEntry.shiftCode,
              source,
              taskId: scheduleEntry.taskId,
              workLoadTags: scheduleEntry.workLoadTags,
            },
          });
      }
    });
    return cells.length;
  }

  async upsertCell(
    cell: ScheduleCell,
    source: string,
    department: string,
  ): Promise<void> {
    await this.db
      .insert(scheduleEntry)
      .values(scheduleCellToEntry(cell, source, department))
      .onConflictDoUpdate({
        target: [scheduleEntry.scheduleDate, scheduleEntry.employeeId],
        set: {
          shiftCode: cell.shiftCode,
          source,
          taskId: cell.taskId,
          workLoadTags: cell.workLoadTags,
          department,
        },
      });
  }

  async batchUpsert(
    cells: ScheduleCell[],
    source: string,
    department: string,
  ): Promise<void> {
    if (cells.length === 0) return;
    await this.db
      .insert(scheduleEntry)
      .values(
        cells.map((cell: ScheduleCell) =>
          scheduleCellToEntry(cell, source, department),
        ),
      )
      .onConflictDoUpdate({
        target: [scheduleEntry.scheduleDate, scheduleEntry.employeeId],
        set: {
          shiftCode: scheduleEntry.shiftCode,
          source,
          taskId: scheduleEntry.taskId,
          workLoadTags: scheduleEntry.workLoadTags,
          department,
        },
      });
  }

  async deleteByDateRange(
    first: string,
    last: string,
    options?: { source?: string; department?: string },
  ): Promise<number> {
    const conditions = [
      gte(scheduleEntry.scheduleDate, first),
      lte(scheduleEntry.scheduleDate, last),
    ];
    if (options?.source) {
      conditions.push(eq(scheduleEntry.source, options.source));
    }
    if (options?.department) {
      conditions.push(eq(scheduleEntry.department, options.department));
    }
    const result = await this.db
      .delete(scheduleEntry)
      .where(and(...conditions))
      .returning({ id: scheduleEntry.id });
    return result.length;
  }

  async countImported(
    first: string,
    last: string,
    department?: string,
  ): Promise<number> {
    const conditions = [
      gte(scheduleEntry.scheduleDate, first),
      lte(scheduleEntry.scheduleDate, last),
      eq(scheduleEntry.source, "imported"),
    ];
    if (department) {
      conditions.push(eq(scheduleEntry.department, department));
    }
    const rows = await this.db
      .select({ id: scheduleEntry.id })
      .from(scheduleEntry)
      .where(and(...conditions));
    return rows.length;
  }

  async importHistory(
    month: string,
    cells: ScheduleCell[],
    department: string,
  ): Promise<number> {
    const first: string = `${month}-01`;
    const last: string = `${month}-${String(dayjs(`${month}-01`).daysInMonth()).padStart(2, "0")}`;

    await this.db.transaction(async (tx) => {
      await tx
        .delete(scheduleEntry)
        .where(
          and(
            gte(scheduleEntry.scheduleDate, first),
            lte(scheduleEntry.scheduleDate, last),
            eq(scheduleEntry.source, "imported"),
            eq(scheduleEntry.department, department),
          ),
        );
      if (cells.length > 0) {
        await tx
          .insert(scheduleEntry)
          .values(
            cells.map((cell: ScheduleCell) =>
              scheduleCellToEntry(cell, "imported", department),
            ),
          )
          .onConflictDoUpdate({
            target: [scheduleEntry.scheduleDate, scheduleEntry.employeeId],
            set: {
              shiftCode: scheduleEntry.shiftCode,
              source: scheduleEntry.source,
              department,
            },
          });
      }
    });
    return cells.length;
  }
}
