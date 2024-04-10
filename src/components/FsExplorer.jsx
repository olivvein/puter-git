import React, { useState, useEffect } from "react";
import * as Space from "react-spaces";
import * as Diff from "diff";

import FS from "@isomorphic-git/lightning-fs";
import {
  FolderOpenIcon,
  DocumentTextIcon,
  ArrowNarrowRightIcon,
  ArrowNarrowLeftIcon,
} from "@heroicons/react/outline";

import MarkDownView from "./MarkDownView";

import { Editor, DiffEditor } from "@monaco-editor/react";
import GitClient from "./GitClient";

const TheEditorJs2 = ({ jsCode, fileName, handleEditorChange }) => {
  let language =
    fileName.indexOf(".tsx") != -1
      ? "typescript"
      : fileName.indexOf(".jsx") != -1
      ? "javascript"
      : "javascript";

  if (fileName.indexOf(".html") != -1) {
    language = "html";
  }
  if (fileName.indexOf(".css") != -1) {
    language = "css";
  }
  if (fileName.indexOf(".json") != -1) {
    language = "json";
  }
  if (fileName.indexOf(".md") != -1) {
    language = "markdown";
  }

  console.log(language);

  return (
    <Editor
      height="99%"
      defaultLanguage={language}
      defaultValue={jsCode}
      path={fileName}
      theme={"vs-dark"}
      onChange={handleEditorChange}
      options={{
        minimap: {
          enabled: true,
        },
        cursorStyle: "block",
      }}
    />
  );
};

