/**
 * form_updater.gs
 * Google Apps Script — フォームドロップダウン自動管理
 *
 * 【使い方】
 * 1. Google スプレッドシート（フォーム回答が集まるシート）を開く
 * 2. 拡張機能 → Apps Script → このファイルの内容を全貼り付け → 保存
 * 3. setupTrigger() を手動実行（初回のみ）→ フォーム送信トリガーが登録される
 * 4. スプレッドシートに「フォーム管理」メニューが追加される
 *
 * 【ワークフロー】
 * - フォームに回答が来る → onFormSubmit が自動実行
 *   → 作品名がドロップダウンから消える
 *   → 「入力済み」シートに記録される
 *
 * - ローカルで import_form_responses.js を実行 → pending_for_form.txt が更新される
 * - git commit & push 後、スプレッドシートの「フォーム管理 → GitHubから同期」
 *   → ドロップダウンが最新の未入力リストに置き換わる
 *
 * - 再編集したいタイトル：「入力済み」シートの「再フォーム追加」列に「y」を入力
 *   → 「フォーム管理 → 入力済みから再追加」を実行
 *   → ドロップダウンに戻る
 */

// ===== 設定（実行前に確認・変更する） =====

const CONFIG = {
  // フォームの「作品名」質問のタイトル（完全一致）
  questionTitle: '作品名',

  // 入力済みタイトルを記録するシート名
  doneSheetName: '入力済み',

  // GitHub raw URL（nave23s/ouchi-de-cinema の main ブランチ）
  pendingFileUrl: 'https://raw.githubusercontent.com/nave23s/ouchi-de-cinema/main/pending_for_form.txt',
};

// ===== スプレッドシート開時にカスタムメニューを追加 =====

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('フォーム管理')
    .addItem('GitHub から同期（ドロップダウンを更新）', 'syncFromGitHub')
    .addSeparator()
    .addItem('入力済みから再追加（再編集用）', 'reAddToForm')
    .addSeparator()
    .addItem('初回セットアップ（トリガー登録）', 'setupTrigger')
    .addToUi();
}

// ===== フォーム送信時に自動実行（onFormSubmit トリガー） =====

function onFormSubmit(e) {
  const itemResponses = e.response.getItemResponses();

  // 「作品名」質問の回答を探す
  let submittedTitle = null;
  for (const ir of itemResponses) {
    if (ir.getItem().getTitle() === CONFIG.questionTitle) {
      submittedTitle = ir.getResponse();
      break;
    }
  }

  if (!submittedTitle) {
    Logger.log('onFormSubmit: 作品名が見つかりませんでした');
    return;
  }

  Logger.log('送信されたタイトル: ' + submittedTitle);

  // ドロップダウンから削除
  const removed = removeFromDropdown_(submittedTitle);

  // 入力済みシートに記録
  if (removed) {
    logToDoneSheet_(submittedTitle);
  }
}

// ===== GitHub から同期（手動実行） =====
// import_form_responses.js 実行後、push してから実行する。
// pending_for_form.txt の内容でドロップダウンを丸ごと入れ替える。

