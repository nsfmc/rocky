import React, { SyntheticEvent, Suspense } from "react";
import produce, { applyPatches } from "immer";
import short from "short-uuid";
import PouchDB from "pouchdb-browser";

import * as UsePouch from "./usePouch";

import "./App.css";

type Categories = { [key: string]: any }[];
type V0CategoryData = { categories: Categories };
type V1CategoryData = {
  categories: Categories;
  schemaVersion: 1;
  _rev?: string;
};
type CategoryData = V1CategoryData;

interface Migration<T, U> {
  canMigrate: (data: any) => data is T;
  hasMigrated: (data: any) => data is U;
  migration: (data: T) => U;
}

let v1Migration: Migration<V0CategoryData, V1CategoryData> = {
  canMigrate(data: any): data is V0CategoryData {
    return data.categories != null && data.schemaVersion == null;
  },
  hasMigrated(data: any): data is V1CategoryData {
    return data.schemaVersion === 1;
  },
  migration(data: V0CategoryData): V1CategoryData {
    return { ...data, schemaVersion: 1 };
  },
};

function migrate<T, U>(
  from: T,
  canMigrate: (t: T) => boolean,
  migration: (t: T) => U
): U {
  return migration(from);
}

const fakeData: CategoryData = {
  categories: [
    {
      _id: "xxxxx",
      name: "AP Flour",
      description: "all purpose flour",
      tags: [],
      "shelf life, weeks": 52,
      perishable: false,
      staple: true,
    },
  ],
  schemaVersion: 1,
};

let db = new PouchDB("proto-pantry");

let categoryData: UsePouch.Resource<CategoryData>;
categoryData = UsePouch.readDefaultValue(db, "categories", fakeData);

function App() {
  return <Suspense fallback={<div>db is loading</div>}>
    <AppShell />
  </Suspense>
}

function AppShell() {
  const resourceData  = categoryData.read();
  const [data, setData] = React.useState(resourceData);
  console.log('usestate success', data.categories)
  const persist = React.useCallback(async (newData) => {
    console.log("persisting db");
    if (db && db.put) {
      const oldVersion = await db.get("categories");
      
      console.log({oldVersion})
      console.log({
        ...oldVersion,
        categories: newData.categories,
      })
      try {
        const nextDoc = await db.put({
          ...oldVersion,
          categories: newData.categories,
        });
        console.log(`updated doc with version ${nextDoc.rev}`);
      } catch (err) {
        console.error(err);
        console.error("failed to update the document :(");
      }
    }
  }, [db]);

  const [shouldPersist, setShouldPersist] = React.useState(false);
  React.useEffect(() => {
    if (shouldPersist) {
      persist(data);
      setShouldPersist(false);
    }
  }, [shouldPersist, data]);

  const handleSave = React.useCallback(() => {
    setShouldPersist(true);
  }, []);

  return (
    <>
      <Table data={data} setData={setData} triggerSave={setShouldPersist} />
    </>
  );
}

function DBLoader({
  dataResource,
  refreshLocalData,
}: {
  dataResource: UsePouch.Resource<CategoryData>;
  refreshLocalData: any;
}) {
  let data = dataResource.read();
  // data && refreshLocalData(data.categories)
  return <div>data items: {data.categories.length}</div>;
}

function Table({
  // resource,
  data,
  setData,
  triggerSave,
}: {
  // resource: UsePouch.Resource<CategoryData>;
  setData: React.Dispatch<React.SetStateAction<CategoryData>>;
  data: CategoryData;
  triggerSave: any;
}) {
  React.useEffect(() => {
    console.log("somebody updated the database");
  }, [data._rev]);

  const [schema, setSchema] = React.useState({
    mapping: {
      _id: { kind: "string", hidden: true },
      name: { kind: "string", hidden: false },
      description: { kind: "string", hidden: false },
      tags: { kind: "tag", hidden: false },
      "shelf life, weeks": { kind: "number", hidden: false },
      perishable: { kind: "boolean", hidden: false },
      staple: { kind: "boolean", hidden: false },
    },
    meta: {},
  });

  const visibleColumns = React.useMemo(() => {
    return Object.entries(schema.mapping)
      .filter(([key, value]) => {
        return value.hidden === false;
      })
      .map(([key, value]) => key);
  }, [schema]);

  const handleChange = (value: any, columnName: string, rowId: string) => {
    setData(
      produce(data, (draftData) => {
        const row = data.categories.findIndex((d) => d._id === rowId);
        if (row > -1) {
          draftData.categories[row][columnName] = value;
        }
      })
    );
  };
  const addRow = () => {
    const id = short().new();
    const proto: { [key: string]: any } = Object.fromEntries(
      Object.entries(schema.mapping).map(([key, value]) => [
        key,
        key === "_id"
          ? id
          : value.kind === "string"
          ? ""
          : value.kind === "number"
          ? 0
          : undefined,
      ])
    );
    setData(
      produce(data, (draftData) => {
        draftData.categories.push(proto);
      })
    );
  };
  const deleteRow = (rowId: string) => {
    const row = data.categories.findIndex((d) => d._id === rowId);
    setData(
      produce(data, (draftData: any[]) => {
        draftData.splice(row, 1);
      })
    );
  };
  return (
    <div>
      <table>
        <thead>
          <tr>
            {visibleColumns.map((name) => {
              return <td key={name}>{name}</td>;
            })}
          </tr>
        </thead>
        <tbody>
          {data.categories.map((d) => {
            return (
              <tr key={d._id}>
                {visibleColumns.map((name) => (
                  <td key={name}>
                    <input
                      type="text"
                      value={d[name]}
                      onBlur={triggerSave}
                      onChange={(evt) =>
                        handleChange(evt.currentTarget.value, name, d._id)
                      }
                    />
                  </td>
                ))}
                <td>
                  <button onClick={() => deleteRow(d._id)}>X</button>
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={visibleColumns.length}>
              <button onClick={addRow}>add new row</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default App;
