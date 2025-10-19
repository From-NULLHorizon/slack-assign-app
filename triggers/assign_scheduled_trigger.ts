import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import AssignWorkflow from "../workflows/assign_workflow.ts";

// 環境変数を自動読み込み
import "@std/dotenv/load";

/*
 * スケジュール実行用トリガー(本番環境用)
 * assign_workflowを日本時間で平日7:00に自動実行するためのスケジュールトリガー
 * 環境変数から設定値を取得し、役割と担当者をスライド式に割り当てる。
 */
const assignScheduledTrigger: Trigger<typeof AssignWorkflow.definition> = {
  type: TriggerTypes.Scheduled,
  name: "役割担当者割り当て自動実行",
  description: "役割と担当者をスライド式に割り当てるワークフローを日本時間の平日7:00に自動実行",
  workflow: `#/workflows/${AssignWorkflow.definition.callback_id}`,
  schedule: {
    // 平日7:00(JST) - 2025年9月29日から開始
    start_time: "2025-09-29T07:00:00",
    timezone: "Asia/Tokyo",
    frequency: {
      type: "weekly",
      repeats_every: 1,
      on_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }
  },
  inputs: {
    channel_id: {
      value: Deno.env.get("CHANNEL_ID")!
    },
  },
};

export default assignScheduledTrigger;
