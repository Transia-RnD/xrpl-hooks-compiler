import fastify from 'fastify';
import { readFileSync, readdirSync } from "fs";
import fastifyCors from 'fastify-cors';
// @ts-ignore
import fastifyWebSocket from 'fastify-websocket';
import * as ws from 'ws';
import * as rpc from 'vscode-ws-jsonrpc';
import * as rpcServer from 'vscode-ws-jsonrpc/lib/server';
import { build_project, requestBodySchema as requestCBodySchema, RequestBody as RequestCBody } from './rust';

const server = fastify();

server.register(fastifyCors, {
  // put your options here
  origin: '*'
})
server.register(fastifyWebSocket);

// Compilation code
const llvmDir = process.cwd() + "/clang/wasi-sdk";
const tempDir = "/tmp";

export interface ResponseData {
  success: boolean;
  message: string;
  output: string;
  tasks: Task[];
}

export interface Task {
  name: string;
  file?: string;
  success?: boolean;
  console?: string;
  output?: string;
}

server.post('/api/build', async (req, reply) => {
  // Bail out early if not HTTP POST
  if (req.method !== 'POST') {
    return reply.code(405).send('405 Method Not Allowed');
  }
  const baseName = tempDir + '/build_' + Math.random().toString(36).slice(2);
  let body: RequestCBody | undefined;
  try {
    body = requestCBodySchema.parse(req.body);
  } catch (err) {
    console.log(err)
    return reply.code(400).send('400 Bad Request')
  }
  try {
    console.log('Building in ', baseName);
    const result = build_project(body, baseName);
    return reply.code(200).send(result);
  } catch (ex) {
    console.error(ex);
    return reply.code(500).send(`500 Internal server error: ${ex}`)
  }
  // return reply.code(200).send({ hello: 'world' });
});

server.get('/', async (req, reply) => {
  reply.code(200).send('ok')
})

function toSocket(webSocket: any): rpc.IWebSocket {
  return {
    send: content => webSocket.send(content),
    onMessage: cb => {
      // support both ws (EventEmitter) and browser-like websockets
      if (typeof webSocket.on === 'function') {
        webSocket.on('message', (data: any) => {
          // ws delivers raw data (Buffer/string), match expected cb signature
          cb(data);
        });
      } else {
        webSocket.onmessage = (event: any) => cb(event.data);
      }
    },
    onError: cb => {
      if (typeof webSocket.on === 'function') {
        webSocket.on('error', (err: any) => cb(err && err.message ? err.message : err));
      } else {
        webSocket.onerror = (event: any) => {
          if ('message' in event) {
            cb((event as any).message)
          }
        };
      }
    },
    onClose: cb => {
      if (typeof webSocket.on === 'function') {
        webSocket.on('close', (code: number, reason: any) => {
          const reasonStr = reason && typeof reason.toString === 'function' ? reason.toString() : String(reason);
          cb(code, reasonStr);
        });
      } else {
        webSocket.onclose = (event: any) => cb(event.code, event.reason);
      }
    },
    dispose: () => {
      try {
        if (typeof webSocket.close === 'function') webSocket.close();
      } catch (e) {}
    }
  }
}

server.get('/language-server/rust', { websocket: true } as any, (connection /* SocketStream */, req /* FastifyRequest */) => {
  let localConnection = rpcServer.createServerProcess(
    'Rust Analyzer process', 
    'rust-analyzer', 
    [
      '--log-file', '/tmp/rust-analyzer.log'
    ]
  );
  let socket: rpc.IWebSocket = toSocket(connection.socket);
  let newConnection = rpcServer.createWebSocketConnection(socket);
  rpcServer.forward(newConnection, localConnection);
  console.log(`Forwarding new Rust client`);
  
  socket.onClose((code, reason) => {
    console.log('Rust client closed', reason);
    try {
      localConnection.dispose();
    } catch (err) {
      console.log(err)
    }
  });
});

server.listen(process.env.PORT || 9000, process.env.HOST || '::', (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
});
