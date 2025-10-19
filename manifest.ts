import { Manifest } from "deno-slack-sdk/mod.ts";
import AssignWorkflow from "./workflows/assign_workflow.ts";
import { AssignFunction } from "./functions/assign_function.ts";
import SlideCounterDatastore from "./datastores/slide_counter_datastore.ts";

/*
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "assign-app",
  description: "担当者と役割をスライド式に割り当てるワークフロー",
  icon: "assets/default_new_app_icon.png",
  workflows: [AssignWorkflow],
  functions: [AssignFunction],
  outgoingDomains: [],
  datastores: [SlideCounterDatastore],
  /*
   * 環境変数(env)の設定を記述することがSlack SDKで推奨されている。
   * 推奨設定を行った場合、Slackアプリの管理画面上(GUI)から環境変数の設定が可能になる。
   * しかし、今回はCLIから"slack env"コマンドで環境変数を設定するため、ここでは定義しない。"
   */
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "datastore:read",
    "datastore:write",
    "channels:read",
    "groups:read",
  ],
});
