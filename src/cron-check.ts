/*
  Hi, Gregor
  Check battery status and send Slack
  Copyright 2023 Kenshi Muto

  Usage: node dist/cron-check.js
  Call this from cron
  set channel ID to SLACK_CHANNEL of env file.
*/
import pkg from '@slack/bolt';
const { App } = pkg;
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN
});

function getStatus(): [string, number] {
  const stdout = execSync('node dist/hi-gregor.js status'); // TODO: needs better
  const data = JSON.parse(stdout.toString());
  return [data['phase'], Number(data['battery'])];
}

const label = (phase: string) => {
  switch(phase) {
    case 'run': return '掃除してます!';
    case 'HmUsrDock': return 'ドックに戻りちゅうです!';
    case 'charge': return '充電中です。';
    case 'stop': return 'なぜか停止中です…?';
    case 'stuck': return '助けを求めています!!';
    default: return `${phase} (未定義)です`;
  }
};

const main = () => {
  const data = getStatus();
  if (data[0] == 'charge') return;
  if (data[0] != 'stop') {
    app.client.chat.postMessage({
      channel: String(process.env.SLACK_CHANNEL),
      text: `監視中: ザムザは${label(data[0])} (バッテリ残量${data[1]}%)`
    });
    return;
  }

  // stop: but seems charge error
  if (data[1] > 60) return;
  app.client.chat.postMessage({
    channel: String(process.env.SLACK_CHANNEL),
    text: `監視中: 充電されていない可能性! ザムザは${label(data[0])} (バッテリ残量${data[1]}%)`
  });
};

main();