const FsExplorer = ({ name }) => {
  const [fs, setFs] = useState(new FS("localRoot4"));
  const [dir, setDir] = useState("/");
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState({ name: "", content: "" });
  const [file2, setFile2] = useState({ name: "", content: "" });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Chargement...");
  const [gitDif, setGitDiff] = useState("");

  useEffect(() => {
    readDir(dir);
  }, [fs, dir]);

  const applyDiff = (file, emoji) => {
    //const patches = dmp.patch_fromText(diffText);
    //const results = dmp.patch_apply(patches, originalText);
    //console.log(results[0])
    //console.log(results)
    //console.log(patches)
    //setDiffText(results[0]);`
    console.log("Apply Patch");
    console.log(file);
    console.log(emoji);
    const patcheText = Diff.parsePatch(gitDif);
    console.log(patcheText);
    //const reversePatch = Diff.reversePatch(patcheText);
    const patchedFile = Diff.applyPatch(file, gitDif);

    console.log("Patched File");

    console.log(patchedFile);
    if (patchedFile != file && patchedFile) {
      console.log("Patch applied");
      console.log(patchedFile);
      setFile2({ name: file.name, content: patchedFile });
    } else {
      console.log("Patch not applied");
    }

    //console.log(reversePatch);

    //const restoredFile = Diff.applyPatch(patchedFile, reversePatch);
    //console.log(restoredFile);

    //if (restoredFile == file) {
    //console.log("It Works !!");
    //}

    //setFile2({ name: file.name, content: patchedFile });
  };

  const getDiff = (fileIn, fileOut) => {
    console.log("fileName : ", file.name);
    console.log("fileName2 : ", file2.name);
    const patch = Diff.createTwoFilesPatch(
      file.name,
      file2.name,
      fileIn,
      fileOut
    );
    console.log(patch);
    const stringPatch = Diff.parsePatch(patch);
    console.log(stringPatch);

    const reversePatch = Diff.reversePatch(stringPatch);
    const restoredFile = Diff.applyPatch(fileOut, reversePatch);
    console.log("Modified File");
    console.log(fileOut);

    console.log("Restored File")
    console.log(restoredFile);
    console.log("with:");
    console.log(reversePatch);
    return patch;
  };

  const saveFile = () => {
    if (file.name == "") {
      return;
    }
    setLoading(true);
    setLoadingMessage("Saving...");
    const path = file.name.replace("//", "/");
    console.log(path);

    //make file content a string of a Uint8Array
    const content = new TextEncoder().encode(file.content);

    fs.writeFile(file.name, content, (error) => {
      if (error) {
        console.error(error);
        setLoading(false);
      } else {
        console.log("File saved");
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    //ctrl + s to safe file
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveFile();
      }
    });

    return () => {
      document.removeEventListener("keydown", () => {});
    };
  }, [file]);

  const readDir = (dir) => {
    setLoading(true);
    setLoadingMessage("Loading...");
    fs.readdir(dir, (error, data) => {
      if (error) {
        console.error(error);
      } else {
        const filesInfo = [];
        for (const file of data) {
          
          fs.stat(dir + "/" + file, (error, stat) => {
            if (error) {
              console.error(error);
            } else {
              filesInfo.push({ name: file, ...stat });
            }
          });
        }
        setFiles(filesInfo);
        setLoading(false);
      }
    });
  };

  const navigateTo = (path) => {
    setDir(path);
  };

  const navigateBack = () => {
    let parts = dir.split("/");
    parts.pop();
    let newPath = parts.join("/");
    setDir(newPath);
  };

  const readFile = (path) => {
    fs.readFile(path, "utf8", (error, data) => {
      if (error) {
        console.error(error);
      } else {
        setFile({ name: path.replace("//", "/"), content: data });
        setFile2({ name: path.replace("//", "/"), content: data });
      }
    });
  };

  

  const emojiPatch = `Index: /olivvein/wmo-emoji/package.json
===================================================================
--- /olivvein/wmo-emoji/package.json
+++ /olivvein/wmo-emoji/package.json
@@ -2,8 +2,9 @@
   "name": "wmo-emoji",
   "version": "1.0.1",
   "description": "convert wmo weather code to emoji",
   "main": "index.js",
+  "main": "index.jss",
   "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "",
`;

  const handleEditorChange = (value, event) => {
    setFile2({ ...file, content: value });
    console.log(value);
    console.log(file.name);
    const diff = getDiff(file.content, value);
    console.log(diff);
  };

  return (
    <div className="w-full h-full bg-gray-600  dark:text-light text-dark flex flex-col items-center justify-center">
      {loading && (
        <div className="z-50 absolute top-0 left-0 w-full h-full bg-gray-800/30 backdrop-blur-xl flex items-center justify-between p-4 ">
          {loadingMessage}
        </div>
      )}
      <Space.ViewPort className="mt-0">
        <Space.Fill trackSize={true}>
        <Space.LeftResizable
            size={`30%`} //Sige of the left resizable : Chat View
            touchHandleSize={20}
            trackSize={true}
            scrollable={true}
          >
            <Space.Fill trackSize={true}>
              <GitClient name="Git Client" setDirFs={setDir} />

            </Space.Fill>
          </Space.LeftResizable>

          <Space.Fill
            size={`40%`} //Sige of the left resizable : Chat View
            touchHandleSize={20}
            trackSize={true}
            scrollable={true}
          >
            <Space.Fill trackSize={true}>
              <div className="flex w-full min-w-fit h-full flex-col bg-gray-600 ">
                <span className="text-2xl p-4">{dir.replace("//", "/")}</span>
                <div className="flex items-center p-4">
                  <button
                    onClick={() => navigateTo("/")}
                    className="flex items-center space-x-2"
                  >
                    <ArrowNarrowRightIcon className="h-5 w-5 text-blue-400" />
                    <span>Racine</span>
                  </button>
                  {dir !== "/" && (
                    <button
                      onClick={navigateBack}
                      className="flex items-center space-x-2 ml-4"
                    >
                      <ArrowNarrowLeftIcon className="h-5 w-5 text-blue-400" />
                      <span>Retour</span>
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-0 flex flex-col justify-start h-full overflow-y-scroll">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 h-full hover:bg-gray-500 my-0 cursor-pointer "
                    >
                      {file.type === "dir" ? (
                        <span
                          onClick={() => navigateTo(dir + "/" + file.name)}
                          className="h-full flex items-center space-x-2 w-full "
                        >
                          <FolderOpenIcon className="h-5 w-5 text-blue-400" />
                          <span>{file.name}</span>
                        </span>
                      ) : (
                        <span
                          className="h-full flex w-full"
                          onClick={() => readFile(dir + "/" + file.name)}
                        >
                          <DocumentTextIcon className="h-5 w-5 text-blue-400" />
                          <span>{file.name}</span>
                        </span>
                      )}
                    </div>
                  ))}
                  
                </div>
                <textarea   
                    value={gitDif}
                    placeholder="Enter git diff here"
                    className="flex max-w-1/3 m-2 h-20 p-2 dark:bg-light bg-dark dark:text-dark text-light"
                    onChange={(e) => {setGitDiff(e.target.value)}}

                ></textarea>
                <button
                    className="p-2 bg-green-500 rounded hover:bg-green-700 transition-colors"
                    onClick={() => {
                      applyDiff(file.content, emojiPatch);
                    }}
                  >
                    Apply patch
                  </button>
                
              </div>
            </Space.Fill>
          </Space.Fill>

          <Space.RightResizable
            size={`33%`} //size of Editor
            touchHandleSize={20}
            trackSize={false}
            scrollable={true}
          >
            <Space.Fill trackSize={true} className="m-0 h-full">
              <div className="w-full h-full m-0">
                {file.name != "" &&
                  (file.name.indexOf(".md") != -1 ? (
                    <MarkDownView
                      content={file.content}
                      className="dark:bg-dark bg-light dark:text-light text-dark h-full w-full overflow-y-scroll"
                    />
                  ) : (
                    <div className="dark:bg-dark bg-light dark:text-light text-dark h-full w-full filter-shadow shadow-xl drop-shadow-xl z-40">
                      <TheEditorJs2
                        jsCode={file.content}
                        fileName={file.name}
                        handleEditorChange={handleEditorChange}
                      />
                    </div>
                  ))}
              </div>
            </Space.Fill>
          </Space.RightResizable>
          
        </Space.Fill>
      </Space.ViewPort>
    </div>
  );
};

export default FsExplorer;
