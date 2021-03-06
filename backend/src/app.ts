import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import 'reflect-metadata';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { router } from 'bull-board';
import { Worker } from 'bullmq';

import routes from './routes/index';
import errorHandlerMiddleware from './middlewares/errorHandlerMiddleware';
import BullQueueProvider from './providers/queue/implementations/BullQueueProvider';
import RequestSpotsProcessProcessor from './workers/RequestSpotsProcess/RequestSpotsProcessProcessor';
import ProcessSpotProcessor from './workers/ProcessSpot/ProcessSpotProcessor';
import InitalSpotProcessRequester from './workers/InitalSpotProcessRequester/InitalSpotProcessRequester';
import { QueueProvider } from './providers/queue/QueueProvider';
import './database';

dotenv.config();

class App {
  public express: express.Application;

  public queueProvider: QueueProvider;

  public spotsProcessRequester: Worker;

  public spotsProcessor: Worker;

  public initalSpotsProcessRequester: Worker;

  constructor() {
    this.express = express();
    this.queueProvider = new BullQueueProvider();
    this.initialization();
  }

  private initialization(): void {
    this.middlewares();
    this.routes();

    this.express.use(errorHandlerMiddleware);

    this.workers();
    this.queues();
    this.defineCron();
  }

  private middlewares(): void {
    this.express.use(express.json());
    this.express.use(cors());
    this.express.use('/admin/queues', router);
  }

  private defineCron(): void {
    cron.schedule('00 23 * * *', async () =>
      this.queueProvider.add({
        jobName: 'request spot process',
        queueName: 'spot-process-requester',
        opts: {
          removeOnComplete: false,
        },
      }),
    );
  }

  private queues(): void {
    this.queueProvider.register({ queueName: 'spot-process-requester' });
    this.queueProvider.register({ queueName: 'spot-processor' });
    this.queueProvider.register({
      queueName: 'initial-spot-process-requester',
    });
    this.queueProvider.setUI();
  }

  private workers(): void {
    this.spotsProcessRequester = new Worker(
      'spot-process-requester',
      RequestSpotsProcessProcessor,
      {
        concurrency: 10,
      },
    );
    this.spotsProcessor = new Worker('spot-processor', ProcessSpotProcessor, {
      concurrency: 10,
    });
    this.initalSpotsProcessRequester = new Worker(
      'initial-spot-process-requester',
      InitalSpotProcessRequester,
      { concurrency: 10 },
    );
  }

  private routes(): void {
    this.express.use(routes);
  }
}

const app = new App();
const application = app.express;
const { queueProvider } = app;

export { application, queueProvider };
