import { MongoClient, Collection } from "mongodb";
import type { State } from "@/lib/config";

const STATE_ID = "otto:state";
const DB_NAME = process.env.MONGODB_DB ?? "otto";
const COLLECTION = "state";

type StateDoc = State & { _id: string };

// Cache the client across serverless invocations so we don't exhaust connections.
let _clientPromise: Promise<MongoClient> | null = null;
function clientPromise(): Promise<MongoClient> {
  if (!_clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    _clientPromise = new MongoClient(uri).connect();
  }
  return _clientPromise;
}

async function states(): Promise<Collection<StateDoc>> {
  const client = await clientPromise();
  return client.db(DB_NAME).collection<StateDoc>(COLLECTION);
}

export async function getState(): Promise<State | null> {
  const doc = await (await states()).findOne({ _id: STATE_ID });
  if (!doc) return null;
  const { _id, ...state } = doc;
  return state as State;
}

export async function setState(state: State): Promise<void> {
  // _id is pinned by the filter on upsert, so it must not appear in the replacement.
  await (await states()).replaceOne({ _id: STATE_ID }, { ...state }, { upsert: true });
}
