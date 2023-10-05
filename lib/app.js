import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './config';
import { controlApi } from './api/control';
import { SourcesParser } from './core/sources-parser';
import { SourcesRouter } from './core/sources-router';
import { recordingApi } from './api/recording';
import { apiRecorder } from './api/recording/api-recorder';
import { websocketApi } from './api/websocket';

const { isLogEnabled } = config;

export class App {
  constructor(sources, serverConfig) {
    this.parser = new SourcesParser(sources);
    this.apiUrl = this.getApiUrl(serverConfig);
    this.origin = serverConfig?.origin || '*';
    this.app = express();

    console.log('******* CONFIG **********'.yellow);

    this.initMiddleware();
    this.initControlApi();
    this.initRecordingApi();
    this.initMocks();
  }

  initMiddleware() {
    this.app.use(cors({
      origin: function(origin, callback){
        // allow requests with no origin 
        // (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(this.origin.indexOf(origin) === -1){
          var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
          return callback(new Error(msg), false);
        }
        return callback(null, true);
      }
    }));
    this.app.use(bodyParser.text());
    this.app.use(bodyParser.json());
    this.app.use(apiRecorder(this.apiUrl));
    this.initLogger();
  }

  initMocks() {
    const router = new SourcesRouter(this.parser);
    router.registerSources(this.app, isLogEnabled);
  }

  /**
   *  Method to start logger of requests
   *    Actual format
   *      0.230 ms GET 200 /some/url/
   *    More option
   *      https://github.com/expressjs/morgan
   */
  initLogger() {
    if (isLogEnabled) {
      this.app.use(morgan(':response-time ms :method :status :url'));
    }
  }

  initControlApi() {
    this.app.use(this.apiUrl, controlApi(this.parser));
  }

  initRecordingApi() {
    this.app.use(this.apiUrl, recordingApi());
  }

  initWebSocketApi(wsServer) {
    this.app.use(this.apiUrl, websocketApi(wsServer));
  }

  getApiUrl({ controlApiUrl } = {}) {
    return controlApiUrl ? controlApiUrl : '/api/v1';
  }

  start(port, callback) {
    return this.app.listen(port, callback);
  }
}
