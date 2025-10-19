import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import AssignWorkflow from "../workflows/assign_workflow.ts";

// 環境変数を自動読み込み
import "@std/dotenv/load";

/*
 * 手動実行用トリガー(Local環境用)
 * assign_workflowを手動で実行するためのショートカットトリガー
 * Local環境では.envファイルから設定値を取得し、役割と担当者をスライド式に割り当てる。
 */
const assignManualTrigger: Trigger<typeof AssignWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "役割担当者割り当て手動実行",
  description: "役割と担当者をスライド式に割り当てるワークフローを手動実行",
  workflow: `#/workflows/${AssignWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: Deno.env.get("CHANNEL_ID")!
    },
  },
};

export default assignManualTrigger;
