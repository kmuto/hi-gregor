/*
  Hi, Gregor
  Slack Socket connector
  Copyright 2023 Kenshi Muto

  Usage: node dist/streamlistener.js
  You need to register App to Slack and get/set valid Signing Secret, Bot User OAuth Token, and App-Level Token
*/
import pkg from '@slack/bolt';
const { App } = pkg;
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

function getStatus(): [string, number] {
  const stdout = execSync('npm run status'); // TODO: needs better
  const data = JSON.parse(stdout.toString());
  return [data['phase'], Number(data['battery'])];
}

function isIgnoreIDs(id: string): boolean {
  if (process.env.IGNORE_IDS === undefined) return false;
  return process.env.IGNORE_IDS.split(' ').includes(id);
}

const label = (phase: string) => {
  switch(phase) {
    case 'run': return '掃除してます!';
    case 'hmUsrDock': return 'ドックに戻りちゅうです!';
    case 'charge': return '充電中です。';
    case 'stop': return 'なぜか停止中です…?';
    case 'stuck': return '助けを求めています!!';
    default: return `${phase} (未定義)です`;
  }
};

app.message(/ザムザ|状態|じょうたい|ざむざ|ステータス|status|samsa/, async ({ message, say }) => {
  console.log(`きた ${message}`);
  if (!message.subtype && isIgnoreIDs(message.user)) return;
  const data = getStatus();
  say(`ザムザは${label(data[0])} (バッテリ残量${data[1]}%)`);
});

app.message(/掃除|開始|はじめ|かいし|スタート|clean|start|go/, async ({ message, say }) => {
  if (!message.subtype && isIgnoreIDs(message.user)) return;
  const stdout = execSync('npm run start');
  const data = getStatus();
  say(`ザムザ、掃除を始めます! (バッテリ残量${data[1]}%)`);
});

app.message(/戻れ|終わり|もどれ|おわり|おしまい|エンド|back|end|dock/, async ({ message, say }) => {
  if (!message.subtype && isIgnoreIDs(message.user)) return;
  const stdout = execSync('npm run dock');
  const data = getStatus();
  say(`ザムザ、ドックに戻ります! (バッテリ残量${data[1]}%)`);
});

(async () => {
  await app.start();
})();