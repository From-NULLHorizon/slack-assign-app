import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/*
 * スライド式割り当ての実行カウンターを管理するデータストア
 */
const SlideCounterDatastore = DefineDatastore({
  name: "SlideCounter",
  primary_key: "counter_id",
  attributes: {
    counter_id: {
      type: Schema.types.string,
      description: "カウンターID（固定値: 'slide_counter'）",
    },
    current_offset: {
      type: Schema.types.integer,
      description: "現在のスライドオフセット（0から担当者数-1で循環）",
    },
    members_count: {
      type: Schema.types.integer,
      description: "前回実行時の担当者数",
    },
    roles_count: {
      type: Schema.types.integer,
      description: "前回実行時の役割数",
    },
    last_updated: {
      type: Schema.types.string,
      description: "最終更新日時",
    },
  },
});

export default SlideCounterDatastore;
