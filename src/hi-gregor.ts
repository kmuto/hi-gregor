/*
  Hi, Gregor
  Tiny controller for Roomba
  My family names 'Gregor Samsa' to our Roomba. (You know the famous novel by Franz Kafka)
  Copyright 2023 Kenshi Muto

  Usage: node dist/index.js [start|dock|status]
  Status: run | HmUsrDock | charge | stop | stuck
*/
import { exit } from 'process';
import { getRobotIP, Local } from 'roomba-sdk'
import { RoombaState } from 'roomba-sdk/dist/roomba-state';
import { LocalV2Return } from 'roomba-sdk/dist/v2/local';
import dgram from 'dgram';

const exportMessage = (msgs: Object) => {
  console.log(JSON.stringify(msgs));
};

// See https://www.npmjs.com/package/roomba-sdk?activeTab=readme#how-to-get-your-usernameblid-and-password
// and get IROBOT_BLID and IROBOT_PASS. IROBOT_IP is local IPv4 address of your Roomba
if (!process.env.IROBOT_BLID || !process.env.IROBOT_PASS || !process.env.IROBOT_IP) {
  exportMessage({ 'error': 'Environment values (IROBOT_BLID, IROBOT_PASS, IROBOT_IP) are undefined.' });
  exit(1);
}

const blid = process.env.IROBOT_BLID;
const pass = process.env.IROBOT_PASS;

type Status = { phase: string, battery: number };

function phaseAndBattery(actualState: RoombaState | Partial<RoombaState> | null) {
  if (actualState && actualState['cleanMissionStatus'] && actualState['batPct']) {
    return { phase: actualState['cleanMissionStatus']['phase'], battery: actualState['batPct'] as number };
  } else {
    return { phase: '', battery: -1 };
  }
}

const callRobot = (ip: string) => {
  const robot = Local(blid, pass, ip, 2) as LocalV2Return; // TODO: want timeout
  robot.on('connect', operate.bind(null, robot));
};

async function operate(robot: LocalV2Return) {
  robot.getRobotState(['batPct'])
    .then((actualState) => {
      const { phase, battery } = phaseAndBattery(actualState);

      switch(process.argv[2]) {
        case 'start':
          robot.start();
          exportMessage({ 'ok': 'start' });
          break;
        case 'dock':
          robot.pause();
          robot.dock();
          exportMessage({ 'ok': 'dock' });
          break;
        case 'status':
          exportMessage({ 'phase': phase, 'battery': battery });
          break;
        default:
          exportMessage({ 'error': 'unknown command'});
      }
    })
    .then(() => robot.end())
    .catch((err: Error) => {
      exportMessage({ 'error': `Something error: ${err}` });
      robot.end();
    });
}

// UDP discover. This code was copied from original getRobotIP, due to avoid unnecessary console output.
const udpServer = dgram.createSocket('udp4');

udpServer.on('error', () => { udpServer.close(); });

udpServer.on('message', (msg:any) => {
  try {
    const parsedMsg = JSON.parse(msg.toString());
    if (parsedMsg.hostname && parsedMsg.ip && ((parsedMsg.hostname.split('-')[0] === 'Roomba') || (parsedMsg.hostname.split('-')[0] === 'iRobot'))) {
      udpServer.close();
      callRobot(parsedMsg.ip);
    }
  } catch (err) { } // XXX: ignore SyntaxError: Unexpected token 'i', \"irobotmcs\" is not valid JSON
});

udpServer.bind(5678, () => {
  const message = 'irobotmcs';
  udpServer.setBroadcast(true);
  udpServer.send(message, 0, message.length, 5678, '255.255.255.255');
});