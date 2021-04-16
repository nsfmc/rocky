import React, { useContext } from "react";
import PouchDB from "pouchdb-browser";

const contextDbs: Map<string, PouchDB.Database> = new Map();
const PouchContext = React.createContext(contextDbs);

export function PouchProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  if (!contextDbs.has(name)) {
    let db = new PouchDB(name)
    contextDbs.set(name, db);
  }

  return (
    <PouchContext.Provider value={contextDbs}>
      {children}
    </PouchContext.Provider>
  ); 
}

export const usePouch = (name: string): PouchDB.Database => {
  const dbs = React.useContext(PouchContext)
  const contextDb = dbs.get(name);
  if (!contextDb) {
    throw new Error(`no db with name "${name}"`)
  }
  return contextDb;
}

enum Status {
  Pending = "pending",
  Success = "success",
  Error = "uh oh",
}

// interface Resource<T> = {
//   read: () => Promise<any> | T;
// };

export function readDbDoc(db: PouchDB.Database, docId: string) {
  let status = Status.Pending;
  let result: PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;

  const suspense = db
    .get(docId)
    .then((doc) => {
      result = doc;
      status = Status.Success;
    })
    .catch((err) => {
      result = err;
      status = Status.Error;
    });

  return {
    read() {
      switch (status) {
        case Status.Success:
          return result;
        case Status.Error:
          throw result;
        case Status.Pending:
          throw suspense;
      }
    },
  };
}

// type CouchDoc<T> = PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & T;
export interface Resource<T> {
  read: () => T;
}

export function readDefaultValue<T>(
  db: PouchDB.Database,
  docId: string,
  state: T
): Resource<T> {
  let result: T;
  let status = Status.Pending;
  let suspense: any;

  try {
    suspense = db.get<T>(docId).then(
      (doc) => {
        status = Status.Success;
        result = doc;
        console.log({ status, result });
      },
      (err) => {
        console.warn("pouch error: ", err);
        result = err;
        status = Status.Error;
        if (err.status === 404) {
          return db
            .put<T>({ _id: docId, ...state })
            .then((res) => {
              result = state;
              status = Status.Success;
            });
        } else {
          console.error("unknown error", err);
        }
      }
    );  
  } catch (err) {
    status = Status.Error;
    result = err
  }

  return {
    read() {
      // console.log(`read: status(${status}) result`, result);
      switch (status) {
        case Status.Pending:
          throw suspense;
        case Status.Error:
          throw result;
        case Status.Success:
          return result;
      }
    },
  };
}
