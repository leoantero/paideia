/** Shapes returned by the gamification RPCs in supabase/migrations/0008–0009. */

export interface StudentProgress {
  coins: number;
  total_points: number;
  weekly_points: number;
  streak: number;
  streak_best: number;
  active_today: boolean;
  streak_freezes: number;
  max_streak_freezes: number;
  streak_freeze_cost: number;
  daily_goal_minutes: number;
  study_seconds_today: number;
  daily_goal_reached: boolean;
  due_today: number;
  new_available: number;
}

export interface LeaderboardEntry {
  position: number;
  name: string;
  weekly_points: number;
  /** Positions gained (+) or lost (−) since the end of yesterday; null when there's nothing to compare. */
  delta: number | null;
  is_me: boolean;
}

export interface Leaderboard {
  classroom: { name: string; school: string } | null;
  week_start?: string;
  member_count: number;
  entries: LeaderboardEntry[];
}
