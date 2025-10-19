import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { AssignFunction } from "../functions/assign_function.ts";

/*
 * 役割担当者スライド割り当てワークフロー
 * 平日7:00(JST)に自動実行され、役割と担当者をスライド式に割り当てる。
 */
/*
 * Slack公式が推奨するワークフロー内での環境変数の参照およびチャンネルへの通知の方法
 * https://api.slack.com/automation/workflows#using_environment_variables_in_workflows
 */
const AssignWorkflow = DefineWorkflow({
  callback_id: "assign_workflow",
  title: "役割担当者スライド割り当てワークフロー",
  description: "役割と担当者をスライド式に割り当てて、指定されたチャンネルに通知します。",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "通知先のチャンネルID",
      },
    },
    required: ["channel_id"],
  },
});

// ステップ1：役割担当者割り当て関数を実行
const assignmentStep = AssignWorkflow.addStep(AssignFunction, {});

// ステップ2：結果をチャンネルに通知
AssignWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: AssignWorkflow.inputs.channel_id,
  message: assignmentStep.outputs.result_text,
});

export default AssignWorkflow;
