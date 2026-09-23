import serverlessExpress from '@codegenie/serverless-express';
import { Handler } from 'aws-lambda';
import { createApp } from './create-app';
import { loadRuntimeSecrets } from './runtime-secrets';

async function initialize(): Promise<Handler> {
  await loadRuntimeSecrets();
  const app = await createApp();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

/** Reuses a ready application; a failed cold start can safely retry initialization. */
export function createLambdaHandler(factory: () => Promise<Handler> = initialize): Handler {
  let adapter: Promise<Handler> | undefined;
  return async (event, context, callback) => {
    adapter ??= factory().catch(error => { adapter = undefined; throw error; });
    return (await adapter)(event, context, callback);
  };
}