function syncFromGitHub() {
  const ui = SpreadsheetApp.getUi();

  let text;
  try {
    const res = UrlFetchApp.fetch(CONFIG.pendingFileUrl + '?t=' + Date.now(), {
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      ui.alert(
        'エラー',
        'GitHub から取得できませんでした (HTTP ' + res.getResponseCode() + ')\n' +
        'push が完了しているか確認してください。',
        ui.ButtonSet.OK
      );
      return;
    }
    text = res.getContentText('UTF-8');
  } catch (err) {
    ui.alert('エラー', '通信エラー: ' + err.message, ui.ButtonSet.OK);
    return;
  }

  const titles = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (titles.length === 0) {
    ui.alert('同期完了', '未入力の作品が0件です。フォームは変更しませんでした。', ui.ButtonSet.OK);
    return;
  }

  // ドロップダウンを上書き
  const listItem = getListItem_();
  if (!listItem) {
    ui.alert('エラー', '「' + CONFIG.questionTitle + '」というリスト質問がフォームに見つかりません。', ui.ButtonSet.OK);
    return;
  }

  const choices = titles.map(t => listItem.createChoice(t));
  listItem.setChoices(choices);

  ui.alert(
    '同期完了',
    'ドロップダウンを更新しました。\n未入力: ' + titles.length + '件',
    ui.ButtonSet.OK
  );
  Logger.log('syncFromGitHub: ' + titles.length + '件を設定');
}

// ===== 入力済みから再追加（手動実行） =====
// 「入力済み」シートの「再フォーム追加」列に「y」を入力してから実行する。
// → 対象タイトルがドロップダウンに戻り、列が「追加済み」に変わる。

function reAddToForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.doneSheetName);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('「' + CONFIG.doneSheetName + '」シートがありません。');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const listItem = getListItem_();
  if (!listItem) return;

  const currentChoices = listItem.getChoices().map(c => c.getValue());
  const toAdd = [];

  // 1行目はヘッダーなので i=1 から
  for (let i = 1; i < data.length; i++) {
    const rawTitle = (data[i][1] || '').toString().trim();  // B列: フォーム表示タイトル
    const flag    = (data[i][3] || '').toString().trim().toLowerCase();  // D列: 再フォーム追加

    if (flag === 'y' && rawTitle && !currentChoices.includes(rawTitle)) {
      toAdd.push({ title: rawTitle, rowIndex: i + 1 });
    }
  }

  if (toAdd.length === 0) {
    SpreadsheetApp.getUi().alert(
      '対象なし',
      '「再フォーム追加」列が「y」の行がありません。\nB列のタイトルを確認し、D列に「y」を入力してください。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const newChoices = [
    ...listItem.getChoices(),
    ...toAdd.map(item => listItem.createChoice(item.title)),
  ];
  listItem.setChoices(newChoices);

  // D列を「追加済み」に更新
  for (const item of toAdd) {
    sheet.getRange(item.rowIndex, 4).setValue('追加済み');
  }

  SpreadsheetApp.getUi().alert(
    '再追加完了',
    toAdd.map(i => '✓ ' + i.title).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ===== 初回セットアップ（手動実行） =====

function setupTrigger() {
  const form = getForm_();
  if (!form) return;

  // 既存の onFormSubmit トリガーを削除してから再登録
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onFormSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  SpreadsheetApp.getUi().alert(
    'セットアップ完了',
    'onFormSubmit トリガーを登録しました。\n' +
    'フォームに回答が来ると自動的にドロップダウンから削除されます。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ===== 内部ヘルパー =====

function getForm_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const url = ss.getFormUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert('エラー: このスプレッドシートにフォームが紐付いていません。');
    return null;
  }
  return FormApp.openByUrl(url);
}

function getListItem_() {
  const form = getForm_();
  if (!form) return null;

  const items = form.getItems(FormApp.ItemType.LIST);
  const found = items.find(item => item.getTitle() === CONFIG.questionTitle);
  if (!found) {
    Logger.log('リスト質問「' + CONFIG.questionTitle + '」が見つかりません');
    return null;
  }
  return found.asListItem();
}

function removeFromDropdown_(title) {
  const listItem = getListItem_();
  if (!listItem) return false;

  const before = listItem.getChoices();
  const after = before.filter(c => c.getValue() !== title);

  if (after.length === before.length) {
    Logger.log('削除対象なし（既に消えているか、選択肢に存在しない）: ' + title);
    return false;
  }

  // 選択肢が0になるとエラーになるためダミーを入れる
  listItem.setChoices(
    after.length > 0 ? after : [listItem.createChoice('（入力待ちの作品なし）')]
  );
  Logger.log('削除済み: ' + title);
  return true;
}

function logToDoneSheet_(rawTitle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.doneSheetName);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.doneSheetName);
    sheet.appendRow(['入力日時', '作品名（フォーム表示）', 'タイトル（クリーン）', '再フォーム追加']);
    sheet.getRange('1:1').setFontWeight('bold');
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 220);
    sheet.setColumnWidth(4, 120);
  }

  const cleanTitle = rawTitle.replace(/\s*[（(]n=\d+[）)]\s*$/, '').trim();
  sheet.appendRow([new Date(), rawTitle, cleanTitle, '']);
}
