//appTitle: Git Clone with Isomorphic Git

import { useState, useEffect } from "react";

import FS from "https://esm.sh/@isomorphic-git/lightning-fs";
import MagicPortal from "magic-portal";

//import * as git from 'isomorphic-git';
//import http from "isomorphic-git/http/web";
//import FS from '@isomorphic-git/lightning-fs';
const fs = new FS("localRoot4");

const GitClient = ({ name, setDirFs }) => {
  const [cloneStatus, setCloneStatus] = useState("");
  const [files, setFiles] = useState([]);

  const [worker, setWorker] = useState(null);
  const [portal, setPortal] = useState(null);
  const [workerThread, setWorkerThread] = useState(null);
  const [repo, setRepo] = useState("");
  const [commits, setCommits] = useState([]);
  const [changes, setChanges] = useState([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [dirName, setDirName] = useState("");

  const puter = window.puter;

  useEffect(() => {
    const updateUser = async () => {
      const isSignedIn = puter.auth.isSignedIn();
      if (!isSignedIn) {
        await puter.auth.signIn();
      }
      const user = await puter.auth.getUser();
      setUsername(user.username);
      const helloFile = await puter.fs.write("hello.txt", "hello");
      console.log(helloFile.dirname);
      setDirName(helloFile.dirname);
    };
    updateUser();
  }, []);

  const addToChanges = (change) => {
    setChanges((prev) => [...prev, change]);
  };

  useEffect(() => {
    // Create a new web worker
    const myWorker = new Worker(
      new URL("../utils/gitWorker.js", import.meta.url)
    );

    const pp = new MagicPortal(myWorker);

    //myWorker.addEventListener("message", ({ data }) => console.log(data));

    const mainThread = {
      async print(message) {
        console.log(message);
      },
      async progress(evt) {
        console.log(evt);
        setLoadingMessage(evt.phase + " " + evt.loaded + "/" + evt.total);
      },
      async sendChange(change) {
        console.log(change);
        if (change.type !== "equal") {
          console.log("Adding", change.type);
          addToChanges(change);
        }
      },
      async fill(url) {
        let username = window.prompt("Username:");
        let password = window.prompt("Password:");
        return { username, password };
      },
      async rejected({ url, auth }) {
        window.alert("Authentication rejected");
        return;
      },
    };

    pp.set("mainThread", mainThread, {
      void: ["print", "progress", "rejected"],
    });

    setWorker(myWorker);
    setPortal(pp);

    console.log(pp);
  }, []);

  const getAllFiles = async () => {
    let files = await workerThread.listFiles({});
    const allFiles = []; //array of {dirname:"",filename:""}
    //extract filename from path
    for (let path of files) {
      const pathParts = path.split("/");
      const filename = pathParts[pathParts.length - 1];
      const dirname = pathParts.slice(0, pathParts.length - 1).join("/");
      allFiles.push({ dirname: dirname, filename: filename });
    }
    // make reduce the array to a array of {dirname:"uniques_dir",files:[filenames]}
    const filesByDir = allFiles.reduce((acc, file) => {
      if (!acc[file.dirname]) {
        acc[file.dirname] = [];
      }
      acc[file.dirname].push(file.filename);
      return acc;
    }, {});

    //change the filesByDir object to an array of {dirname:"",files:[filenames]}
    const filesByDirArray = Object.keys(filesByDir).map((key) => ({
      dirname: repo + "/" + key,
      files: filesByDir[key],
    }));

    return filesByDirArray;
  };

  useEffect(() => {
    if (!portal) return;
    const getWorkerThread = async () => {
      const wt = await portal.get("workerThread");
      setWorkerThread(wt);
    };
    getWorkerThread();
  }, [portal]);

  const progressView = (operationId, progress) => {
    setLoadingMessage("Uploading files to puter :" + progress + "%");
    //console.log(`Upload progress for operation ${operationId}: ${progress}%`);
  };

  const syncDirectory = async () => {
    console.time("syncDirectory");
    console.log("Syncing directory");
    setLoading(true);
    const fileMap = await getAllFiles();
    setLoadingMessage("Clearing dir :" + repo);
    await puter.fs.delete(repo, { recursive: true });
    setLoadingMessage("Creating Dir :" + repo);
    await puter.fs.mkdir(repo, { createMissingParents: true });
    const uploadPhases = fileMap.length;
    let thePhase = 0;
    for (const theDir of fileMap) {
      const theDirPath = theDir.dirname;
      const theFiles = theDir.files;
      const theFilesAsFile = [];
      for (const path of theFiles) {
        //console.log("Reading file", path);
        setLoadingMessage("Reading file", theDirPath + "/" + path);

        const data = await fs.promises.readFile(
          "/" + theDirPath + "/" + path,
          "utf8"
        );
        const blob = new Blob([data], { type: "text/plain" });
        const theNewFile = new File([blob], path);
        theFilesAsFile.push(theNewFile);
      }
      console.log("Uploading files to puter", theDir.dirname);
      console.log("Upload Phase:", thePhase, "/", uploadPhases);
      setLoadingMessage("Upload Phase:", thePhase, "/", uploadPhases);

      setLoadingMessage("Uploading files to puter :" + theDir.dirname);
      await puter.fs.mkdir(theDir.dirname, { createMissingParents: true });
      const allUploaded = await puter.fs.upload(
        theFilesAsFile,
        theDir.dirname,
        { progress: progressView }
      );

      if (!Array.isArray(allUploaded)) {
        if (!allUploaded.dirname) {
          console.log("Error for :");
          console.log(allUploaded);
        }
      } else {
        for (const ff of allUploaded) {
          if (!ff.dirname) {
            console.log("Error for :");
            console.log(ff);
          }
        }
      }

      console.timeEnd("Upload", "s");
      thePhase = thePhase + 1;
    }

    //console.log(fileMap);
    setLoading(false);
    console.timeEnd("syncDirectory", "s");

    return;
  };

  const doFullClone = async () => {
    console.log("Clone started");
    setLoading(true);
    if (!workerThread) {
      console.log("Worker thread not ready");
      return;
    }

    await workerThread.setDir("/" + repo);

    workerThread
      .clone({
        corsProxy: "https://cors.isomorphic-git.org",
        url: "https://github.com/" + repo,
        depth: 20,
      })
      .then(async () => {
        setDirFs("/" + repo);
        setLoadingMessage("Getting commits");
        let commits = await workerThread.log({});
        setCommits(commits);
        //$("log").textContent += "LOG:\n" + commits  .map((c) => `  ${c.oid.slice(0, 7)}: ${c.commit.message}`) .join("\n") + "\n";
        console.log(commits);
        setLoading(false);

        // Gérer la résolution de la promesse ici
      })
      .catch((error) => {
        // Gérer l'erreur ici
      });

    //let branches = await workerThread.listBranches({ remote: "origin" });
    //$("log").textContent += "BRANCHES:\n" + branches.map((b) => `  ${b}`).join("\n") + "\n";

    //console.log(branches);
  };

  useEffect(() => {
    console.log(files);
  }, [files]);

  const checkout = async (oid) => {
    await workerThread.checkout({ ref: oid });
  };

  const getMasterDif = (oid) => {
    console.log("oid", oid);
    const getDiffs = async () => {
      try {
        setChanges([]);
        await workerThread.getFileStateChanges(commits[0].oid, oid);
      } catch (error) {
        console.log(error);
      }
    };
    getDiffs();
  };

  return (
    <div className="w-full h-full dark:bg-dark bg-light dark:text-light text-dark overflow-y-scroll">
      {loading && (
        <span className="bg-gray-400 rounded p-2 m-2 w-full h-full absolute top-0 left-0 text-black flex justify-center items-center">
          {loadingMessage}
        </span>
      )}
      <div className="w-full h-full p-0 m-0">
        <div className="w-full flex flex-row justify-between items-center p-2 m-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doFullClone();
            }}
          >
            <input
              type="text"
              placeholder="Enter repo name"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="p-2 m-2 rounded text-black"
            />
          </form>
          <button
            className="bg-green-500 rounded hover:bg-green-700 transition-colors p-2 m-2"
            onClick={doFullClone}
          >
            Clone on Browser{" "}
          </button>
          <button
            className="bg-green-500 rounded hover:bg-green-700 transition-colors p-2 m-2"
            onClick={syncDirectory}
          >
            Sync to Puter{" "}
          </button>
        </div>
        <span>{dirName}</span>

        <div className="h-full w-full m-2 p-2 overflow-y-scroll flex">
          <div className="h-full w-full flex flex-col">
            <div className="w-full h-full ">
              <table className="h-full w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Message
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Commit ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 ">
                  {commits.map((commit) => (
                    <tr key={commit.oid}>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => checkout(commit.oid)}
                        >
                          Checkout
                        </button>
                        <button
                          className="ml-4 text-indigo-600 hover:text-indigo-900"
                          onClick={() => getMasterDif(commit.oid)}
                        >
                          Get Diffs
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commit.commit.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commit.oid.substring(0, 10) + "..."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w-full h-full">
              <table className="h-full w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Path
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 overflow-y-scroll">
                  {changes.map((change) => (
                    <tr key={change.path}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {change.path}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {change.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-indigo-600 hover:text-indigo-900 rounded bg-gray-200 p-2">
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitClient;
