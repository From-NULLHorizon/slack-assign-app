import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import SlideCounterDatastore from "../datastores/slide_counter_datastore.ts";

/*
 * 関数はビジネスロジックのみに集中し、チャンネルへの通知は行わない。
 * したがって、関連する環境変数(CHANNEL_ID)は取得しない。
 * チャンネルへの通知は、ワークフローで行う。
 */

// 関数の定義
export const AssignFunction = DefineFunction({
  callback_id: "assign_function",
  title: "役割担当者スライド割り当て",
  description: "役割と担当者をスライド式に割り当てて、結果を返します。",
  source_file: "functions/assign_function.ts",
  input_parameters: {
    properties: {},
    required: [],
  },
  output_parameters: {
    properties: {
      result_text: {
        type: Schema.types.string,
        title: "割り当て結果",
        description: "整形された割り当て結果のテキストです。",
      },
    },
    required: ["result_text"],
  },
});

// 関数のロジック
export default SlackFunction(
  AssignFunction,
  async ({ client, env }) => {
    try {
      // 環境変数から設定値を取得
      const membersStr = env["MEMBERS"] || "";
      const rolesStr = env["ROLES"] || "";
      const isDebugMode = env["SLACK_DEBUG"] === "true";

      if (isDebugMode) {
        console.log("🔧 デバッグモード有効");
        console.log("環境変数:", { membersStr, rolesStr });
      }

      // 入力値の検証
      if (!membersStr || !rolesStr) {
        const errorMessage = "環境変数が不足しています。MEMBERS, ROLESを設定してください。";
        console.error(errorMessage);
        return {
          outputs: {
            result_text: errorMessage
          }
        };
      }

      // 文字列から配列に変換
      const members = membersStr.split(',').map(m => m.trim()).filter(m => m.length > 0);
      const roles = rolesStr.split(',').map(r => r.trim()).filter(r => r.length > 0);

      if (isDebugMode) {
        console.log("変換後のデータ:", { members, roles });
      }

      if (members.length === 0 || roles.length === 0) {
        const errorMessage = "担当者リストまたは役割リストが空です。";
        console.error(errorMessage);
        return {
          outputs: {
            result_text: errorMessage
          }
        };
      }

      // 固定のカウンターID
      const COUNTER_ID = "slide_counter";

      // 現在の構成情報
      const currentMembersCount = members.length;
      const currentRolesCount = roles.length;

      let currentOffset = 0;
      let shouldReset = false;

      try {
        // 既存のカウンター情報を取得
        const getResponse = await client.apps.datastore.get({
          datastore: SlideCounterDatastore.name,
          id: COUNTER_ID,
        });

        if (getResponse.ok && getResponse.item) {
          const currentData = getResponse.item;
          console.log("取得したデータ:", currentData);

          // 構成変更チェック：担当者数または役割数が変更されたかを確認
          const previousMembersCount = Number(currentData.members_count || 0);
          const previousRolesCount = Number(currentData.roles_count || 0);

          if (previousMembersCount !== currentMembersCount || 
              previousRolesCount !== currentRolesCount) {
            console.log(`構成変更を検出 - 担当者数: ${previousMembersCount} -> ${currentMembersCount}, 役割数: ${previousRolesCount} -> ${currentRolesCount}`);
            shouldReset = true;
            currentOffset = 0; // リセット時は0から開始
          } else {
            // 構成変更なし、通常のスライド処理
            const previousOffset = Number(currentData.current_offset || 0);
            currentOffset = (previousOffset + 1) % currentMembersCount; // 担当者数でモジュロ演算
          }
          console.log("計算後のオフセット:", { currentOffset, shouldReset });
        } else {
          // 初回実行の場合
          console.log("初回実行 - カウンターを初期化します");
          currentOffset = 0; // 初回は0から開始
          shouldReset = false;
        }
      } catch (error) {
        console.log("カウンター取得エラー（初回実行の可能性）:", error);
        currentOffset = 0; // 初回は0から開始
        shouldReset = false;
      }

      // カウンター情報を更新
      try {
        // まず既存のレコードを削除
        try {
          await client.apps.datastore.delete({
            datastore: SlideCounterDatastore.name,
            id: COUNTER_ID,
          });
          console.log("既存レコードを削除しました");
        } catch (deleteError) {
          console.log("削除対象のレコードが存在しません（初回実行）");
        }

        // 新しいレコードを作成
        await client.apps.datastore.put({
          datastore: SlideCounterDatastore.name,
          item: {
            counter_id: COUNTER_ID,
            current_offset: currentOffset,
            members_count: currentMembersCount,
            roles_count: currentRolesCount,
            last_updated: new Date().toISOString(),
          },
        });

        const resetMessage = shouldReset ? " (構成変更によりリセット)" : "";
        console.log(`カウンター更新完了 - スライドオフセット: ${currentOffset}, 担当者数: ${currentMembersCount}, 役割数: ${currentRolesCount}${resetMessage}`);
      } catch (error) {
        console.error("カウンター更新エラー:", error);
        console.error("エラーの詳細:", JSON.stringify(error, null, 2));
        // カウンター更新に失敗してもスライド処理は継続
      }

      // 役割と担当者をスライド式に割り当て
      const assignments: { [key: string]: string } = {};

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const memberIndex = (i + currentOffset) % members.length;
        const assignedMember = members[memberIndex];

        assignments[role] = assignedMember;

        if (isDebugMode) {
          console.log(`${role} -> ${assignedMember} (役割インデックス: ${i} + オフセット: ${currentOffset} = 担当者インデックス: ${memberIndex})`);
        }
      }

      // 結果をテキストに整形
      const today = new Date();
      const resetInfo = shouldReset ? " 🔄構成変更によりリセット" : "";
      let resultText = `本日（${today.toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })}）の役割担当者割り当て結果です🎉\n${resetInfo}\n\n`;

      // 役割順で結果を表示
      for (const role of roles) {
        const assignedMember = assignments[role];
        if (assignedMember) {
          // Slack User IDの場合は@メンション形式に変換
          const formattedMember = assignedMember.startsWith('U') ? `<@${assignedMember}>` : assignedMember;
          resultText += `*${role}*: ${formattedMember}\n`;
        } else {
          resultText += `*${role}*: 割り当てなし\n`;
        }
      }

      console.log("現在のオフセット:", currentOffset);
      console.log("関数実行成功 - 結果:", resultText);

      return {
        outputs: {
          result_text: resultText
        }
      };

    } catch (error) {
      console.error("関数実行中にエラーが発生:", error);

      const errorMessage = `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`;

      return {
        outputs: {
          result_text: errorMessage
        }
      };
    }
  },
);
