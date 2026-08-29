import type {
  Board,
  BoardStatus,
} from "../../types/board";

const TERMINAL_BOARD_STATUSES:
  ReadonlySet<BoardStatus> =
  new Set([
    "requested",
    "awaiting_activation_payment",
    "rejected",
    "cancelled",
    "expired",
    "archived",
  ]);

function parseTime(
  value: string,
): number | null {
  const parsed =
    new Date(
      value,
    ).getTime();

  return Number.isNaN(
    parsed,
  )
    ? null
    : parsed;
}

export function getEffectiveBoardStatus(
  board: Board,
  nowMs = Date.now(),
): BoardStatus {
  if (
    TERMINAL_BOARD_STATUSES.has(
      board.status,
    )
  ) {
    return board.status;
  }

  const entryStartsAt =
    parseTime(
      board.entryStartsAt,
    );

  const entryClosesAt =
    parseTime(
      board.entryClosesAt,
    );

  const endsAt =
    parseTime(
      board.endsAt,
    );

  if (
    entryStartsAt === null ||
    entryClosesAt === null ||
    endsAt === null
  ) {
    return board.status;
  }

  if (
    nowMs >=
    endsAt
  ) {
    return "expired";
  }

  if (
    nowMs >=
    entryClosesAt
  ) {
    return "active";
  }

  if (
    nowMs >=
    entryStartsAt
  ) {
    return "entry_open";
  }

  return "approved";
}

export function withEffectiveBoardStatus(
  board: Board,
  nowMs = Date.now(),
): Board {
  const status =
    getEffectiveBoardStatus(
      board,
      nowMs,
    );

  if (
    status ===
    board.status
  ) {
    return board;
  }

  return {
    ...board,
    status,
  };
}
